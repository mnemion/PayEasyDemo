const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

/**
 * 결제 생성 (POST /payments)
 */
router.post('/', paymentController.createPayment);

/**
 * 결제 성공 처리 (GET /payments/success)
 */
router.get('/success', paymentController.handlePaymentSuccess);

/**
 * 결제 실패 처리 (GET /payments/fail)
 */
router.get('/fail', paymentController.handlePaymentFail);

/**
 * 결제 결과 페이지 (GET /payments/:orderId/result)
 */
router.get('/:orderId/result', paymentController.renderPaymentResult);

/**
 * 결제 취소 (POST /payments/cancel)
 */
router.post('/cancel', paymentController.cancelPayment);

/**
 * 모든 결제 내역 조회 (GET /payments/history)
 */
router.get('/history', paymentController.getPaymentHistory);

/**
 * 결제 관리자 페이지 (GET /payments/admin)
 */
router.get('/admin', (req, res) => {
  res.render('payment-admin', { title: '결제 관리자 페이지' });
});

/**
 * 결제 확인 API (POST /payments/confirm) - 토스페이먼츠 위젯용
 */
router.post('/confirm', paymentController.confirmPayment);

module.exports = router;