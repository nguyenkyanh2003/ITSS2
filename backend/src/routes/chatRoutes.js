const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/with/:userId', protect, chatController.getConversation);
router.post('/conversations', protect, chatController.getOrCreateConversation);
router.post('/with/:userId', protect, chatController.sendMessage);
router.patch('/with/:userId/read', protect, chatController.markConversationRead);

module.exports = router;
