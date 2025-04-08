const winston = require('winston');
const path = require('path');

// 로그 포맷 정의
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

// 로거 생성
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        // 콘솔에 로그 출력
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),

        // 파일에 로그 저장 (production 환경에서만)
        ...(process.env.NODE_ENV === 'production' ? [
            new winston.transports.File({
                filename: path.join(__dirname, '../logs/error.log'),
                level: 'error'
            }),
            new winston.transports.File({
                filename: path.join(__dirname, '../logs/combined.log')
            })
        ] : [])
    ]
});

module.exports = logger;