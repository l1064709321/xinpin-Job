-- ============================================
-- 信聘平台 - MySQL 核心表结构
-- ============================================

-- 用户表（求职者 + 企业用户共用基础信息）
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('worker', 'employer', 'admin') NOT NULL DEFAULT 'worker',
  status ENUM('pending', 'active', 'frozen', 'deleted') NOT NULL DEFAULT 'pending',
  real_name_verified TINYINT(1) NOT NULL DEFAULT 0 COMMENT '实名认证',
  credit_score INT NOT NULL DEFAULT 500 COMMENT '信用分(300-850)',
  avatar_url VARCHAR(512) DEFAULT NULL,
  last_login_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_role_status (role, status),
  INDEX idx_credit_score (credit_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户基础表';

-- 求职者档案
CREATE TABLE IF NOT EXISTS worker_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  gender ENUM('male', 'female', 'other') DEFAULT NULL,
  birth_year YEAR DEFAULT NULL,
  education ENUM('primary', 'junior', 'senior', 'vocational', 'college', 'bachelor', 'above') DEFAULT NULL,
  province VARCHAR(32) DEFAULT NULL,
  city VARCHAR(32) DEFAULT NULL,
  district VARCHAR(32) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  expected_salary_min INT UNSIGNED DEFAULT NULL COMMENT '期望最低薪资(元/月)',
  expected_salary_max INT UNSIGNED DEFAULT NULL,
  expected_industry VARCHAR(64) DEFAULT NULL,
  expected_job_type VARCHAR(64) DEFAULT NULL,
  work_years INT UNSIGNED DEFAULT 0 COMMENT '工作年限',
  self_description TEXT DEFAULT NULL,
  emergency_contact VARCHAR(32) DEFAULT NULL,
  emergency_phone VARCHAR(20) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city (city),
  INDEX idx_industry (expected_industry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='求职者档案';

-- 企业信息
CREATE TABLE IF NOT EXISTS companies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  owner_user_id BIGINT UNSIGNED NOT NULL COMMENT '企业管理员',
  name VARCHAR(128) NOT NULL COMMENT '企业名称',
  short_name VARCHAR(64) DEFAULT NULL COMMENT '企业简称',
  uscc VARCHAR(18) DEFAULT NULL COMMENT '统一社会信用代码',
  industry VARCHAR(64) DEFAULT NULL COMMENT '所属行业',
  scale ENUM('tiny', 'small', 'medium', 'large', 'huge') DEFAULT NULL COMMENT '企业规模',
  province VARCHAR(32) DEFAULT NULL,
  city VARCHAR(32) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  logo_url VARCHAR(512) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  license_url VARCHAR(512) DEFAULT NULL COMMENT '营业执照图片',
  verified TINYINT(1) NOT NULL DEFAULT 0 COMMENT '企业认证状态',
  verified_at DATETIME DEFAULT NULL,
  credit_score INT NOT NULL DEFAULT 500,
  status ENUM('pending', 'active', 'frozen', 'deleted') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  INDEX idx_name (name),
  INDEX idx_uscc (uscc),
  INDEX idx_city_industry (city, industry),
  INDEX idx_verified (verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业信息表';

-- 岗位表
CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  company_id BIGINT UNSIGNED NOT NULL,
  publisher_id BIGINT UNSIGNED NOT NULL COMMENT '发布者用户ID',
  title VARCHAR(128) NOT NULL COMMENT '岗位名称',
  category VARCHAR(64) DEFAULT NULL COMMENT '岗位类别',
  industry VARCHAR(64) DEFAULT NULL,
  description TEXT NOT NULL COMMENT '岗位描述',
  requirements TEXT DEFAULT NULL COMMENT '岗位要求',
  salary_type ENUM('monthly', 'daily', 'hourly', 'piece', 'negotiable') NOT NULL DEFAULT 'monthly',
  salary_min INT UNSIGNED DEFAULT NULL,
  salary_max INT UNSIGNED DEFAULT NULL,
  province VARCHAR(32) DEFAULT NULL,
  city VARCHAR(32) DEFAULT NULL,
  district VARCHAR(32) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  latitude DECIMAL(10, 7) DEFAULT NULL,
  longitude DECIMAL(10, 7) DEFAULT NULL,
  headcount INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '招聘人数',
  hired_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已录用人数',
  education_req ENUM('none', 'primary', 'junior', 'senior', 'vocational', 'college', 'bachelor') DEFAULT 'none',
  experience_req VARCHAR(64) DEFAULT NULL COMMENT '经验要求',
  age_min INT UNSIGNED DEFAULT NULL,
  age_max INT UNSIGNED DEFAULT NULL,
  welfare JSON DEFAULT NULL COMMENT '福利标签',
  contact_name VARCHAR(32) DEFAULT NULL,
  contact_phone VARCHAR(20) DEFAULT NULL,
  is_urgent TINYINT(1) NOT NULL DEFAULT 0,
  is_top TINYINT(1) NOT NULL DEFAULT 0 COMMENT '置顶',
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  apply_count INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('draft', 'pending', 'active', 'paused', 'expired', 'closed', 'deleted') NOT NULL DEFAULT 'draft',
  published_at DATETIME DEFAULT NULL,
  expired_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (publisher_id) REFERENCES users(id),
  INDEX idx_company (company_id),
  INDEX idx_category (category),
  INDEX idx_city_industry (city, industry),
  INDEX idx_salary (salary_min, salary_max),
  INDEX idx_status_published (status, published_at),
  INDEX idx_urgent (is_urgent, published_at),
  FULLTEXT idx_ft_search (title, description, requirements)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位表';

-- 投递记录
CREATE TABLE IF NOT EXISTS applications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  job_id BIGINT UNSIGNED NOT NULL,
  worker_id BIGINT UNSIGNED NOT NULL COMMENT '求职者用户ID',
  resume_snapshot TEXT DEFAULT NULL COMMENT '投递时简历快照',
  status ENUM('submitted', 'viewed', 'interview', 'offered', 'hired', 'rejected', 'cancelled') NOT NULL DEFAULT 'submitted',
  interview_time DATETIME DEFAULT NULL,
  interview_type ENUM('onsite', 'video', 'phone') DEFAULT NULL,
  interview_address VARCHAR(255) DEFAULT NULL,
  reject_reason VARCHAR(255) DEFAULT NULL,
  employer_notes TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (worker_id) REFERENCES users(id),
  UNIQUE INDEX idx_job_worker (job_id, worker_id),
  INDEX idx_worker_status (worker_id, status),
  INDEX idx_job_status (job_id, status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投递记录表';

-- 技能标签
CREATE TABLE IF NOT EXISTS skills (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  category VARCHAR(32) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能标签';

-- 用户技能关联
CREATE TABLE IF NOT EXISTS user_skills (
  user_id BIGINT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
  verified TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户技能关联';

-- 岗位技能要求
CREATE TABLE IF NOT EXISTS job_skills (
  job_id BIGINT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  required TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=必需, 0=加分',
  PRIMARY KEY (job_id, skill_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位技能要求';

-- 信用评价
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reviewer_id BIGINT UNSIGNED NOT NULL COMMENT '评价者',
  target_id BIGINT UNSIGNED NOT NULL COMMENT '被评价者',
  target_type ENUM('worker', 'company') NOT NULL,
  application_id BIGINT UNSIGNED DEFAULT NULL COMMENT '关联投递记录',
  rating TINYINT UNSIGNED NOT NULL COMMENT '1-5星',
  tags JSON DEFAULT NULL COMMENT '评价标签',
  content TEXT DEFAULT NULL,
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  INDEX idx_target (target_type, target_id),
  INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='信用评价表';

-- 面试记录
CREATE TABLE IF NOT EXISTS interviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  type ENUM('onsite', 'video', 'phone') NOT NULL DEFAULT 'onsite',
  scheduled_at DATETIME NOT NULL,
  duration_min INT UNSIGNED DEFAULT 30,
  address VARCHAR(255) DEFAULT NULL,
  video_link VARCHAR(512) DEFAULT NULL,
  status ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled',
  result ENUM('pass', 'fail', 'pending') DEFAULT 'pending',
  notes TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id),
  INDEX idx_scheduled (scheduled_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='面试记录表';

-- 站内信 / 聊天
CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  type ENUM('direct', 'system') NOT NULL DEFAULT 'direct',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话表';

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  last_read_msg_id BIGINT UNSIGNED DEFAULT 0,
  muted TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话成员';

-- 聊天消息
CREATE TABLE IF NOT EXISTS conversation_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  msg_type ENUM('text', 'image', 'file', 'system') NOT NULL DEFAULT 'text',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  INDEX idx_conv_id (conversation_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天消息表';

-- 系统通知
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(32) NOT NULL COMMENT '通知类型',
  title VARCHAR(128) NOT NULL,
  content TEXT DEFAULT NULL,
  data JSON DEFAULT NULL COMMENT '附加数据',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统通知表';
