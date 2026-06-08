const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { optionalProtect, protect } = require('../middlewares/auth.middleware');
const { uploadProductImages, uploadProductMedia } = require('../middlewares/upload.middleware');

const maybeUploadProductImages = (req, res, next) => {
	if (req.is('multipart/form-data')) {
		// accept images and optional video when creating a product
		return uploadProductMedia(req, res, next);
	}

	return next();
};

// route handlers (no diagnostic logs)

router.get('/', productController.getProducts);
router.get('/home', productController.getHomeFeed);
router.get('/suggestions', productController.getSuggestions);
router.get('/:id', optionalProtect, productController.getProductById);

router.post('/:id/reserve', protect, productController.reserveProduct);
router.post('/:id/reschedule', protect, productController.rescheduleProduct);
router.post('/:id/images', protect, uploadProductImages, productController.addProductImages);
router.post('/', protect, maybeUploadProductImages, productController.createProduct);
router.patch('/:id', protect, maybeUploadProductImages, productController.updateProduct);
router.delete('/:id', protect, productController.deleteProduct);

module.exports = router;
