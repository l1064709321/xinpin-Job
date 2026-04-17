import { v4 as uuidv4 } from 'uuid';
import { query } from '../../models/mysql/connection.js';

// 岗位列表（公开，带分页筛选）
export async function listJobs(req, res, next) {
  try {
    const { page = 1, size = 20, city, industry, category, salary_min, salary_max, sort } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(size);
    const limit = Math.min(100, Math.max(1, parseInt(size)));

    const conditions = ['j.status = "active"'];
    const params = [];

    if (city) { conditions.push('j.city = ?'); params.push(city); }
    if (industry) { conditions.push('j.industry = ?'); params.push(industry); }
    if (category) { conditions.push('j.category = ?'); params.push(category); }
    if (salary_min) { conditions.push('j.salary_max >= ?'); params.push(parseInt(salary_min)); }
    if (salary_max) { conditions.push('j.salary_min <= ?'); params.push(parseInt(salary_max)); }

    let orderBy = 'j.is_urgent DESC, j.published_at DESC';
    if (sort === 'salary_desc') orderBy = 'j.salary_max DESC';
    if (sort === 'salary_asc') orderBy = 'j.salary_min ASC';

    const where = conditions.join(' AND ');

    const [totalResult] = await query(`SELECT COUNT(*) as total FROM jobs j WHERE ${where}`, params);
    const jobs = await query(
      `SELECT j.uuid, j.title, j.category, j.industry, j.salary_type, j.salary_min, j.salary_max,
              j.province, j.city, j.district, j.headcount, j.hired_count, j.is_urgent,
              j.view_count, j.apply_count, j.welfare, j.published_at, j.expired_at,
              c.name as company_name, c.short_name as company_short, c.logo_url, c.verified as company_verified
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      code: 0,
      data: {
        list: jobs,
        pagination: { page: parseInt(page), size: limit, total: totalResult.total },
      },
    });
  } catch (err) {
    next(err);
  }
}

// 岗位搜索（关键词）
export async function searchJobs(req, res, next) {
  try {
    const { q, page = 1, size = 20 } = req.query;
    if (!q) {
      return res.status(400).json({ code: 400, message: '搜索关键词不能为空' });
    }

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(size);
    const limit = Math.min(100, Math.max(1, parseInt(size)));
    const keyword = `%${q}%`;

    const [totalResult] = await query(
      'SELECT COUNT(*) as total FROM jobs WHERE status = "active" AND (title LIKE ? OR description LIKE ?)',
      [keyword, keyword]
    );
    const jobs = await query(
      `SELECT j.uuid, j.title, j.category, j.industry, j.salary_type, j.salary_min, j.salary_max,
              j.city, j.is_urgent, j.published_at, j.apply_count,
              c.name as company_name, c.logo_url, c.verified as company_verified
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE j.status = "active" AND (j.title LIKE ? OR j.description LIKE ?)
       ORDER BY j.is_urgent DESC, j.published_at DESC
       LIMIT ? OFFSET ?`,
      [keyword, keyword, limit, offset]
    );

    res.json({
      code: 0,
      data: {
        list: jobs,
        pagination: { page: parseInt(page), size: limit, total: totalResult.total },
      },
    });
  } catch (err) {
    next(err);
  }
}

// 获取岗位详情
export async function getJob(req, res, next) {
  try {
    const { uuid } = req.params;
    const [job] = await query(
      `SELECT j.*, c.name as company_name, c.short_name, c.logo_url, c.verified as company_verified,
              c.scale as company_scale, c.description as company_desc, c.industry as company_industry
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE j.uuid = ?`,
      [uuid]
    );

    if (!job) {
      return res.status(404).json({ code: 404, message: '岗位不存在' });
    }

    // 增加浏览量
    await query('UPDATE jobs SET view_count = view_count + 1 WHERE id = ?', [job.id]);

    // 获取岗位要求的技能
    const skills = await query(
      `SELECT s.name, js.required FROM job_skills js JOIN skills s ON s.id = js.skill_id WHERE js.job_id = ?`,
      [job.id]
    );

    res.json({ code: 0, data: { ...job, skills } });
  } catch (err) {
    next(err);
  }
}

// 创建岗位
export async function createJob(req, res, next) {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({ code: 403, message: '仅企业用户可发布岗位' });
    }

    const body = req.body;
    const [company] = await query('SELECT id FROM companies WHERE owner_user_id = ?', [req.user.id]);
    if (!company) {
      return res.status(400).json({ code: 400, message: '请先创建企业信息' });
    }

    const uuid = uuidv4();
    const result = await query(
      `INSERT INTO jobs (uuid, company_id, publisher_id, title, category, industry, description,
        requirements, salary_type, salary_min, salary_max, province, city, district, address,
        headcount, education_req, experience_req, age_min, age_max, welfare, contact_name,
        contact_phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid, company.id, req.user.id, body.title, body.category, body.industry,
       body.description, body.requirements, body.salary_type || 'monthly',
       body.salary_min, body.salary_max, body.province, body.city, body.district, body.address,
       body.headcount || 1, body.education_req || 'none', body.experience_req,
       body.age_min, body.age_max, JSON.stringify(body.welfare || []),
       body.contact_name, body.contact_phone, 'draft']
    );

    res.status(201).json({ code: 0, message: '岗位创建成功', data: { id: result.insertId, uuid } });
  } catch (err) {
    next(err);
  }
}

