const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const resourceRoutes = require('./api/routes/resource.routes');
const { apiKeyMiddleware } = require('./api/middlewares/apiKey.middleware');
const { rateLimiter } = require('./api/middlewares/rateLimiter.middleware');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply API key protection
app.use(apiKeyMiddleware);

// Apply rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'resource_service' });
});

// Routes
app.use('/api/resources', resourceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

module.exports = app;
