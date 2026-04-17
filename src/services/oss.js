import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * 对象存储服务 - 支持阿里云 OSS / 本地存储
 */
class OssService {
  constructor() {
    this.provider = config.oss.provider;
    this.localPath = config.upload.path;
  }

  /**
   * 上传文件
   * @param {Buffer} fileBuffer - 文件内容
   * @param {string} originalName - 原始文件名
   * @param {string} folder - 存储目录 (avatars/ licenses/ resumes/)
   * @returns {Promise<string>} 文件URL
   */
  async upload(fileBuffer, originalName, folder = 'misc') {
    const ext = path.extname(originalName);
    const filename = `${folder}/${uuidv4()}${ext}`;

    if (config.env !== 'production' || this.provider === 'local') {
      return this._uploadLocal(fileBuffer, filename);
    }

    if (this.provider === 'aliyun') {
      return this._uploadAliyun(fileBuffer, filename);
    }

    return this._uploadLocal(fileBuffer, filename);
  }

  async _uploadLocal(fileBuffer, filename) {
    const fs = await import('fs/promises');
    const fullPath = path.join(this.localPath, filename);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, fileBuffer);
    return `/uploads/${filename}`;
  }

  async _uploadAliyun(fileBuffer, filename) {
    // const OSS = require('ali-oss');
    // const client = new OSS({ ...config.oss });
    // const result = await client.put(filename, fileBuffer);
    // return result.url;
    logger.info(`[OSS-DEV] Upload: ${filename} (${fileBuffer.length} bytes)`);
    return `/uploads/${filename}`;
  }

  /**
   * 删除文件
   */
  async delete(fileUrl) {
    if (!fileUrl) return;
    // TODO: 实现 OSS 删除
    logger.info(`[OSS] Delete: ${fileUrl}`);
  }
}

export default new OssService();
