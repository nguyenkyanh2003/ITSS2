require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const port = Number.parseInt(process.env.PORT, 10);
if (!Number.isInteger(port)) {
  console.error('PORT is not set or invalid in .env');
  process.exit(1);
}


connectDB().then(() => {
  app.listen(port, () => {
    const env = process.env.NODE_ENV || 'development';
    const baseUrl = `http://localhost:${port}`;
    console.log(`Server đang chạy (${env}) tại ${baseUrl}`);
  });
});