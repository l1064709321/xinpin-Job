import jwt from 'jsonwebtoken';
import config from '../../config/index.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或Token已过期' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.id, uuid: payload.uuid, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, message: 'Token已过期，请重新登录' });
    }
    return res.status(401).json({ code: 401, message: '无效的Token' });
  }
}

export function roleGuard(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '无权执行此操作' });
    }
    next();
  };
}
