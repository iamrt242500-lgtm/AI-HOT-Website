/**
 * AI News API Client
 * Connects frontend to the backend API
 */

const API_BASE_URL = 'http://localhost:3001/api';

class NewsAPI {
    constructor() {
        this.token = localStorage.getItem('auth_token');
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const fullUrl = `${API_BASE_URL}${endpoint}`;
            console.log(`📡 API Request: ${fullUrl}`);
            
            const response = await fetch(fullUrl, {
                ...options,
                headers,
                mode: 'cors'
            });

            console.log(`✅ API Response Status: ${response.status}`);

            if (!response.ok) {
                let error;
                try {
                    error = await response.json();
                } catch (e) {
                    error = { error: response.statusText };
                }
                console.error(`❌ API Error Response:`, error);
                throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ API Success:`, data);
            return data;
        } catch (error) {
            console.error('🔴 API Error Details:', {
                message: error.message,
                stack: error.stack,
                endpoint,
                baseURL: API_BASE_URL
            });
            throw error;
        }
    }

    // ========== News Endpoints ==========

    /**
     * Get latest news
     */
    async getLatestNews(page = 1, limit = 20) {
        return this.request(`/news/latest?page=${page}&limit=${limit}`, {
            skipAuth: true
        });
    }

    /**
     * Get trending news
     */
    async getTrendingNews(page = 1, limit = 20) {
        return this.request(`/news/trending?page=${page}&limit=${limit}`, {
            skipAuth: true
        });
    }

    /**
     * Search news
     */
    async searchNews(keyword, page = 1, limit = 20) {
        return this.request(`/news/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`, {
            skipAuth: true
        });
    }

    /**
     * Get news detail
     */
    async getNewsDetail(id) {
        return this.request(`/news/${id}`, {
            skipAuth: true
        });
    }

    /**
     * Track news click
     */
    async trackClick(id) {
        return this.request(`/news/${id}/click`, {
            method: 'POST',
            skipAuth: true
        });
    }

    /**
     * Get news by source
     */
    async getNewsBySource(source, page = 1, limit = 20) {
        return this.request(`/news/source/${source}?page=${page}&limit=${limit}`, {
            skipAuth: true
        });
    }

    // ========== User Endpoints ==========

    /**
     * Register new user
     */
    async register(email, password, interests = []) {
        const data = await this.request('/user/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, interests }),
            skipAuth: true
        });

        if (data.token) {
            this.setToken(data.token);
        }

        return data;
    }

    /**
     * Login user
     */
    async login(email, password) {
        const data = await this.request('/user/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true
        });

        if (data.token) {
            this.setToken(data.token);
        }

        return data;
    }

    /**
     * Logout user
     */
    logout() {
        this.setToken(null);
    }

    /**
     * Save/bookmark news
     */
    async saveNews(newsId) {
        return this.request('/user/save', {
            method: 'POST',
            body: JSON.stringify({ newsId })
        });
    }

    /**
     * Get saved news
     */
    async getSavedNews(page = 1, limit = 20) {
        return this.request(`/user/saved?page=${page}&limit=${limit}`);
    }

    /**
     * Get personalized recommendations
     */
    async getRecommendations(page = 1, limit = 20) {
        return this.request(`/user/recommend?page=${page}&limit=${limit}`);
    }

    /**
     * Update user interests
     */
    async updateInterests(interests) {
        return this.request('/user/interests', {
            method: 'PUT',
            body: JSON.stringify({ interests })
        });
    }

    /**
     * Get user profile
     */
    async getProfile() {
        return this.request('/user/profile');
    }

    // ========== Trend Endpoints ==========

    /**
     * Get trending keywords
     */
    async getTrendingKeywords(limit = 20) {
        return this.request(`/trend/keywords?limit=${limit}`, {
            skipAuth: true
        });
    }

    /**
     * Get hot topics
     */
    async getHotTopics(limit = 10) {
        return this.request(`/trend/topics?limit=${limit}`, {
            skipAuth: true
        });
    }

    /**
     * Get platform statistics
     */
    async getStats() {
        return this.request('/trend/stats', {
            skipAuth: true
        });
    }

    // ========== AI Tools Endpoints ==========

    /**
     * Get all AI tools
     */
    async getAITools(category = 'all') {
        return this.request(`/ai-tools?category=${category}`, {
            skipAuth: true
        });
    }

    /**
     * Get featured AI tools
     */
    async getFeaturedAITools() {
        return this.request('/ai-tools/featured', {
            skipAuth: true
        });
    }

    /**
     * Get AI tool categories
     */
    async getAIToolCategories() {
        return this.request('/ai-tools/categories', {
            skipAuth: true
        });
    }

    /**
     * Get specific AI tool by ID
     */
    async getAITool(id) {
        return this.request(`/ai-tools/${id}`, {
            skipAuth: true
        });
    }

    // ========== SNS (Official Accounts) Endpoints ==========

    /**
     * Get latest SNS articles from official AI company accounts
     */
    async getSNSArticles(page = 1, limit = 20) {
        return this.request(`/sns/latest?page=${page}&limit=${limit}`, {
            skipAuth: true
        });
    }

    /**
     * Get SNS articles by specific company
     */
    async getSNSByCompany(company, page = 1, limit = 20) {
        return this.request(`/sns/by-company/${company}?page=${page}&limit=${limit}`, {
            skipAuth: true
        });
    }

    /**
     * Get featured SNS articles
     */
    async getFeaturedSNSArticles() {
        return this.request('/sns/featured', {
            skipAuth: true
        });
    }

    /**
     * Get list of SNS companies
     */
    async getSNSCompanies() {
        return this.request('/sns/companies', {
            skipAuth: true
        });
    }

    // ========== Helper Methods ==========

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString();
    }
}

// Create singleton instance
const newsAPI = new NewsAPI();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = newsAPI;
}
