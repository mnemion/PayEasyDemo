const request = require('supertest');
const app = require('../app');
const paymentService = require('../services/paymentService');

// 서비스 모듈 모킹
jest.mock('../services/paymentService');

describe('Payment Routes Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /payments', () => {
    it('should create a payment request', async () => {
      // 모킹 설정
      paymentService.createPaymentRequest.mockResolvedValue({
        amount: 10000,
        orderId: 'test_order_id',
        orderName: '테스트 상품',
        successUrl: '/payments/success',
        failUrl: '/payments/fail',
        clientKey: 'test_client_key'
      });

      const response = await request(app)
        .post('/payments')
        .send({
          amount: 10000,
          orderName: '테스트 상품',
          customerEmail: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('orderId', 'test_order_id');
      expect(response.body).toHaveProperty('amount', 10000);
      expect(paymentService.createPaymentRequest).toHaveBeenCalledWith(
        10000,
        null,
        '테스트 상품',
        'test@example.com'
      );
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .post('/payments')
        .send({
          amount: 'invalid',
          orderName: '테스트 상품'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle service errors', async () => {
      // 모킹 설정
      paymentService.createPaymentRequest.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/payments')
        .send({
          amount: 10000,
          orderName: '테스트 상품'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /payments/success', () => {
    it('should handle payment success and redirect', async () => {
      // 모킹 설정
      paymentService.approvePayment.mockResolvedValue({
        paymentKey: 'test_payment_key',
        orderId: 'test_order_id',
        status: 'DONE'
      });

      const response = await request(app)
        .get('/payments/success')
        .query({
          paymentKey: 'test_payment_key',
          orderId: 'test_order_id',
          amount: 10000
        });

      expect(response.status).toBe(302); // 리다이렉트 상태 코드
      expect(response.header.location).toBe('/payments/test_order_id/result');
      expect(paymentService.approvePayment).toHaveBeenCalledWith(
        'test_payment_key',
        'test_order_id',
        10000
      );
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .get('/payments/success')
        .query({
          paymentKey: 'test_payment_key'
          // orderId와 amount 누락
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /payments/cancel', () => {
    it('should cancel a payment', async () => {
      // 모킹 설정
      paymentService.getPaymentByPaymentKey.mockResolvedValue({
        id: 'test_order_id',
        payment_key: 'test_payment_key',
        status: 'succeeded'
      });

      paymentService.cancelPayment.mockResolvedValue({
        orderId: 'test_order_id',
        status: 'canceled'
      });

      const response = await request(app)
        .post('/payments/cancel')
        .send({
          paymentKey: 'test_payment_key',
          reason: '테스트 취소'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'canceled');
      expect(paymentService.cancelPayment).toHaveBeenCalledWith(
        'test_payment_key',
        '테스트 취소'
      );
    });

    it('should return 400 for missing payment key', async () => {
      const response = await request(app)
        .post('/payments/cancel')
        .send({
          reason: '테스트 취소'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent payment', async () => {
      // 모킹 설정
      paymentService.getPaymentByPaymentKey.mockResolvedValue(null);

      const response = await request(app)
        .post('/payments/cancel')
        .send({
          paymentKey: 'non_existent_key',
          reason: '테스트 취소'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  // 추가 테스트 케이스들...
});