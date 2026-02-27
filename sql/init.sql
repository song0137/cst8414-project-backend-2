IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' and xtype='U')
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  email NVARCHAR(255) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,
  display_name NVARCHAR(80) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='wardrobe_items' and xtype='U')
CREATE TABLE wardrobe_items (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  name NVARCHAR(150) NOT NULL,
  category NVARCHAR(100) NOT NULL,
  color NVARCHAR(100) NOT NULL,
  season NVARCHAR(100) NOT NULL,
  brand NVARCHAR(120) NOT NULL,
  image_url NVARCHAR(500) NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_wardrobe_users FOREIGN KEY (user_id) REFERENCES users(id)
);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_wardrobe_user_filters')
CREATE INDEX IX_wardrobe_user_filters ON wardrobe_items(user_id, category, color, season);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='style_quiz_questions' and xtype='U')
CREATE TABLE style_quiz_questions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  question_text NVARCHAR(255) NOT NULL,
  dimension NVARCHAR(80) NOT NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='style_quiz_answers' and xtype='U')
CREATE TABLE style_quiz_answers (
  id INT IDENTITY(1,1) PRIMARY KEY,
  question_id INT NOT NULL,
  answer_text NVARCHAR(255) NOT NULL,
  score_weight INT NOT NULL DEFAULT 1,
  CONSTRAINT FK_quiz_answers_question FOREIGN KEY (question_id) REFERENCES style_quiz_questions(id)
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_quiz_responses' and xtype='U')
CREATE TABLE user_quiz_responses (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  question_id INT NOT NULL,
  answer_id INT NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_user_quiz_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT FK_user_quiz_question FOREIGN KEY (question_id) REFERENCES style_quiz_questions(id),
  CONSTRAINT FK_user_quiz_answer FOREIGN KEY (answer_id) REFERENCES style_quiz_answers(id)
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='products' and xtype='U')
CREATE TABLE products (
  id INT IDENTITY(1,1) PRIMARY KEY,
  provider NVARCHAR(120) NOT NULL,
  title NVARCHAR(255) NOT NULL,
  category NVARCHAR(100) NOT NULL,
  price FLOAT NOT NULL,
  currency NVARCHAR(10) NOT NULL DEFAULT 'CAD',
  product_url NVARCHAR(500) NOT NULL,
  image_url NVARCHAR(500) NULL,
  is_active BIT NOT NULL DEFAULT 1
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='recommendation_runs' and xtype='U')
CREATE TABLE recommendation_runs (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  source NVARCHAR(80) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_reco_run_user FOREIGN KEY (user_id) REFERENCES users(id)
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='recommendation_items' and xtype='U')
CREATE TABLE recommendation_items (
  id INT IDENTITY(1,1) PRIMARY KEY,
  run_id INT NOT NULL,
  item_type NVARCHAR(30) NOT NULL,
  product_id INT NULL,
  wardrobe_item_id INT NULL,
  score FLOAT NOT NULL,
  rank_order INT NOT NULL,
  CONSTRAINT FK_reco_item_run FOREIGN KEY (run_id) REFERENCES recommendation_runs(id),
  CONSTRAINT FK_reco_item_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT FK_reco_item_wardrobe FOREIGN KEY (wardrobe_item_id) REFERENCES wardrobe_items(id)
);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reco_items_run_rank')
CREATE INDEX IX_reco_items_run_rank ON recommendation_items(run_id, rank_order);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='recommendation_feedback' and xtype='U')
CREATE TABLE recommendation_feedback (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  recommendation_item_id INT NOT NULL,
  feedback_type NVARCHAR(20) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_reco_feedback_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT FK_reco_feedback_item FOREIGN KEY (recommendation_item_id) REFERENCES recommendation_items(id)
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='reviews' and xtype='U')
CREATE TABLE reviews (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  target_type NVARCHAR(30) NOT NULL,
  target_id INT NOT NULL,
  rating INT NOT NULL,
  comment NVARCHAR(500) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CHK_reviews_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT FK_reviews_user FOREIGN KEY (user_id) REFERENCES users(id)
);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_reviews_target')
CREATE INDEX IX_reviews_target ON reviews(target_type, target_id, rating);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='blog_posts' and xtype='U')
CREATE TABLE blog_posts (
  id INT IDENTITY(1,1) PRIMARY KEY,
  title NVARCHAR(255) NOT NULL,
  summary NVARCHAR(500) NOT NULL,
  content NVARCHAR(MAX) NOT NULL,
  topic NVARCHAR(100) NOT NULL,
  image_url NVARCHAR(500) NULL,
  published_at DATETIME2 NOT NULL,
  is_published BIT NOT NULL DEFAULT 0
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='social_shares' and xtype='U')
CREATE TABLE social_shares (
  id INT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NOT NULL,
  outfit_payload NVARCHAR(MAX) NOT NULL,
  platform NVARCHAR(50) NOT NULL,
  privacy_setting NVARCHAR(30) NOT NULL,
  shared_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_social_user FOREIGN KEY (user_id) REFERENCES users(id)
);
