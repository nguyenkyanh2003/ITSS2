const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const { buildCorsOptions } = require('./utils/cors');

const app = express();

app.set('trust proxy', 1);

let corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  // In development, allow local frontend to communicate; in production require explicit config
  if (process.env.NODE_ENV === 'development') {
    corsOrigin = 'http://localhost:5173';
    console.warn('CORS_ORIGIN not set — defaulting to http://localhost:5173 for development');
  } else {
    console.error('CORS_ORIGIN is not set in .env');
    process.exit(1);
  }
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(buildCorsOptions()));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/config', express.static(path.join(__dirname, 'config')));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
