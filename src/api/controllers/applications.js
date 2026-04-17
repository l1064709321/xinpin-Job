import { v4 as uuidv4 } from 'uuid';
import { query } from '../../models/mysql/connection.js';

// 投递简历
export async function apply(req, res, next) {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ code: 403, message: '仅求职者可投递' });
    const { job_uuid } = req.body;
    const [job] = await query('SELECT id, status, apply_count FROM jobs WHERE uuid = ?', [job_uuid]);
    if (!job) return res.status(404).json({ code: 404, message: '岗位不存在' });
    if (job.status !== 'active') return res.status(400).json({ code: 400, message: '该岗位暂不接受投递' });

    const [existing] = await query('SELECT id FROM applications WHERE job_id = ? AND worker_id = ?', [job.id, req.user.id]);
    if (existing) return res.status(409).json({ code: 409, message: '已投递过该岗位' });

    const uuid = uuidv4();
    await query('INSERT INTO applications (uuid, job_id, worker_id, status) VALUES (?, ?, ?, ?)',
      [uuid, job.id, req.user.id, 'submitted']);
    await query('UPDATE jobs SET apply_count = apply_count + 1 WHERE id = ?', [job.id]);

    res.status(201).json({ code: 0, message: '投递成功', data: { uuid } });
  } catch (err) { next(err); }
}

// 我的投递
export async function myApplications(req, res, next) {
  try {
    const { status } = req.query;
    const conditions = ['a.worker_id = ?'];
    const params = [req.user.id];
    if (status) { conditions.push('a.status = ?'); params.push(status); }

    const list = await query(
      `SELECT a.uuid, a.status, a.created_at, j.uuid as job_uuid, j.title, j.salary_min, j.salary_max,
              j.city, c.name as company_name, c.logo_url
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN companies c ON c.id = j.company_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.created_at DESC`,
      params
    );
    res.json({ code: 0, data: list });
  } catch (err) { next(err); }
}

// 收到的投递（企业端）
export async function receivedApplications(req, res, next) {
  try {
    if (req.user.role !== 'employer') return res.status(403).json({ code: 403, message: '仅企业用户' });
    const { job_uuid, status, page = 1, size = 20 } = req.query;

    const conditions = ['j.publisher_id = ?'];
    const params = [req.user.id];
    if (job_uuid) { conditions.push('j.uuid = ?'); params.push(job_uuid); }
    if (status) { conditions.push('a.status = ?'); params.push(status); }

    const list = await query(
      `SELECT a.uuid, a.status, a.created_at,
              u.uuid as worker_uuid, u.credit_score as worker_credit,
              wp.gender, wp.birth_year, wp.education, wp.city as worker_city, wp.work_years,
              j.uuid as job_uuid, j.title as job_title
       FROM applications a
       JOIN users u ON u.id = a.worker_id
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       JOIN jobs j ON j.id = a.job_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(size), (parseInt(page) - 1) * parseInt(size)]
    );
    res.json({ code: 0, data: list });
  } catch (err) { next(err); }
}

// 更新投递状态
export async function updateStatus(req, res, next) {
  try {
    const { uuid } = req.params;
    const { status, interview_time, interview_type, interview_address, reject_reason } = req.body;

    const [app] = await query(
      `SELECT a.id, a.status as cur, j.publisher_id
       FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.uuid = ?`,
      [uuid]
    );
    if (!app) return res.status(404).json({ code: 404, message: '投递记录不存在' });

    // 求职者只能取消
    if (req.user.role === 'worker' && status !== 'cancelled') {
      return res.status(403).json({ code: 403, message: '求职者只能取消投递' });
    }
    // 企业端只能操作自己的岗位
    if (req.user.role === 'employer' && app.publisher_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权操作' });
    }

    await query(
      'UPDATE applications SET status = ?, interview_time = ?, interview_type = ?, interview_address = ?, reject_reason = ? WHERE id = ?',
      [status, interview_time || null, interview_type || null, interview_address || null, reject_reason || null, app.id]
    );

    res.json({ code: 0, message: '状态更新成功' });
  } catch (err) { next(err); }
}
