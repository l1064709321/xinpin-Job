import dotenv from 'dotenv';
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  // MySQL
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'xinpin',
    pool: {
      min: 5,
      max: 20,
      idle: 10000,
    },
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/xinpin',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // Elasticsearch
  elasticsearch: {
    node: process.env.ES_NODE || 'http://127.0.0.1:9200',
    auth: {
      username: process.env.ES_USER || 'elastic',
      password: process.env.ES_PASSWORD || '',
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'xinpin-dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: '30d',
  },

  // 上传
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    path: process.env.UPLOAD_PATH || './uploads',
  },

  // 短信服务
  sms: {
    provider: process.env.SMS_PROVIDER || 'aliyun',
    accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',
    signName: process.env.SMS_SIGN_NAME || '信聘',
  },

  // OSS
  oss: {
    provider: process.env.OSS_PROVIDER || 'aliyun',
    bucket: process.env.OSS_BUCKET || 'xinpin',
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  },
};

export default config;
