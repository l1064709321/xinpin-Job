import { body, param, query as queryValidator, validationResult } from 'express-validator';

/**
 * 验证结果检查中间件
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      code: 400,
      message: '参数验证失败',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// --- 通用验证规则 ---

export const phone = body('phone')
  .matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确');

export const smsCode = body('code')
  .isLength({ min: 6, max: 6 }).withMessage('验证码为6位数字')
  .isNumeric().withMessage('验证码为6位数字');

export const password = body('password')
  .isLength({ min: 6, max: 32 }).withMessage('密码长度6-32位');

export const role = body('role')
  .optional()
  .isIn(['worker', 'employer']).withMessage('角色只能是 worker 或 employer');

export const uuid = param('uuid')
  .isUUID().withMessage('无效的ID格式');

export const pagination = [
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('页码必须为正整数'),
  queryValidator('size').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量1-100'),
];

export const jobCreate = [
  body('title').notEmpty().withMessage('岗位名称不能为空').isLength({ max: 128 }),
  body('description').notEmpty().withMessage('岗位描述不能为空'),
  body('salary_type').optional().isIn(['monthly', 'daily', 'hourly', 'piece', 'negotiable']),
  body('salary_min').optional().isInt({ min: 0 }),
  body('salary_max').optional().isInt({ min: 0 }),
  body('city').optional().isLength({ max: 32 }),
  body('headcount').optional().isInt({ min: 1 }),
];

export const companyCreate = [
  body('name').notEmpty().withMessage('企业名称不能为空').isLength({ max: 128 }),
  body('uscc').optional().isLength({ min: 18, max: 18 }).withMessage('统一社会信用代码为18位'),
  body('industry').optional().isLength({ max: 64 }),
];

export const reviewCreate = [
  body('target_uuid').isUUID().withMessage('被评价用户ID无效'),
  body('target_type').isIn(['worker', 'company']).withMessage('评价类型无效'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('评分范围1-5'),
  body('content').optional().isLength({ max: 500 }).withMessage('评价内容最多500字'),
];

export const messageSend = [
  body('content').notEmpty().withMessage('消息不能为空').isLength({ max: 5000 }),
];
