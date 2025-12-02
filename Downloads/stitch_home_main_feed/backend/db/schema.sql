-- AI/IT News Aggregation Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS saved_news CASCADE;
DROP TABLE IF EXISTS trending_keywords CASCADE;
DROP TABLE IF EXISTS news CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    interests TEXT[], -- Array of interest keywords
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- News table
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    source VARCHAR(50) NOT NULL, -- 'instagram', 'x', 'medium', 'reddit', 'facebook'
    url TEXT UNIQUE NOT NULL,
    thumbnail TEXT,
    tags TEXT[], -- Array of tags
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved/Bookmarked news (many-to-many relationship)
CREATE TABLE saved_news (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, news_id)
);

-- Trending keywords table
CREATE TABLE trending_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(100) UNIQUE NOT NULL,
    weight FLOAT DEFAULT 0,
    count INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_news_source ON news(source);
CREATE INDEX idx_news_created_at ON news(created_at DESC);
CREATE INDEX idx_news_tags ON news USING GIN(tags);
CREATE INDEX idx_news_view_count ON news(view_count DESC);
CREATE INDEX idx_news_click_count ON news(click_count DESC);

CREATE INDEX idx_saved_news_user_id ON saved_news(user_id);
CREATE INDEX idx_saved_news_news_id ON saved_news(news_id);

CREATE INDEX idx_trending_keywords_weight ON trending_keywords(weight DESC);
CREATE INDEX idx_trending_keywords_updated_at ON trending_keywords(updated_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_updated_at
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trending_keywords_updated_at
    BEFORE UPDATE ON trending_keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO trending_keywords (keyword, weight, count) VALUES
    ('AI', 100, 150),
    ('Cloud', 85, 120),
    ('Robotics', 75, 95),
    ('Startup', 70, 88),
    ('Cybersecurity', 65, 82),
    ('BigData', 60, 75),
    ('QuantumComputing', 55, 68),
    ('MachineLearning', 90, 135),
    ('Blockchain', 50, 60),
    ('IoT', 45, 55);
