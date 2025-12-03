const config = require('../../config');

const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  // Skip API key check for health endpoint and API docs
  if (req.path === '/health' || req.path.startsWith('/api-docs')) {
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      error: {
        message: 'API key is required',
        status: 401
      }
    });
  }

  if (apiKey !== config.apiKey) {
    return res.status(403).json({
      error: {
        message: 'Invalid API key',
        status: 403
      }
    });
  }

  next();
};

module.exports = { apiKeyMiddleware };
