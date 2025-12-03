require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const newsRoutes = require('./routes/news');
const userRoutes = require('./routes/user');
const trendRoutes = require('./routes/trend');
const settingsRoutes = require('./routes/settings');
const savedRoutes = require('./routes/saved');
const toolsRoutes = require('./routes/tools');
const snsRoutes = require('./routes/sns');

// Import scheduler
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration FIRST - allow frontend to access API
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:8000',
            'http://localhost:3001',
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:8000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173'
        ];
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security middleware - AFTER CORS
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'data:'],
            fontSrc: ["'self'", 'https:', 'data:'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https:'],
            frameSrc: ["'self'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from parent directory (frontend files)
const path = require('path');
app.use(express.static(path.join(__dirname, '..')));

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/news', newsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user', settingsRoutes);
app.use('/api/user', savedRoutes);
app.use('/api/trend', trendRoutes);
app.use('/api/ai-tools', toolsRoutes);
app.use('/api/sns', snsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

    // Start news collection scheduler
    scheduler.start();
    console.log('⏰ News collection scheduler started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
});

module.exports = app;
