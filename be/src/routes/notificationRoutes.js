const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/', notificationController.sendNotification);
router.get('/user/:userId', notificationController.getUserNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.put('/user/:userId/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;