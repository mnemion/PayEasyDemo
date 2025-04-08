const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const paymentService = require('../services/paymentService');
const { createPayment, updatePaymentStatus, getPaymentById } = require('../models/Payment');

// axios 모킹
jest.mock('axios');
// 데이터베이스 모델 모킹
jest.mock('../models/Payment');

describe('Payment Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentRequest', () => {
    it('should create a payment request successfully', async () => {
      // 모킹 설정
      createPayment.mockResolvedValue({
        id: 'order_test123',
        amount: 10000,
        currency: 'KRW',
        status: 'ready'
      });

      const result = await paymentService.createPaymentRequest(10000, 'order_test123', '테스트 상품', 'test@example.com');
      
      expect(result).toHaveProperty('orderId', 'order_test123');
      expect(result).toHaveProperty('amount', 10000);
      expect(result).toHaveProperty('orderName', '테스트 상품');
      expect(createPayment).toHaveBeenCalledTimes(1);
    });

    it('should generate orderId if not provided', async () => {
      // UUID 모킹
      jest.spyOn(uuidv4, 'v4').mockReturnValue('mocked-uuid');
      
      // 모킹 설정
      createPayment.mockResolvedValue({
        id: expect.stringContaining('order_'),
        amount: 10000,
        currency: 'KRW',
        status: 'ready'
      });

      const result = await paymentService.createPaymentRequest(10000);
      
      expect(result).toHaveProperty('orderId');
      expect(result.orderId).toContain('order_');
      expect(createPayment).toHaveBeenCalledTimes(1);
    });

    it('should handle errors properly', async () => {
      // 모킹 설정
      createPayment.mockRejectedValue(new Error('DB Error'));

      await expect(paymentService.createPaymentRequest(10000)).rejects.toThrow('DB Error');
    });
  });

  describe('approvePayment', () => {
    it('should approve payment successfully', async () => {
      // axios 응답 모킹
      axios.mockResolvedValue({
        data: {
          paymentKey: 'test_payment_key',
          orderId: 'order_test123',
          status: 'DONE',
          amount: 10000
        }
      });

      // 모델 함수 모킹
      updatePaymentStatus.mockResolvedValue({
        id: 'order_test123',
        status: 'succeeded'
      });

      const result = await paymentService.approvePayment('test_payment_key', 'order_test123', 10000);
      
      expect(result).toHaveProperty('paymentKey', 'test_payment_key');
      expect(result).toHaveProperty('orderId', 'order_test123');
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'post',
        url: expect.stringContaining('/payments/test_payment_key/confirm')
      }));
    });

    it('should handle approval errors', async () => {
      // axios 에러 모킹
      axios.mockRejectedValue({
        response: {
          data: {
            message: 'Payment approval failed'
          }
        }
      });

      // 모델 함수 모킹
      updatePaymentStatus.mockResolvedValue({});

      await expect(paymentService.approvePayment('test_payment_key', 'order_test123', 10000))
        .rejects.toMatchObject({
          response: {
            data: {
              message: 'Payment approval failed'
            }
          }
        });
        
      expect(updatePaymentStatus).toHaveBeenCalledWith('order_test123', 'failed');
    });
  });

  describe('getPayment', () => {
    it('should retrieve payment by id successfully', async () => {
      // 모킹 설정
      getPaymentById.mockResolvedValue({
        id: 'order_test123',
        amount: 10000,
        currency: 'KRW',
        status: 'succeeded'
      });

      const result = await paymentService.getPayment('order_test123');
      
      expect(result).toHaveProperty('id', 'order_test123');
      expect(result).toHaveProperty('status', 'succeeded');
      expect(getPaymentById).toHaveBeenCalledWith('order_test123');
    });

    it('should return null for non-existent payment', async () => {
      // 모킹 설정
      getPaymentById.mockResolvedValue(null);

      const result = await paymentService.getPayment('non_existent_id');
      
      expect(result).toBeNull();
    });
  });

  // 추가 테스트 케이스들...
});