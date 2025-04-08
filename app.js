require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const paymentsRouter = require('./routes/payments');

const app = express();

// 뷰 엔진 설정
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 라우트 설정
app.use('/', indexRouter);
app.use('/payments', paymentsRouter);

// 404 오류 처리
app.use(function(req, res, next) {
  next(createError(404));
});

// 오류 처리
app.use(function(err, req, res, next) {
  // 로컬 변수 설정, 개발 환경에서만 오류 출력
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // 오류 페이지 렌더링
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;