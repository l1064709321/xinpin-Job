import { logger } from '../../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  logger.error(`${req.method} ${req.url}`, {
    error: err.message,
    stack: err.stack,
    body: req.body,
  });

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      code: 400,
      message: '参数验证失败',
      errors: err.errors || err.message,
    });
  }

  // MySQL 唯一键冲突
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      code: 409,
      message: '数据已存在',
    });
  }

  // JSON 解析错误
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 400, message: '请求体格式错误' });
  }

  // 默认 500
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: config.env === 'production' ? '服务器内部错误' : err.message,
  });
}
