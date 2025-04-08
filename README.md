# 🔒 PayEasyDemo

> 간편하고 안전한 결제 시스템 데모 애플리케이션

PayEasyDemo는 Toss Payments API를 활용한 결제 게이트웨이(PG) 연동 데모 애플리케이션입니다. Node.js와 Express 기반으로, 결제 과정을 쉽게 구현하고 테스트할 수 있는 환경을 제공합니다.

![GitHub CI 상태](https://github.com/mnemion/PayEasyDemo/workflows/CI%20Pipeline/badge.svg)
![개발 상태](https://img.shields.io/badge/개발-완료-brightgreen)

## ✨ 주요 기능

- ✅ Toss Payments API 연동 결제 프로세스
- 📊 SQLite 기반 결제 내역 관리
- 🔄 다양한 결제 상태 처리 (성공/실패/취소)
- 🛒 직관적인 상품 선택 및 결제 인터페이스
- 📱 반응형 웹 디자인

## 🛠️ 기술 스택

- **백엔드**: Node.js, Express
- **프론트엔드**: HTML, CSS, JavaScript (EJS 템플릿)
- **데이터베이스**: SQLite
- **결제 API**: Toss Payments
- **CI/CD**: GitHub Actions

## 🚀 시작하기

### 요구사항

- Node.js 14.x 이상
- npm 또는 yarn
- Toss Payments 계정 (테스트 API 키)

### 설치 및 실행

```bash
# 1. 레포지토리 클론
git clone https://github.com/mnemion/PayEasyDemo.git
cd PayEasyDemo

# 2. 의존성 설치
npm install

# 3. 환경 설정
cp .env.example .env
# .env 파일에 Toss Payments API 키 입력

# 4. 애플리케이션 실행
npm start
```

기본적으로 http://localhost:3000 에서 접속 가능합니다.

### 개발 모드

```bash
npm run dev  # nodemon을 통한 자동 재시작
```

### 테스트

```bash
npm test  # Jest 기반 테스트 실행
```

## 📂 프로젝트 구조

```
PayEasyDemo/
├── .github/workflows/    # GitHub Actions CI 설정
├── bin/                  # 애플리케이션 시작 스크립트
├── controllers/          # 요청 처리 로직
├── models/               # 데이터 모델
├── public/               # 정적 파일 (CSS, JS, 이미지)
├── routes/               # 라우트 정의
├── services/             # 비즈니스 로직
├── utils/                # 유틸리티 함수
├── views/                # EJS 템플릿
├── app.js                # 애플리케이션 메인 파일
└── README.md             # 프로젝트 문서
```

## 📡 API 엔드포인트

### 결제 API

| 메소드 | 엔드포인트 | 설명 |
|--------|------------|------|
| POST | `/payments` | 새 결제 요청 생성 |
| GET | `/payments/success` | 결제 성공 처리 (리디렉션) |
| GET | `/payments/fail` | 결제 실패 처리 (리디렉션) |
| POST | `/payments/cancel` | 결제 취소 |
| GET | `/payments/history` | 모든 결제 내역 조회 |

#### 요청/응답 예시

```json
// POST /payments 요청
{
  "amount": 10000,
  "orderName": "기본 상품 구매",
  "customerEmail": "customer@example.com"
}

// 응답
{
  "amount": 10000,
  "orderId": "order_1234567890abcdef",
  "orderName": "기본 상품 구매",
  "successUrl": "/payments/success",
  "failUrl": "/payments/fail",
  "clientKey": "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq"
}
```

## 💳 테스트 카드 정보

Toss Payments 테스트 모드에서 사용 가능한 카드 정보:
- **카드번호**: `4000 0000 0000 0000`
- **만료일**: 미래의 아무 날짜 (예: 12/25)
- **비밀번호**: 아무 숫자 2자리
- **생년월일/사업자번호**: 아무 숫자 6자리

## 🔄 CI/CD

GitHub Actions 기반 CI/CD 파이프라인:
- 자동 의존성 설치
- 코드 린팅
- 테스트 실행

## 📜 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 연락처

문의사항이 있으시면 [game1761@naver.com](mailto:game1761@naver.com)으로 연락주세요.

## 📝 업데이트 기록

- **2025.04.03**: 프로젝트 초기 개발
- **2025.04.08**: 개발 완료
