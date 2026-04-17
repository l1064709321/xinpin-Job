import { v4 as uuidv4 } from 'uuid';
import { query } from '../../models/mysql/connection.js';

export async function listCompanies(req, res, next) {
  try {
    const { page = 1, size = 20, city, industry } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);
    const conditions = ['status = "active"', 'verified = 1'];
    const params = [];
    if (city) { conditions.push('city = ?'); params.push(city); }
    if (industry) { conditions.push('industry = ?'); params.push(industry); }

    const where = conditions.join(' AND ');
    const [total] = await query(`SELECT COUNT(*) as total FROM companies WHERE ${where}`, params);
    const list = await query(
      `SELECT uuid, name, short_name, industry, scale, city, logo_url, verified, credit_score, created_at
       FROM companies WHERE ${where} ORDER BY credit_score DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(size), offset]
    );

    res.json({ code: 0, data: { list, pagination: { page: parseInt(page), size: parseInt(size), total: total.total } } });
  } catch (err) { next(err); }
}

export async function getCompany(req, res, next) {
  try {
    const [company] = await query('SELECT * FROM companies WHERE uuid = ?', [req.params.uuid]);
    if (!company) return res.status(404).json({ code: 404, message: '企业不存在' });
    const jobs = await query(
      'SELECT uuid, title, salary_min, salary_max, city, status, published_at FROM jobs WHERE company_id = ? AND status = "active" ORDER BY published_at DESC LIMIT 10',
      [company.id]
    );
    res.json({ code: 0, data: { ...company, active_jobs: jobs } });
  } catch (err) { next(err); }
}

export async function createCompany(req, res, next) {
  try {
    if (req.user.role !== 'employer') return res.status(403).json({ code: 403, message: '仅企业用户' });
    const b = req.body;
    const uuid = uuidv4();
    await query(
      `INSERT INTO companies (uuid, owner_user_id, name, short_name, uscc, industry, scale, province, city, address, logo_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid, req.user.id, b.name, b.short_name, b.uscc, b.industry, b.scale, b.province, b.city, b.address, b.logo_url, b.description]
    );
    res.status(201).json({ code: 0, message: '企业创建成功', data: { uuid } });
  } catch (err) { next(err); }
}

export async function updateCompany(req, res, next) {
  try {
    const [company] = await query('SELECT id, owner_user_id FROM companies WHERE uuid = ?', [req.params.uuid]);
    if (!company) return res.status(404).json({ code: 404, message: '企业不存在' });
    if (company.owner_user_id !== req.user.id) return res.status(403).json({ code: 403, message: '无权修改' });
    const b = req.body;
    const fields = ['name', 'short_name', 'industry', 'scale', 'province', 'city', 'address', 'logo_url', 'description'];
    const updates = [], values = [];
    for (const f of fields) { if (b[f] !== undefined) { updates.push(`${f} = ?`); values.push(b[f]); } }
    if (updates.length) await query(`UPDATE companies SET ${updates.join(',')} WHERE id = ?`, [...values, company.id]);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) { next(err); }
}
