const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

/**
 * 메인 페이지 (결제 페이지)
 */
router.get('/', paymentController.renderPaymentPage);

module.exports = router;