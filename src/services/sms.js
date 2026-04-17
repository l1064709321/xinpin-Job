import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * 短信服务 - 支持阿里云 / 腾讯云
 * TODO: 接入真实短信 API
 */
class SmsService {
  constructor() {
    this.provider = config.sms.provider;
  }

  /**
   * 发送短信验证码
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   * @param {string} template - 模板CODE，默认验证码模板
   */
  async send(phone, code, template = 'SMS_VERIFY_CODE') {
    if (config.env !== 'production') {
      logger.info(`[SMS-DEV] ${phone}: ${code}`);
      return { success: true, dev: true };
    }

    try {
      if (this.provider === 'aliyun') {
        return await this._sendAliyun(phone, code, template);
      } else if (this.provider === 'tencent') {
        return await this._sendTencent(phone, code, template);
      }
      throw new Error(`不支持的短信服务商: ${this.provider}`);
    } catch (err) {
      logger.error('短信发送失败', { phone, error: err.message });
      throw err;
    }
  }

  async _sendAliyun(phone, code, template) {
    // 阿里云短信 SDK
    // const Core = require('@alicloud/pop-core');
    // const client = new Core({ ... });
    // await client.request('SendSms', { PhoneNumbers: phone, TemplateParam: JSON.stringify({ code }) });
    logger.info(`[Aliyun SMS] ${phone}: ${code}`);
    return { success: true };
  }

  async _sendTencent(phone, code, template) {
    // 腾讯云短信 SDK
    logger.info(`[Tencent SMS] ${phone}: ${code}`);
    return { success: true };
  }
}

export default new SmsService();
