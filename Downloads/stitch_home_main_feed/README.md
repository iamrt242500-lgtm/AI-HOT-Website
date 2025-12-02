# 🔥 AI HOT NEWS - AI News Portal with SNS Official Updates

A full-stack web application for discovering the latest AI news and official announcements from major AI companies, including OpenAI, Google AI, DeepMind, Anthropic, Meta, and Mistral.

## 🌟 Features

### Frontend
- **SNS Official Updates Section** - Real-time official announcements from major AI companies
- **Company Filter** - Filter SNS posts by: OpenAI, Google AI, DeepMind, Anthropic, Meta, Mistral
- **Featured News Feed** - Curated AI news articles with pagination
- **Trending Topics** - Real-time trending AI topics and keywords
- **AI Tools Recommendation** - Discover recommended AI tools by category
- **Detail Page** - Click any article to view full details with back navigation
- **Responsive UI** - Works on desktop, tablet, and mobile
- **Dark/Light Mode** - Toggle between dark and light themes
- **Bookmark/Save** - Save articles for later reading
- **Search** - Search across all news articles

### Backend
- **Express.js REST API** - Robust backend with multiple endpoints
- **Data Collection** - SNS and news data collectors
- **Caching** - Redis-based caching for performance
- **Translation** - Multi-language support with translation services
- **Database** - PostgreSQL with migration support
- **CORS & Security** - Helmet.js and CORS middleware configured
- **Rate Limiting** - API rate limiting to prevent abuse
- **Authentication** - JWT-based user authentication

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- npm or yarn
- PostgreSQL (optional, for database features)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/iamrt242500-lgtm/AI-HOT-Website.git
cd AI-HOT-Website
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies** (already in repo)
```bash
# Frontend files are static, no installation needed
```

4. **Configure environment**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

5. **Start the backend server**
```bash
npm start
# or
node server.js
```

6. **Open the application**
```
http://localhost:3001/app.html
```

## 📁 Project Structure

```
.
├── app.html                 # Main frontend application
├── app-simple.html          # Simplified version for testing
├── api-client.js            # API client for frontend
├── index.html               # Home page
├── backend/
│   ├── server.js            # Express.js server
│   ├── package.json         # Backend dependencies
│   ├── collectors/          # Data collectors (SNS, News, etc.)
│   ├── routes/              # API routes
│   ├── services/            # Business logic services
│   ├── middleware/          # Authentication, logging, etc.
│   ├── db/                  # Database configuration and migrations
│   ├── scheduler/           # Background job scheduler
│   └── workers/             # Background workers
├── bookmark/                # Bookmark/Save component
├── filter_bar_component/    # Filter component
├── home_(main_feed)/        # Home feed component
├── news_card_component/     # News card component
├── news_detail_page/        # News detail page component
├── profile_(user_customization)/  # User profile component
├── search_page/             # Search component
└── trend_browser_page/      # Trends component
```

## 🔧 API Endpoints

### News
- `GET /api/news/latest` - Get latest news articles
- `POST /api/news/save` - Save article

### SNS Official Updates
- `GET /api/sns/latest` - Get latest SNS articles
- `GET /api/sns/by-company/:company` - Get articles by company
- `GET /api/sns/companies` - Get list of SNS companies

### Trends
- `GET /api/trend/topics` - Get trending topics

### AI Tools
- `GET /api/ai-tools` - Get AI tools recommendations

### User
- `POST /api/user/login` - User login
- `POST /api/user/signup` - User registration
- `GET /api/user/profile` - Get user profile

## 📊 Latest SNS Data

The application includes verified 2025 AI announcements:
- **OpenAI**: GPT-5.1 Release
- **Google AI**: Gemini 3
- **DeepMind**: SIMA 2 (Scalable Instructable Multi-Agent)
- **Anthropic**: Claude Opus 4.5
- **Meta AI**: $13B Funding
- **Mistral AI**: Advanced Models

All data is verified and updated as of December 2, 2025.

## 🔐 Security

- CORS protection configured
- Helmet.js security headers
- Rate limiting enabled
- JWT authentication
- Input validation
- XSS protection

## 📝 Documentation

- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Detailed implementation details
- [Backend API Docs](./backend/API_DOCS.md) - Complete API documentation
- [SNS Verification Report](./SNS_VERIFICATION_FINAL_REPORT.md) - Data verification details
- [GitHub Upload Guide](./GITHUB_UPLOAD_GUIDE.md) - Git and GitHub setup

## 🐳 Docker Support

Run with Docker:
```bash
docker-compose -f backend/docker-compose.yml up
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

**김성민** (iamrt242500@gmail.com)

## 🙏 Acknowledgments

- Built with Express.js, Node.js, and Vanilla JavaScript
- Uses official SNS API data from major AI companies
- Icons from Material Design

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Last Updated**: December 2, 2025

**Current Version**: 1.0.0 - Initial Release
