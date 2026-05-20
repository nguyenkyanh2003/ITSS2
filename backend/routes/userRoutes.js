const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Define routes and map to controller functions
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);

module.exports = router;
