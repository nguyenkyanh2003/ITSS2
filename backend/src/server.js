require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./utils/socket');

const port = Number.parseInt(process.env.PORT, 10);
if (!Number.isInteger(port)) {
  console.error('PORT is not set or invalid in .env');
  process.exit(1);
}


connectDB().then(() => {
  const server = http.createServer(app);
  initSocket(server);
  server.listen(port, () => {
    const env = process.env.NODE_ENV || 'development';
    const baseUrl = `http://localhost:${port}`;
    console.log(`Server đang chạy (${env}) tại ${baseUrl}`);
  });
});