// 更新岗位
export async function updateJob(req, res, next) {
  try {
    const { uuid } = req.params;
    const [job] = await query('SELECT id, publisher_id FROM jobs WHERE uuid = ?', [uuid]);
    if (!job) return res.status(404).json({ code: 404, message: '岗位不存在' });
    if (job.publisher_id !== req.user.id) return res.status(403).json({ code: 403, message: '无权修改' });

    const body = req.body;
    const fields = ['title', 'category', 'industry', 'description', 'requirements',
      'salary_type', 'salary_min', 'salary_max', 'province', 'city', 'district', 'address',
      'headcount', 'education_req', 'experience_req', 'age_min', 'age_max', 'welfare',
      'contact_name', 'contact_phone'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(f === 'welfare' ? JSON.stringify(body[f]) : body[f]);
      }
    }
    if (updates.length > 0) {
      await query(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`, [...values, job.id]);
    }

    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    next(err);
  }
}

// 更新岗位状态（发布/关闭/暂停）
export async function updateJobStatus(req, res, next) {
  try {
    const { uuid } = req.params;
    const { status } = req.body;
    const validTransitions = {
      draft: ['pending', 'active'],
      pending: ['active', 'draft'],
      active: ['paused', 'closed'],
      paused: ['active', 'closed'],
    };

    const [job] = await query('SELECT id, publisher_id, status as cur_status FROM jobs WHERE uuid = ?', [uuid]);
    if (!job) return res.status(404).json({ code: 404, message: '岗位不存在' });
    if (job.publisher_id !== req.user.id) return res.status(403).json({ code: 403, message: '无权操作' });

    const allowed = validTransitions[job.cur_status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ code: 400, message: `不允许从 ${job.cur_status} 变更为 ${status}` });
    }

    const extra = status === 'active' ? ', published_at = NOW(), expired_at = DATE_ADD(NOW(), INTERVAL 30 DAY)' : '';
    await query(`UPDATE jobs SET status = ? ${extra} WHERE id = ?`, [status, job.id]);

    res.json({ code: 0, message: '状态更新成功' });
  } catch (err) {
    next(err);
  }
}

// 我发布的岗位
export async function myJobs(req, res, next) {
  try {
    const jobs = await query(
      `SELECT j.uuid, j.title, j.status, j.salary_min, j.salary_max, j.apply_count,
              j.view_count, j.published_at, j.created_at
       FROM jobs j WHERE j.publisher_id = ? ORDER BY j.created_at DESC`,
      [req.user.id]
    );
    res.json({ code: 0, data: jobs });
  } catch (err) {
    next(err);
  }
}
