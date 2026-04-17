import { query } from '../../models/mysql/connection.js';

// 创建评价
export async function createReview(req, res, next) {
  try {
    const { target_uuid, target_type, application_uuid, rating, tags, content, is_anonymous } = req.body;

    if (!target_uuid || !target_type || !rating) {
      return res.status(400).json({ code: 400, message: '参数不完整' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ code: 400, message: '评分范围为1-5' });
    }

    const [target] = await query('SELECT id FROM users WHERE uuid = ?', [target_uuid]);
    if (!target) return res.status(404).json({ code: 404, message: '被评价用户不存在' });

    let applicationId = null;
    if (application_uuid) {
      const [app] = await query('SELECT id FROM applications WHERE uuid = ?', [application_uuid]);
      applicationId = app?.id;
    }

    await query(
      `INSERT INTO reviews (reviewer_id, target_id, target_type, application_id, rating, tags, content, is_anonymous)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, target.id, target_type, applicationId, rating, JSON.stringify(tags || []), content, is_anonymous ? 1 : 0]
    );

    // 更新信用分
    const [avgResult] = await query(
      'SELECT AVG(rating) as avg_rating FROM reviews WHERE target_id = ? AND status = "approved"',
      [target.id]
    );
    if (avgResult.avg_rating) {
      const newScore = Math.round(300 + (avgResult.avg_rating / 5) * 550);
      await query('UPDATE users SET credit_score = ? WHERE id = ?', [newScore, target.id]);
    }

    res.status(201).json({ code: 0, message: '评价提交成功' });
  } catch (err) { next(err); }
}

// 获取某用户的评价列表
export async function getTargetReviews(req, res, next) {
  try {
    const { type, uuid } = req.params;
    const { page = 1, size = 20 } = req.query;

    const [target] = await query('SELECT id FROM users WHERE uuid = ?', [uuid]);
    if (!target) return res.status(404).json({ code: 404, message: '用户不存在' });

    const offset = (parseInt(page) - 1) * parseInt(size);
    const list = await query(
      `SELECT r.rating, r.tags, r.content, r.is_anonymous, r.created_at,
              CASE WHEN r.is_anonymous = 1 THEN '匿名用户' ELSE u.phone END as reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.target_id = ? AND r.target_type = ? AND r.status = 'approved'
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [target.id, type, parseInt(size), offset]
    );

    const [stats] = await query(
      `SELECT COUNT(*) as total, AVG(rating) as avg_rating,
              SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as star5,
              SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as star4,
              SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as star3,
              SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as star2,
              SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as star1
       FROM reviews WHERE target_id = ? AND target_type = ? AND status = 'approved'`,
      [target.id, type]
    );

    res.json({ code: 0, data: { list, stats } });
  } catch (err) { next(err); }
}
