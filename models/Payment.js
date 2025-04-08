const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../sqlite.db'));

/**
 * 데이터베이스 초기화 함수
 */
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // payments 테이블 생성
    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        description TEXT,
        payment_method TEXT,
        customer_email TEXT,
        payment_key TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('테이블 생성 오류:', err);
        return reject(err);
      }
      console.log('데이터베이스가 초기화되었습니다');
      resolve();
    });
  });
}

/**
 * 결제 정보를 데이터베이스에 저장
 */
function createPayment(paymentData) {
  return new Promise((resolve, reject) => {
    const { id, amount, currency, status, description, payment_method, customer_email, payment_key } = paymentData;
    const now = Math.floor(Date.now() / 1000);
    
    db.run(
      `INSERT INTO payments (id, amount, currency, status, description, payment_method, customer_email, payment_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, amount, currency, status, description, payment_method, customer_email, payment_key, now, now],
      function(err) {
        if (err) {
          console.error('결제 저장 오류:', err);
          return reject(err);
        }
        resolve(paymentData);
      }
    );
  });
}

/**
 * 결제 상태 및 정보 업데이트
 */
function updatePayment(orderId, updateData) {
  return new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    
    // 업데이트할 필드와 값 구성
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updateData), now, orderId];
    
    db.run(
      `UPDATE payments SET ${fields}, updated_at = ? WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          console.error('결제 정보 업데이트 오류:', err);
          return reject(err);
        }
        
        if (this.changes === 0) {
          return reject(new Error('결제 ID를 찾을 수 없습니다'));
        }
        
        resolve({ id: orderId, ...updateData });
      }
    );
  });
}

/**
 * 결제 상태 업데이트
 */
function updatePaymentStatus(paymentId, newStatus) {
  return updatePayment(paymentId, { status: newStatus });
}

/**
 * 결제 키 업데이트
 */
function updatePaymentKey(paymentId, paymentKey) {
  return updatePayment(paymentId, { payment_key: paymentKey, status: 'succeeded' });
}

/**
 * 모든 결제 조회
 */
function getAllPayments() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM payments ORDER BY created_at DESC`, [], (err, rows) => {
      if (err) {
        console.error('결제 조회 오류:', err);
        return reject(err);
      }
      resolve(rows);
    });
  });
}

/**
 * 결제 ID로 결제 정보 조회
 */
function getPaymentById(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM payments WHERE id = ?`, [id], (err, row) => {
      if (err) {
        console.error('결제 조회 오류:', err);
        return reject(err);
      }
      resolve(row);
    });
  });
}

/**
 * 결제 키로 결제 정보 조회
 */
function getPaymentByKey(paymentKey) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM payments WHERE payment_key = ?`, [paymentKey], (err, row) => {
      if (err) {
        console.error('결제 조회 오류:', err);
        return reject(err);
      }
      resolve(row);
    });
  });
}

module.exports = {
  initializeDatabase,
  createPayment,
  updatePaymentStatus,
  updatePaymentKey,
  updatePayment,
  getAllPayments,
  getPaymentById,
  getPaymentByKey
};