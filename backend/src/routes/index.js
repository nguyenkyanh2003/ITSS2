const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const transactionRoutes = require('./transactionRoutes');

// Route test server
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'API SinhVienShop đang hoạt động!' });
});

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/transactions', transactionRoutes);

module.exports = router;