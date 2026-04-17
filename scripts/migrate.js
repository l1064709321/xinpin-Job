import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPool, query, closePool } from '../src/models/mysql/connection.js';

/**
 * 数据库迁移脚本
 * 用法: node scripts/migrate.js
 */
async function migrate() {
  console.log('🔄 开始数据库迁移...\n');

  createPool();

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    // 按分号拆分执行（简单处理，不含存储过程等复杂语句）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let created = 0;
    for (const stmt of statements) {
      // 只提取表名用于展示
      const match = stmt.match(/CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?/i);
      const tableName = match ? match[1] : 'unknown';

      try {
        await query(stmt);
        if (match) {
          console.log(`  ✅ ${tableName}`);
          created++;
        }
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`  ⏭️  ${tableName} (已存在，跳过)`);
        } else {
          console.error(`  ❌ ${tableName}: ${err.message}`);
        }
      }
    }

    console.log(`\n🎉 迁移完成！共处理 ${created} 张表`);
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await closePool();
  }
}

migrate();
