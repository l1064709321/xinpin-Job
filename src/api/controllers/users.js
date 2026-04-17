import { query } from '../../models/mysql/connection.js';

// 获取当前用户档案
export async function getProfile(req, res, next) {
  try {
    const [user] = await query(
      'SELECT id, uuid, phone, role, status, real_name_verified, credit_score, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    let profile = null;
    if (user.role === 'worker') {
      [profile] = await query('SELECT * FROM worker_profiles WHERE user_id = ?', [req.user.id]);
    }

    res.json({ code: 0, data: { ...user, profile } });
  } catch (err) {
    next(err);
  }
}

// 更新档案
export async function updateProfile(req, res, next) {
  try {
    const { role } = req.user;
    const body = req.body;

    if (role === 'worker') {
      const fields = {};
      const allowed = ['gender', 'birth_year', 'education', 'province', 'city', 'district',
        'address', 'expected_salary_min', 'expected_salary_max', 'expected_industry',
        'expected_job_type', 'work_years', 'self_description', 'emergency_contact', 'emergency_phone'];
      for (const k of allowed) {
        if (body[k] !== undefined) fields[k] = body[k];
      }

      if (Object.keys(fields).length > 0) {
        const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
        const values = Object.values(fields);
        // 先检查是否存在
        const [existing] = await query('SELECT id FROM worker_profiles WHERE user_id = ?', [req.user.id]);
        if (existing) {
          await query(`UPDATE worker_profiles SET ${sets} WHERE user_id = ?`, [...values, req.user.id]);
        } else {
          const cols = ['user_id', ...Object.keys(fields)].join(', ');
          const placeholders = Array(values.length + 1).fill('?').join(', ');
          await query(`INSERT INTO worker_profiles (${cols}) VALUES (${placeholders})`, [req.user.id, ...values]);
        }
      }
    }

    // 更新 users 表的公共字段
    if (body.avatar_url) {
      await query('UPDATE users SET avatar_url = ? WHERE id = ?', [body.avatar_url, req.user.id]);
    }

    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    next(err);
  }
}

// 获取用户技能
export async function getSkills(req, res, next) {
  try {
    const skills = await query(
      `SELECT s.id, s.name, s.category, us.level, us.verified
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = ?`,
      [req.user.id]
    );
    res.json({ code: 0, data: skills });
  } catch (err) {
    next(err);
  }
}

// 更新用户技能
export async function updateSkills(req, res, next) {
  try {
    const { skills } = req.body; // [{ id, level }]
    if (!Array.isArray(skills)) {
      return res.status(400).json({ code: 400, message: 'skills 必须是数组' });
    }

    // 清除旧的，写入新的
    await query('DELETE FROM user_skills WHERE user_id = ?', [req.user.id]);
    for (const sk of skills) {
      await query(
        'INSERT INTO user_skills (user_id, skill_id, level) VALUES (?, ?, ?)',
        [req.user.id, sk.id, sk.level || 'beginner']
      );
    }

    res.json({ code: 0, message: '技能更新成功' });
  } catch (err) {
    next(err);
  }
}
