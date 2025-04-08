const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

/**
 * 결제 페이지 렌더링
 */
function renderPaymentPage(req, res) {
  res.render('index', { 
    title: 'PayEasyDemo',
    tossPaymentsClientKey: process.env.TOSS_PAYMENTS_CLIENT_KEY
  });
}

/**
 * 결제 요청 생성
 */
async function createPayment(req, res) {
  try {
    const { amount, orderName, customerEmail } = req.body;
    
    if (!amount || isNaN(parseInt(amount))) {
      return res.status(400).json({ error: '유효한 금액이 필요합니다' });
    }
    
    // 금액을 정수로 변환
    const amountInWon = parseInt(amount);
    
    const paymentData = await paymentService.createPaymentRequest(
      amountInWon,
      null,
      orderName || '테스트 결제',
      customerEmail
    );
    
    res.json(paymentData);
  } catch (error) {
    logger.error(`결제 생성 오류: ${error.message}`);
    res.status(500).json({ error: '결제 생성 중 오류가 발생했습니다', details: error.message });
  }
}

/**
 * 결제 성공 처리
 */
async function handlePaymentSuccess(req, res) {
  try {
    const { paymentKey, orderId, amount } = req.query;
    
    if (!paymentKey || !orderId || !amount) {
      const missingParams = [];
      if (!paymentKey) missingParams.push('paymentKey');
      if (!orderId) missingParams.push('orderId');
      if (!amount) missingParams.push('amount');
      
      logger.error(`결제 처리 필수 파라미터 누락: ${missingParams.join(', ')}`);
      
      return res.status(400).render('error', {
        message: '필수 파라미터가 누락되었습니다: ' + missingParams.join(', '),
        error: { status: 400, stack: '' }
      });
    }
    
    try {
      // 결제 승인 처리
      const paymentInfo = await paymentService.approvePayment(paymentKey, orderId, parseInt(amount));
      
      // 결제 결과 페이지로 리다이렉트
      res.redirect(`/payments/${orderId}/result`);
    } catch (apiError) {
      logger.error(`결제 승인 처리 실패: ${apiError.message}`);
      
      // 오류 응답 데이터가 있는 경우 상세 정보 로깅
      if (apiError.response && apiError.response.data) {
        logger.error(`Toss Payments API Error: ${JSON.stringify(apiError.response.data)}`);
      }
      
      res.status(500).render('error', {
        message: '결제 승인 처리 중 오류가 발생했습니다',
        error: { 
          status: apiError.response ? apiError.response.status : 500,
          stack: process.env.NODE_ENV === 'development' ? apiError.stack : '',
          details: apiError.response && apiError.response.data ? apiError.response.data : {}
        }
      });
    }
  } catch (error) {
    logger.error(`결제 성공 처리 오류: ${error.message}`);
    res.status(500).render('error', {
      message: '결제 처리 중 오류가 발생했습니다',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
  }
}

/**
 * 결제 실패 처리
 */
async function handlePaymentFail(req, res) {
  try {
    const { code, message, orderId } = req.query;
    
    logger.error(`결제 실패: ${code}, ${message}, 주문ID: ${orderId}`);
    
    // 결제 상태를 실패로 업데이트 (orderId가 있는 경우)
    if (orderId) {
      await paymentService.updatePaymentStatus(orderId, 'failed');
    }
    
    res.render('payment-fail', {
      title: '결제 실패',
      code,
      message,
      orderId
    });
  } catch (error) {
    logger.error(`결제 실패 처리 오류: ${error.message}`);
    res.status(500).render('error', {
      message: '결제 실패 처리 중 오류가 발생했습니다',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
  }
}

/**
 * 결제 결과 페이지 렌더링
 */
async function renderPaymentResult(req, res) {
  try {
    const { orderId } = req.params;
    const payment = await paymentService.getPayment(orderId);
    
    if (!payment) {
      return res.status(404).render('error', {
        message: '결제 정보를 찾을 수 없습니다',
        error: { status: 404, stack: '' }
      });
    }
    
    res.render('payment-result', {
      title: '결제 결과',
      payment
    });
  } catch (error) {
    logger.error(`결제 결과 렌더링 오류: ${error.message}`);
    res.status(500).render('error', {
      message: '결제 결과 조회 중 오류가 발생했습니다',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
  }
}

/**
 * 모든 결제 내역 조회
 */
async function getPaymentHistory(req, res) {
  try {
    const payments = await paymentService.getPaymentHistory();
    res.json(payments);
  } catch (error) {
    logger.error(`결제 내역 조회 오류: ${error.message}`);
    res.status(500).json({ error: '결제 내역 조회 중 오류가 발생했습니다', details: error.message });
  }
}

/**
 * 결제 취소
 */
async function cancelPayment(req, res) {
  try {
    const { paymentKey } = req.body;
    const cancelReason = req.body.reason || '사용자 요청';
    
    if (!paymentKey) {
      return res.status(400).json({ error: '결제 키가 필요합니다' });
    }
    
    // 결제 키로 결제 정보 조회
    const payment = await paymentService.getPaymentByPaymentKey(paymentKey);
    
    if (!payment) {
      return res.status(404).json({ error: '결제 정보를 찾을 수 없습니다' });
    }
    
    // 결제 취소 처리
    const cancelResult = await paymentService.cancelPayment(paymentKey, cancelReason);
    
    res.json({
      orderId: cancelResult.orderId,
      status: 'canceled',
      message: '결제가 성공적으로 취소되었습니다'
    });
  } catch (error) {
    logger.error(`결제 취소 오류: ${error.message}`);
    res.status(500).json({ error: '결제 취소 중 오류가 발생했습니다', details: error.message });
  }
}

/**
 * 결제 확인 API - 토스페이먼츠 위젯용
 */
async function confirmPayment(req, res) {
  try {
    const { paymentKey, orderId, amount } = req.body;
    
    if (!paymentKey || !orderId || !amount) {
      return res.status(400).json({ 
        code: 'INVALID_PARAMS', 
        message: '필수 파라미터가 누락되었습니다' 
      });
    }
    
    // 결제 승인 처리
    const paymentInfo = await paymentService.approvePayment(paymentKey, orderId, parseInt(amount));
    
    // 응답
    res.status(200).json(paymentInfo);
  } catch (error) {
    logger.error(`결제 확인 API 오류: ${error.message}`);
    
    // API 오류 응답
    if (error.response && error.response.data) {
      return res.status(error.response.status || 500).json(error.response.data);
    }
    
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: '결제 처리 중 오류가 발생했습니다',
      details: error.message
    });
  }
}

module.exports = {
  renderPaymentPage,
  createPayment,
  handlePaymentSuccess,
  handlePaymentFail,
  renderPaymentResult,
  getPaymentHistory,
  cancelPayment,
  confirmPayment
};

