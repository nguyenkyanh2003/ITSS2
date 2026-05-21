const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');

// Route test server
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'API SinhVienShop đang hoạt động!' });
});

router.use('/users', userRoutes);
router.use('/auth', authRoutes);

module.exports = router;