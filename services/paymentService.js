const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { createPayment, updatePaymentStatus, updatePaymentKey, getAllPayments, getPaymentById, getPaymentByKey } = require('../models/Payment');
const logger = require('../utils/logger');

// Toss Payments API 기본 설정
const TOSS_API_URL = 'https://api.tosspayments.com/v1';
const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;
const clientKey = process.env.TOSS_PAYMENTS_CLIENT_KEY;
const successUrl = process.env.TOSS_PAYMENTS_SUCCESS_URL;
const failUrl = process.env.TOSS_PAYMENTS_FAIL_URL;

// Base64 인코딩된 인증 헤더 생성
const basicAuthHeader = Buffer.from(`${secretKey}:`).toString('base64');

/**
 * 결제 요청 생성
 */
async function createPaymentRequest(amount, orderId = null, orderName = '상품 구매', customerEmail = null) {
  try {
    // 주문 ID가 없으면 생성
    if (!orderId) {
      orderId = `order_${uuidv4().replace(/-/g, '')}`;
    }

    // 결제 정보를 데이터베이스에 저장
    await createPayment({
      id: orderId,
      amount,
      currency: 'KRW',
      status: 'ready',
      description: orderName,
      payment_method: null,
      customer_email: customerEmail,
      payment_key: null
    });

    // 결제 페이지 URL 생성에 필요한 정보 반환
    const paymentData = {
      amount,
      orderId,
      orderName,
      successUrl,
      failUrl,
      clientKey
    };

    logger.info(`결제 요청 생성됨: ${orderId}`);
    return paymentData;
  } catch (error) {
    logger.error(`결제 요청 생성 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 결제 승인 처리
 */
async function approvePayment(paymentKey, orderId, amount) {
  try {
    // Check parameters
    if (!paymentKey || !orderId || !amount) {
      const missingParams = [];
      if (!paymentKey) missingParams.push('paymentKey');
      if (!orderId) missingParams.push('orderId');
      if (!amount) missingParams.push('amount');
      
      logger.error(`Missing required parameters: ${missingParams.join(', ')}`);
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }
    
    // Check if secretKey is defined
    if (!secretKey) {
      logger.error('TOSS_PAYMENTS_SECRET_KEY environment variable is not set!');
      throw new Error('Missing Toss Payments secret key configuration.');
    }
    
    logger.info(`Attempting to approve payment for orderId: ${orderId} with paymentKey: ${paymentKey}`);

    try {
      // V2 표준 결제용 공통 API URL (테스트와 실제 모두 동일)
      const apiUrl = 'https://api.tosspayments.com/v1/payments/confirm';
      
      logger.info(`Using API URL: ${apiUrl}`);
      
      // 중복 결제 방지를 위한 Idempotency-Key 생성
      const idempotencyKey = `${orderId}_${new Date().toISOString()}`;
      
      const response = await axios({
        method: 'post',
        url: apiUrl,
        headers: {
          Authorization: `Basic ${basicAuthHeader}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        data: {
          paymentKey,
          orderId,
          amount
        }
      });

      const paymentInfo = response.data;
      
      // 결제 정보 업데이트
      try {
        // Payment 테이블에 해당 orderId가 있는지 확인
        const existingPayment = await getPaymentById(orderId);
        
        if (existingPayment) {
          await updatePaymentKey(orderId, paymentKey);
          logger.info(`결제 정보 업데이트됨: ${orderId}, 결제키: ${paymentKey}`);
        } else {
          // 테이블에 해당 주문이 없으면 새로 생성
          logger.info(`결제 정보가 없어 새로 생성합니다: ${orderId}`);
          await createPayment({
            id: orderId,
            amount: amount,
            currency: 'KRW',
            status: 'succeeded',
            description: paymentInfo.orderName || '결제 완료',
            payment_method: paymentInfo.method || null,
            customer_email: paymentInfo.customerEmail || null,
            payment_key: paymentKey
          });
        }
      } catch (dbError) {
        logger.error(`결제 정보 저장 오류: ${dbError.message}. 결제는 승인되었으나 DB 업데이트에 실패했습니다.`);
        // DB 오류는 결제 승인에 영향을 주지 않으므로 무시하고 진행
      }
      
      logger.info(`결제 승인됨: ${orderId}, 결제키: ${paymentKey}`);
      return paymentInfo;
    } catch (apiError) {
      logger.error(`결제 승인 API 호출 오류: ${apiError.message}`);
      if (apiError.response) {
        logger.error(`API 응답 상태: ${apiError.response.status}`);
        logger.error(`API 응답 데이터: ${JSON.stringify(apiError.response.data)}`);
      }
      throw apiError;
    }
  } catch (error) {
    logger.error(`결제 승인 오류: ${error.message}`);
    
    // 실패 상태로 업데이트
    try {
      await updatePaymentStatus(orderId, 'failed');
    } catch (updateError) {
      logger.error(`Failed to update payment status: ${updateError.message}`);
    }
    
    throw error;
  }
}

