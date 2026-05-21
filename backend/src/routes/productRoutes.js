const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { protect } = require('../middlewares/auth.middleware');
const { uploadProductImages } = require('../middlewares/upload.middleware');

const maybeUploadProductImages = (req, res, next) => {
	if (req.is('multipart/form-data')) {
		return uploadProductImages(req, res, next);
	}

	return next();
};

router.get('/', productController.getProducts);
router.get('/suggestions', productController.getSuggestions);
router.get('/:id', productController.getProductById);

router.post('/:id/reserve', protect, productController.reserveProduct);
router.post('/:id/images', protect, uploadProductImages, productController.addProductImages);
router.post('/', protect, maybeUploadProductImages, productController.createProduct);
router.patch('/:id', protect, productController.updateProduct);
router.delete('/:id', protect, productController.deleteProduct);

module.exports = router;
