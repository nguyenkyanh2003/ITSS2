const Notification = require('../models/Notification');

let _getSocket;

const setSocketGetter = (fn) => {
  _getSocket = fn;
};

const pushSocket = (recipientId, notification) => {
  try {
    if (!_getSocket) return;
    const io = _getSocket();
    io.to(String(recipientId)).emit('notification:new', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });
  } catch {
    // socket not initialized – silently skip
  }
};

const createNotification = async (recipientId, type, title, message, data = {}) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      data,
    });
    pushSocket(recipientId, notification);
    return notification;
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err.message);
    return null;
  }
};

module.exports = { createNotification, setSocketGetter };
