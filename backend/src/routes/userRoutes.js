const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

router.get('/', protect, restrictTo('admin'), userController.getAllUsers);
router.get('/me', protect, userController.getMe);
router.patch('/me', protect, userController.updateMe);
router.patch('/me/password', protect, userController.changePassword);
router.patch('/me/deactivate', protect, userController.deactivateMe);

router.get('/me/favorites', protect, userController.getFavorites);
router.post('/me/favorites/:itemId', protect, userController.addFavorite);
router.delete('/me/favorites/:itemId', protect, userController.removeFavorite);

router.post('/:id/follow', protect, userController.followUser);
router.delete('/:id/follow', protect, userController.unfollowUser);
router.patch('/:id/status', protect, restrictTo('admin'), userController.updateUserStatus);
router.patch('/:id/role', protect, restrictTo('admin'), userController.updateUserRole);

router.get('/:id', userController.getUserById);

module.exports = router;
