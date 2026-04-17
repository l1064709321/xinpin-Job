import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../../models/mysql/connection.js';
import config from '../../config/index.js';
import { logger } from '../../utils/logger.js';

// 发送短信验证码
export async function sendSmsCode(req, res, next) {
  try {
    const { phone } = req.body;
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ code: 400, message: '手机号格式不正确' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));

    // TODO: 调用短信服务商 API 发送验证码
    // await smsService.send(phone, code);

    // 开发环境直接返回验证码
    logger.info(`[DEV] 验证码: ${phone} -> ${code}`);

    // 存储验证码到 Redis（5分钟有效）
    // await redis.set(`sms:${phone}`, code, 'EX', 300);

    res.json({
      code: 0,
      message: '验证码已发送',
      ...(config.env !== 'production' && { dev_code: code }),
    });
  } catch (err) {
    next(err);
  }
}

// 短信验证码登录/注册
export async function smsLogin(req, res, next) {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ code: 400, message: '手机号和验证码不能为空' });
    }

    // TODO: 验证短信验证码
    // const savedCode = await redis.get(`sms:${phone}`);
    // if (savedCode !== code) { return res.status(400).json({ code: 400, message: '验证码错误或已过期' }); }

    // 查找或创建用户
    let [user] = await query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) {
      const uuid = uuidv4();
      const passwordHash = await bcrypt.hash(uuidv4(), 10);
      const result = await query(
        'INSERT INTO users (uuid, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [uuid, phone, passwordHash, 'worker', 'active']
      );
      user = { id: result.insertId, uuid, role: 'worker', status: 'active' };
    }

    if (user.status === 'frozen') {
      return res.status(403).json({ code: 403, message: '账号已被冻结，请联系客服' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          uuid: user.uuid,
          phone,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// 密码注册
export async function register(req, res, next) {
  try {
    const { phone, password, role = 'worker' } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ code: 400, message: '手机号和密码不能为空' });
    }
    if (password.length < 6) {
      return res.status(400).json({ code: 400, message: '密码至少6位' });
    }

    const [existing] = await query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing) {
      return res.status(409).json({ code: 409, message: '该手机号已注册' });
    }

    const uuid = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (uuid, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [uuid, phone, passwordHash, role, 'active']
    );

    const token = generateToken({ id: result.insertId, uuid, role });
    const refreshToken = generateRefreshToken({ id: result.insertId, uuid, role });

    res.status(201).json({
      code: 0,
      message: '注册成功',
      data: { token, refreshToken, user: { id: result.insertId, uuid, phone, role } },
    });
  } catch (err) {
    next(err);
  }
}

// 密码登录
export async function login(req, res, next) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ code: 400, message: '手机号和密码不能为空' });
    }

    const [user] = await query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) {
      return res.status(401).json({ code: 401, message: '手机号或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ code: 401, message: '手机号或密码错误' });
    }

    if (user.status === 'frozen') {
      return res.status(403).json({ code: 403, message: '账号已被冻结' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        refreshToken,
        user: { id: user.id, uuid: user.uuid, phone: user.phone, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
}

// 刷新 Token
export async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ code: 400, message: 'refreshToken 不能为空' });
    }

    const payload = jwt.verify(token, config.jwt.secret);
    const newToken = generateToken({ id: payload.id, uuid: payload.uuid, role: payload.role });

    res.json({ code: 0, data: { token: newToken } });
  } catch (err) {
    next(err);
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, uuid: user.uuid, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, uuid: user.uuid, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}
