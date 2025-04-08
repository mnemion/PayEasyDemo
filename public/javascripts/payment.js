/**
 * 결제 관련 클라이언트 사이드 스크립트
 */

// Stripe 인스턴스
let stripe;
let elements;
let card;
let paymentIntentId = null;
let selectedAmount = 0;
let selectedProductName = '';

// DOM 요소 선택
const paymentFormContainer = document.getElementById('payment-form-container');
const paymentForm = document.getElementById('payment-form');
const cardElement = document.getElementById('card-element');
const cardErrors = document.getElementById('card-errors');
const submitButton = document.getElementById('submit-button');
const spinner = document.getElementById('spinner');
const buttonText = document.getElementById('button-text');

/**
 * 페이지 로드시 초기화
 */
document.addEventListener('DOMContentLoaded', function() {
    // Stripe 초기화
    stripe = Stripe(STRIPE_PUBLIC_KEY);

    // 상품 선택 버튼 이벤트 리스너
    initProductSelection();

    // 커스텀 금액 버튼 이벤트 리스너
    initCustomAmount();

    // 결제 폼 이벤트 리스너
    initPaymentForm();
});

/**
 * 상품 선택 기능 초기화
 */
function initProductSelection() {
    document.querySelectorAll('.select-product-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productId = productCard.dataset.productId;
            const productPrice = parseInt(productCard.dataset.productPrice);
            const productName = productCard.querySelector('h3').textContent;

            selectedAmount = productPrice;
            selectedProductName = productName;

            updatePaymentForm(productName, productPrice);
        });
    });
}

/**
 * 커스텀 금액 기능 초기화
 */
function initCustomAmount() {
    const customAmountBtn = document.getElementById('custom-amount-btn');
    if (customAmountBtn) {
        customAmountBtn.addEventListener('click', function() {
            const amountInput = document.getElementById('custom-amount');
            const amount = parseInt(amountInput.value);

            if (isNaN(amount) || amount < 1000) {
                alert('1,000원 이상의 유효한 금액을 입력해주세요.');
                return;
            }

            selectedAmount = amount;
            selectedProductName = '커스텀 결제';

            updatePaymentForm('커스텀 결제', amount);
        });
    }
}

/**
 * 결제 폼 초기화
 */
function initPaymentForm() {
    if (paymentForm) {
        paymentForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            await handlePaymentSubmit();
        });
    }
}

/**
 * 결제 폼 업데이트 및 표시
 */
function updatePaymentForm(productName, amount) {
    document.getElementById('product-name').textContent = productName;
    document.getElementById('payment-amount').textContent = amount.toLocaleString();
    paymentFormContainer.classList.remove('hidden');

    // 이미 초기화된 카드 요소가 있다면 제거
    cardElement.innerHTML = '';

    // Stripe 요소 설정
    elements = stripe.elements();
    card = elements.create('card', {
        style: {
            base: {
                color: '#32325d',
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        }
    });

    card.mount('#card-element');

    // 카드 에러 처리
    card.on('change', function(event) {
        if (event.error) {
            cardErrors.textContent = event.error.message;
        } else {
            cardErrors.textContent = '';
        }
    });

    // 폼에 카드 요소 추가
    paymentForm.card = card;
}

/**
 * 결제 제출 처리
 */
async function handlePaymentSubmit() {
    // 버튼 상태 업데이트 (로딩 중)
    updateButtonState(true);

    try {
        // 1. 서버에 결제 의도 생성 요청
        const { clientSecret, paymentId } = await createPaymentIntent();
        paymentIntentId = paymentId;

        // 2. Stripe로 카드 결제 확인
        const result = await confirmCardPayment(clientSecret);

        if (result.error) {
            // 에러 처리
            cardErrors.textContent = result.error.message;
        } else {
            // 결제 성공 시 결과 페이지로 이동
            window.location.href = `/payments/${result.paymentIntent.id}/result`;
        }
    } catch (error) {
        console.error('결제 처리 오류:', error);
        cardErrors.textContent = error.message;
    } finally {
        // 버튼 상태 복원
        updateButtonState(false);
    }
}

/**
 * 서버에 결제 의도 생성 요청
 */
async function createPaymentIntent() {
    const response = await fetch('/payments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: selectedAmount,
            description: `${selectedProductName} 구매`
        })
    });

    if (!response.ok) {
        throw new Error('결제 요청 처리 중 오류가 발생했습니다.');
    }

    return await response.json();
}

/**
 * Stripe로 카드 결제 확인
 */
async function confirmCardPayment(clientSecret) {
    const cardholderName = document.getElementById('cardholder-name').value;
    const cardholderEmail = document.getElementById('cardholder-email').value;

    return await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
            card: paymentForm.card,
            billing_details: {
                name: cardholderName,
                email: cardholderEmail
            }
        }
    });
}

/**
 * 버튼 상태 업데이트
 */
function updateButtonState(isLoading) {
    submitButton.disabled = isLoading;
    if (isLoading) {
        spinner.classList.remove('hidden');
        buttonText.classList.add('hidden');
    } else {
        spinner.classList.add('hidden');
        buttonText.classList.remove('hidden');
    }
}