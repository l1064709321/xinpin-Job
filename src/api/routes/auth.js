import { Router } from 'express';
import * as authController from '../controllers/auth.js';

const router = Router();

// 发送短信验证码
router.post('/sms/send', authController.sendSmsCode);

// 手机号 + 验证码 注册/登录
router.post('/sms/login', authController.smsLogin);

// 密码注册
router.post('/register', authController.register);

// 密码登录
router.post('/login', authController.login);

// 刷新 Token
router.post('/refresh', authController.refreshToken);

export default router;
