import { query } from '../../models/mysql/connection.js';

/**
 * 智能岗位推荐 - 为求职者推荐匹配的岗位
 * 匹配维度：技能、地理位置、薪资期望、行业
 */
export async function recommendJobs(req, res, next) {
  try {
    const userId = req.user.id;
    const { page = 1, size = 20 } = req.query;

    // 获取求职者档案
    const [profile] = await query('SELECT * FROM worker_profiles WHERE user_id = ?', [userId]);
    if (!profile) {
      return res.status(400).json({ code: 400, message: '请先完善个人档案' });
    }

    // 获取用户技能
    const userSkills = await query(
      'SELECT skill_id, level FROM user_skills WHERE user_id = ?', [userId]
    );
    const skillIds = userSkills.map(s => s.skill_id);

    // 构建匹配查询
    const conditions = ['j.status = "active"'];
    const params = [];

    // 地理位置优先
    if (profile.city) {
      conditions.push('(j.city = ? OR j.province = ?)');
      params.push(profile.city, profile.province);
    }

    // 薪资范围
    if (profile.expected_salary_min) {
      conditions.push('j.salary_max >= ?');
      params.push(profile.expected_salary_min);
    }

    const where = conditions.join(' AND ');
    const offset = (parseInt(page) - 1) * parseInt(size);

    let jobs;
    if (skillIds.length > 0) {
      // 有技能数据，按技能匹配度排序
      const skillPlaceholders = skillIds.map(() => '?').join(',');
      jobs = await query(
        `SELECT j.uuid, j.title, j.category, j.industry, j.salary_type, j.salary_min, j.salary_max,
                j.city, j.is_urgent, j.published_at, j.apply_count,
                c.name as company_name, c.logo_url, c.verified as company_verified,
                -- 匹配度评分
                (
                  CASE WHEN j.city = ? THEN 30 ELSE 0 END +     -- 同城 +30
                  CASE WHEN j.industry = ? THEN 20 ELSE 0 END +  -- 同行业 +20
                  IFNULL((
                    SELECT COUNT(*) * 10 FROM job_skills js
                    WHERE js.job_id = j.id AND js.skill_id IN (${skillPlaceholders})
                  ), 0) +                                          -- 技能匹配 +10/个
                  CASE WHEN j.salary_max >= ? THEN 10 ELSE 0 END  -- 薪资达标 +10
                ) as match_score
         FROM jobs j
         JOIN companies c ON c.id = j.company_id
         WHERE ${where}
         ORDER BY match_score DESC, j.is_urgent DESC, j.published_at DESC
         LIMIT ? OFFSET ?`,
        [profile.city || '', profile.expected_industry || '', ...skillIds,
         profile.expected_salary_min || 0, ...params, parseInt(size), offset]
      );
    } else {
      // 无技能数据，按基础条件排序
      jobs = await query(
        `SELECT j.uuid, j.title, j.category, j.industry, j.salary_type, j.salary_min, j.salary_max,
                j.city, j.is_urgent, j.published_at, j.apply_count,
                c.name as company_name, c.logo_url, c.verified as company_verified,
                CASE WHEN j.city = ? THEN 50 ELSE 0 END as match_score
         FROM jobs j
         JOIN companies c ON c.id = j.company_id
         WHERE ${where}
         ORDER BY match_score DESC, j.is_urgent DESC, j.published_at DESC
         LIMIT ? OFFSET ?`,
        [profile.city || '', ...params, parseInt(size), offset]
      );
    }

    res.json({ code: 0, data: jobs });
  } catch (err) { next(err); }
}

/**
 * 智能人才推荐 - 为企业推荐匹配的求职者
 */
export async function recommendWorkers(req, res, next) {
  try {
    if (req.user.role !== 'employer') return res.status(403).json({ code: 403, message: '仅企业用户' });

    const { job_uuid } = req.params;
    const { page = 1, size = 20 } = req.query;

    const [job] = await query(
      'SELECT id, city, industry, salary_min, salary_max FROM jobs WHERE uuid = ? AND publisher_id = ?',
      [job_uuid, req.user.id]
    );
    if (!job) return res.status(404).json({ code: 404, message: '岗位不存在' });

    // 获取岗位所需技能
    const jobSkills = await query('SELECT skill_id, required FROM job_skills WHERE job_id = ?', [job.id]);
    const skillIds = jobSkills.map(s => s.skill_id);

    const offset = (parseInt(page) - 1) * parseInt(size);

    let workers;
    if (skillIds.length > 0) {
      const skillPlaceholders = skillIds.map(() => '?').join(',');
      workers = await query(
        `SELECT u.uuid, u.credit_score, u.avatar_url,
                wp.gender, wp.birth_year, wp.education, wp.city, wp.expected_salary_min,
                wp.expected_salary_max, wp.work_years, wp.self_description,
                (
                  CASE WHEN wp.city = ? THEN 30 ELSE 0 END +
                  CASE WHEN wp.expected_industry = ? THEN 20 ELSE 0 END +
                  IFNULL((
                    SELECT COUNT(*) * 10 FROM user_skills us
                    WHERE us.user_id = u.id AND us.skill_id IN (${skillPlaceholders})
                  ), 0) +
                  CASE WHEN u.credit_score >= 600 THEN 10 ELSE 0 END
                ) as match_score
         FROM users u
         JOIN worker_profiles wp ON wp.user_id = u.id
         WHERE u.role = 'worker' AND u.status = 'active'
           AND (wp.city = ? OR wp.province IS NULL)
         ORDER BY match_score DESC, u.credit_score DESC
         LIMIT ? OFFSET ?`,
        [job.city || '', job.industry || '', ...skillIds, job.city || '', parseInt(size), offset]
      );
    } else {
      workers = await query(
        `SELECT u.uuid, u.credit_score, u.avatar_url,
                wp.gender, wp.birth_year, wp.education, wp.city, wp.work_years, wp.self_description
         FROM users u
         JOIN worker_profiles wp ON wp.user_id = u.id
         WHERE u.role = 'worker' AND u.status = 'active'
         ORDER BY u.credit_score DESC
         LIMIT ? OFFSET ?`,
        [parseInt(size), offset]
      );
    }

    res.json({ code: 0, data: workers });
  } catch (err) { next(err); }
}
