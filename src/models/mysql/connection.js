import mysql from 'mysql2/promise';
import config from '../config/index.js';

let pool = null;

export function createPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: config.mysql.pool.max,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

export function getPool() {
  if (!pool) {
    createPool();
  }
  return pool;
}

export async function query(sql, params = []) {
  const conn = getPool();
  const [rows] = await conn.execute(sql, params);
  return rows;
}

export async function transaction(callback) {
  const conn = getPool();
  const connection = await conn.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
