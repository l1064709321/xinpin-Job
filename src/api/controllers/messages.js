import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../../models/mysql/connection.js';

// 创建会话
export async function createConversation(req, res, next) {
  try {
    const { target_user_uuid } = req.body;
    const [target] = await query('SELECT id FROM users WHERE uuid = ?', [target_user_uuid]);
    if (!target) return res.status(404).json({ code: 404, message: '用户不存在' });
    if (target.id === req.user.id) return res.status(400).json({ code: 400, message: '不能和自己聊天' });

    // 检查是否已存在会话
    const existing = await query(
      `SELECT c.uuid FROM conversations c
       JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
       JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
       WHERE c.type = 'direct'`,
      [req.user.id, target.id]
    );
    if (existing.length > 0) {
      return res.json({ code: 0, data: { uuid: existing[0].uuid } });
    }

    const convUuid = uuidv4();
    await transaction(async (conn) => {
      const [result] = await conn.execute('INSERT INTO conversations (uuid, type) VALUES (?, ?)', [convUuid, 'direct']);
      await conn.execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [result.insertId, req.user.id]);
      await conn.execute('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)', [result.insertId, target.id]);
    });

    res.status(201).json({ code: 0, data: { uuid: convUuid } });
  } catch (err) { next(err); }
}

// 会话列表
export async function listConversations(req, res, next) {
  try {
    const list = await query(
      `SELECT c.uuid, c.updated_at,
              (SELECT COUNT(*) FROM conversation_messages cm WHERE cm.conversation_id = c.id) as msg_count
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
       WHERE c.type = 'direct'
       ORDER BY c.updated_at DESC`,
      [req.user.id]
    );
    res.json({ code: 0, data: list });
  } catch (err) { next(err); }
}

// 获取消息列表
export async function getMessages(req, res, next) {
  try {
    const { uuid } = req.params;
    const { before_id, limit = 50 } = req.query;

    const [conv] = await query('SELECT id FROM conversations WHERE uuid = ?', [uuid]);
    if (!conv) return res.status(404).json({ code: 404, message: '会话不存在' });

    const conditions = ['cm.conversation_id = ?'];
    const params = [conv.id];
    if (before_id) { conditions.push('cm.id < ?'); params.push(parseInt(before_id)); }

    // Note: conversation_messages would need its own table, for now using a simpler approach
    const messages = await query(
      `SELECT cm.id, cm.uuid, u.uuid as sender_uuid, cm.content, cm.created_at
       FROM conversation_messages cm
       JOIN users u ON u.id = cm.sender_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY cm.id DESC
       LIMIT ?`,
      [...params, parseInt(limit)]
    );

    res.json({ code: 0, data: messages.reverse() });
  } catch (err) { next(err); }
}

// 发送消息
export async function sendMessage(req, res, next) {
  try {
    const { uuid } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ code: 400, message: '消息不能为空' });

    const [conv] = await query(
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
       WHERE c.uuid = ?`,
      [req.user.id, uuid]
    );
    if (!conv) return res.status(403).json({ code: 403, message: '无权发送' });

    const msgUuid = uuidv4();
    await query(
      'INSERT INTO conversation_messages (uuid, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)',
      [msgUuid, conv.id, req.user.id, content.trim()]
    );
    await query('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conv.id]);

    res.status(201).json({ code: 0, data: { uuid: msgUuid } });
  } catch (err) { next(err); }
}
