import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import { logger } from './utils/logger.js';
import authRoutes from './api/routes/auth.js';
import userRoutes from './api/routes/users.js';
import jobRoutes from './api/routes/jobs.js';
import companyRoutes from './api/routes/companies.js';
import applicationRoutes from './api/routes/applications.js';
import matchRoutes from './api/routes/match.js';
import messageRoutes from './api/routes/messages.js';
import reviewRoutes from './api/routes/reviews.js';
import { authMiddleware } from './api/middleware/auth.js';
import { errorHandler } from './api/middleware/errorHandler.js';

const app = express();

// --- 全局中间件 ---
app.use(helmet());
app.use(cors({ origin: config.env === 'production' ? false : '*' }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: config.env === 'production' ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
});
app.use('/api/', limiter);

// 短信验证码限流更严格
const smsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { code: 429, message: '验证码发送过于频繁' },
});

// --- 健康检查 ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- 公开路由（无需认证）---
app.use('/api/v1/auth', smsLimiter, authRoutes);

// --- 受保护路由 ---
app.use('/api/v1/users', authMiddleware, userRoutes);
app.use('/api/v1/jobs', jobRoutes); // GET 公开, POST/PUT 需认证
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/applications', authMiddleware, applicationRoutes);
app.use('/api/v1/match', authMiddleware, matchRoutes);
app.use('/api/v1/messages', authMiddleware, messageRoutes);
app.use('/api/v1/reviews', authMiddleware, reviewRoutes);

// --- 错误处理 ---
app.use(errorHandler);

// --- 启动 ---
app.listen(config.port, () => {
  logger.info(`信聘后端服务启动: http://0.0.0.0:${config.port} [${config.env}]`);
});

export default app;
