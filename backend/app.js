const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDb = require('./config/db');

dotenv.config();

const app = express();
const userRoutes = require('./routes/userRoutes');

connectDb();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