/**
 * 모든 결제 내역 조회
 */
async function getPaymentHistory() {
  try {
    const payments = await getAllPayments();
    logger.info(`${payments.length}개의 결제 내역 조회됨`);
    return payments;
  } catch (error) {
    logger.error(`결제 내역 조회 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 결제 ID로 결제 정보 조회
 */
async function getPayment(paymentId) {
  try {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      logger.warn(`결제 ID를 찾을 수 없음: ${paymentId}`);
      return null;
    }
    
    logger.info(`결제 정보 조회됨: ${paymentId}`);
    return payment;
  } catch (error) {
    logger.error(`결제 정보 조회 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 결제 키로 결제 정보 조회
 */
async function getPaymentByPaymentKey(paymentKey) {
  try {
    const payment = await getPaymentByKey(paymentKey);
    if (!payment) {
      logger.warn(`결제 키에 해당하는 결제를 찾을 수 없음: ${paymentKey}`);
      return null;
    }
    
    logger.info(`결제 정보 조회됨 (결제 키): ${paymentKey}`);
    return payment;
  } catch (error) {
    logger.error(`결제 정보 조회 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 결제 취소 처리
 */
async function cancelPayment(paymentKey, cancelReason = '사용자 요청') {
  try {
    // Check if payment key exists before proceeding
    if (!paymentKey) {
      throw new Error('Payment key is required');
    }
    
    logger.info(`Attempting to cancel payment with paymentKey: ${paymentKey}`);
    
    // 취소 API URL 경로에 paymentKey 포함 (올바른 형식)
    const apiUrl = `${TOSS_API_URL}/payments/${paymentKey}/cancel`;
    
    logger.info(`Using API URL: ${apiUrl}`);
    
    // 중복 취소 방지를 위한 Idempotency-Key 생성
    const idempotencyKey = `cancel_${paymentKey}_${new Date().toISOString()}`;
    
    const response = await axios({
      method: 'post',
      url: apiUrl,
      headers: {
        Authorization: `Basic ${basicAuthHeader}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      data: {
        cancelReason
      }
    });

    const paymentInfo = response.data;
    
    // 결제 상태 업데이트
    await updatePaymentStatus(paymentInfo.orderId, 'canceled');
    
    logger.info(`결제 취소됨: ${paymentInfo.orderId}, 결제키: ${paymentKey}`);
    return paymentInfo;
  } catch (error) {
    logger.error(`결제 취소 오류: ${error.message}`);
    
    // API 응답 오류 확인
    if (error.response) {
      logger.error(`취소 API 응답 상태: ${error.response.status}`);
      logger.error(`취소 API 응답 데이터: ${JSON.stringify(error.response.data)}`);
    }
    
    throw error;
  }
}

module.exports = {
  createPaymentRequest,
  approvePayment,
  getPaymentHistory,
  getPayment,
  getPaymentByPaymentKey,
  cancelPayment,
  updatePaymentStatus
};