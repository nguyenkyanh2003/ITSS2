const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/', productController.getProducts);
router.get('/suggestions', productController.getSuggestions);
router.get('/:id', productController.getProductById);

router.post('/:id/reserve', protect, productController.reserveProduct);
router.post('/', protect, productController.createProduct);
router.patch('/:id', protect, productController.updateProduct);
router.delete('/:id', protect, productController.deleteProduct);

module.exports = router;
