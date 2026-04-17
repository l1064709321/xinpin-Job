# 信聘平台 - 后端服务

高信任度蓝领招聘平台，基于策划方案实现的后端 API 服务。

## 技术栈

| 组件 | 技术选型 |
|------|---------|
| 运行时 | Node.js 22 + Express 4 |
| 数据库 | MySQL 8.0 (核心业务) + MongoDB 7 (聊天/日志) |
| 缓存 | Redis 7 |
| 搜索 | Elasticsearch 8.15 |
| 认证 | JWT + bcrypt |
| 部署 | Docker Compose |

## 项目结构

```
xinpin-backend/
├── src/
│   ├── app.js                    # 入口文件
│   ├── config/                   # 配置管理
│   ├── api/
│   │   ├── routes/               # API 路由定义
│   │   │   ├── auth.js           # 认证（注册/登录/Token刷新）
│   │   │   ├── users.js          # 用户档案管理
│   │   │   ├── jobs.js           # 岗位发布/搜索/详情
│   │   │   ├── companies.js      # 企业管理
│   │   │   ├── applications.js   # 简历投递/状态管理
│   │   │   ├── match.js          # 智能匹配推荐
│   │   │   ├── messages.js       # 站内聊天
│   │   │   └── reviews.js        # 信用评价
│   │   ├── controllers/          # 业务逻辑
│   │   └── middleware/           # 中间件（鉴权/限流/错误处理）
│   ├── models/                   # 数据模型
│   ├── services/                 # 业务服务
│   └── utils/                    # 工具函数
├── scripts/
│   └── schema.sql                # MySQL 表结构（11张核心表）
├── docker/
│   ├── docker-compose.yml        # 一键启动全部服务
│   └── Dockerfile                # API 服务镜像
└── package.json
```

## API 接口一览

### 认证模块 `/api/v1/auth`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/sms/send` | 发送短信验证码 |
| POST | `/sms/login` | 短信验证码登录/注册 |
| POST | `/register` | 密码注册 |
| POST | `/login` | 密码登录 |
| POST | `/refresh` | 刷新 Token |

### 用户模块 `/api/v1/users` 🔒
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/me` | 获取个人档案 |
| PUT | `/me` | 更新档案 |
| GET | `/me/skills` | 获取技能列表 |
| PUT | `/me/skills` | 更新技能 |

### 岗位模块 `/api/v1/jobs`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 岗位列表（分页/筛选） |
| GET | `/search?q=关键词` | 关键词搜索 |
| GET | `/:uuid` | 岗位详情 |
| POST | `/` 🔒 | 创建岗位 |
| PUT | `/:uuid` 🔒 | 更新岗位 |
| PATCH | `/:uuid/status` 🔒 | 修改状态（发布/暂停/关闭） |
| GET | `/my/list` 🔒 | 我发布的岗位 |

### 企业模块 `/api/v1/companies`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 企业列表 |
| GET | `/:uuid` | 企业详情 |
| POST | `/` 🔒 | 创建企业 |
| PUT | `/:uuid` 🔒 | 更新企业 |

### 投递模块 `/api/v1/applications` 🔒
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 投递简历 |
| GET | `/my` | 我的投递记录 |
| GET | `/received` | 收到的投递（企业端） |
| PATCH | `/:uuid/status` | 更新投递状态 |

### 智能匹配 `/api/v1/match` 🔒
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/jobs` | 为求职者推荐岗位 |
| GET | `/workers/:job_uuid` | 为企业推荐人才 |

### 聊天 `/api/v1/messages` 🔒
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/conversations` | 创建会话 |
| GET | `/conversations` | 会话列表 |
| GET | `/conversations/:uuid/messages` | 获取消息 |
| POST | `/conversations/:uuid/messages` | 发送消息 |

### 评价 `/api/v1/reviews` 🔒
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 提交评价 |
| GET | `/target/:type/:uuid` | 获取某用户评价 |

> 🔒 = 需要 Bearer Token 认证

## 快速启动

```bash
# 1. 启动基础设施
cd docker && docker-compose up -d mysql redis mongodb elasticsearch

# 2. 安装依赖
npm install

# 3. 启动开发服务
npm run dev

# 4. 访问
curl http://localhost:3000/health
```

## 数据库设计

11 张核心表：`users`, `worker_profiles`, `companies`, `jobs`, `applications`, `skills`, `user_skills`, `job_skills`, `reviews`, `interviews`, `conversations`, `conversation_members`, `notifications`

## 智能匹配算法

基于多维度加权评分：
- 📍 同城 +30分
- 🏭 同行业 +20分
- 🛠️ 技能匹配 +10分/项
- 💰 薪资达标 +10分
- ⭐ 信用分 ≥600 +10分
