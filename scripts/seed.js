import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { createPool, query, closePool } from '../src/models/mysql/connection.js';

/**
 * 数据库种子脚本 - 插入初始数据
 * 用法: node scripts/seed.js
 */

async function seed() {
  console.log('🌱 开始插入种子数据...\n');

  createPool();

  try {
    // 1. 技能标签
    console.log('📌 插入技能标签...');
    const skills = [
      // 制造业
      { name: '电焊', category: '制造业' },
      { name: '数控机床', category: '制造业' },
      { name: '叉车操作', category: '制造业' },
      { name: '质检', category: '制造业' },
      { name: '装配', category: '制造业' },
      { name: '注塑', category: '制造业' },
      { name: '喷涂', category: '制造业' },
      // 建筑业
      { name: '钢筋工', category: '建筑业' },
      { name: '木工', category: '建筑业' },
      { name: '瓦工', category: '建筑业' },
      { name: '水电工', category: '建筑业' },
      { name: '油漆工', category: '建筑业' },
      { name: '塔吊操作', category: '建筑业' },
      // 服务业
      { name: '餐饮服务', category: '服务业' },
      { name: '快递配送', category: '服务业' },
      { name: '仓储管理', category: '服务业' },
      { name: '保洁', category: '服务业' },
      { name: '安保', category: '服务业' },
      { name: '驾驶', category: '服务业' },
      // 物流
      { name: '货车驾驶', category: '物流' },
      { name: '分拣', category: '物流' },
      { name: '装卸', category: '物流' },
      // 通用
      { name: '电脑操作', category: '通用' },
      { name: '普通话', category: '通用' },
      { name: '英语基础', category: '通用' },
    ];

    for (const sk of skills) {
      await query('INSERT IGNORE INTO skills (name, category) VALUES (?, ?)', [sk.name, sk.category]);
    }
    console.log(`  ✅ ${skills.length} 个技能标签\n`);

    // 2. 演示求职者
    console.log('👤 创建演示求职者...');
    const workerUuid = uuidv4();
    const workerHash = await bcrypt.hash('123456', 10);
    const workerResult = await query(
      'INSERT IGNORE INTO users (uuid, phone, password_hash, role, status, credit_score) VALUES (?, ?, ?, ?, ?, ?)',
      [workerUuid, '13800000001', workerHash, 'worker', 'active', 650]
    );

    if (workerResult.insertId) {
      await query(
        `INSERT INTO worker_profiles (user_id, gender, birth_year, education, province, city,
          expected_salary_min, expected_salary_max, expected_industry, work_years, self_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [workerResult.insertId, 'male', 1990, 'vocational', '广东', '深圳',
         6000, 10000, '制造业', 5, '有5年数控机床操作经验，持有电工证和焊工证']
      );

      // 添加技能
      const [skill1] = await query('SELECT id FROM skills WHERE name = ?', ['数控机床']);
      const [skill2] = await query('SELECT id FROM skills WHERE name = ?', ['电焊']);
      if (skill1) await query('INSERT IGNORE INTO user_skills (user_id, skill_id, level) VALUES (?, ?, ?)',
        [workerResult.insertId, skill1.id, 'advanced']);
      if (skill2) await query('INSERT IGNORE INTO user_skills (user_id, skill_id, level) VALUES (?, ?, ?)',
        [workerResult.insertId, skill2.id, 'intermediate']);

      console.log(`  ✅ 求职者: 13800000001 / 123456\n`);
    }

    // 3. 演示企业
    console.log('🏢 创建演示企业...');
    const employerUuid = uuidv4();
    const employerHash = await bcrypt.hash('123456', 10);
    const employerResult = await query(
      'INSERT IGNORE INTO users (uuid, phone, password_hash, role, status, credit_score) VALUES (?, ?, ?, ?, ?, ?)',
      [employerUuid, '13800000002', employerHash, 'employer', 'active', 700]
    );

    if (employerResult.insertId) {
      const companyUuid = uuidv4();
      const companyResult = await query(
        `INSERT IGNORE INTO companies (uuid, owner_user_id, name, short_name, uscc, industry, scale,
          province, city, address, description, verified, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [companyUuid, employerResult.insertId, '深圳智造精密科技有限公司', '智造精密',
         '91440300MA5EXAMPLE', '制造业', 'medium',
         '广东', '深圳', '深圳市龙华区工业园A区', '专注精密零部件加工制造15年', 1, 'active']
      );

      // 演示岗位
      const [company] = await query('SELECT id FROM companies WHERE uuid = ?', [companyUuid]);
      if (company) {
        const jobUuid = uuidv4();
        const jobResult = await query(
          `INSERT INTO jobs (uuid, company_id, publisher_id, title, category, industry, description,
            requirements, salary_type, salary_min, salary_max, province, city, district,
            headcount, education_req, experience_req, welfare, contact_name, contact_phone,
            status, published_at, expired_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
          [jobUuid, company.id, employerResult.insertId, '数控车床操作工', '制造业', '制造业',
           '负责数控车床的日常操作和维护，按照图纸要求加工精密零部件。',
           '1. 有数控车床操作经验2年以上\n2. 能独立看懂机械图纸\n3. 吃苦耐劳，服从安排\n4. 有相关证书优先',
           'monthly', 7000, 10000, '广东', '深圳', '龙华区',
           3, 'vocational', '2年以上',
           JSON.stringify(['五险一金', '包吃包住', '年终奖', '带薪年假']),
           '王主管', '13800000003', 'active']
        );

        // 岗位技能要求
        if (jobResult.insertId) {
          const [skill] = await query('SELECT id FROM skills WHERE name = ?', ['数控机床']);
          if (skill) {
            await query('INSERT IGNORE INTO job_skills (job_id, skill_id, required) VALUES (?, ?, ?)',
              [jobResult.insertId, skill.id, 1]);
          }
        }

        // 第二个岗位
        const jobUuid2 = uuidv4();
        await query(
          `INSERT INTO jobs (uuid, company_id, publisher_id, title, category, industry, description,
            requirements, salary_type, salary_min, salary_max, province, city, district,
            headcount, education_req, experience_req, welfare, contact_name, contact_phone,
            status, published_at, expired_at, is_urgent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1)`,
          [jobUuid2, company.id, employerResult.insertId, '焊接技工', '制造业', '制造业',
           '负责各类金属焊接工作，包括氩弧焊、二保焊等。',
           '1. 持有焊工证\n2. 3年以上焊接经验\n3. 能适应加班',
           'monthly', 8000, 12000, '广东', '深圳', '宝安区',
           2, 'vocational', '3年以上',
           JSON.stringify(['五险一金', '包吃', '高温补贴', '绩效奖金']),
           '李经理', '13800000004', 'active']
        );

        console.log(`  ✅ 企业: 13800000002 / 123456`);
        console.log(`  ✅ 2 个演示岗位已创建\n`);
      }
    }

    console.log('🎉 种子数据插入完成！');
    console.log('\n📋 测试账号：');
    console.log('  求职者: 13800000001 / 123456');
    console.log('  企业端: 13800000002 / 123456');

  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    await closePool();
  }
}

seed();
