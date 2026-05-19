const Notification = require('../models/Notification');

// Envoyer une notification
exports.sendNotification = async (req, res) => {
  try {
    const { userId, userRole, type, title, message, data } = req.body;
    
    const notification = new Notification({
      userId,
      userRole,
      type,
      title,
      message,
      data
    });
    
    await notification.save();
    
    // Envoyer via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${userId}`).emit('new-notification', notification);
    }
    
    res.status(201).json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les notifications d'un utilisateur
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, unreadOnly = false, page = 1 } = req.query;
    
    const query = { userId };
    if (unreadOnly === 'true') query.isRead = false;
    
    const skip = (page - 1) * limit;
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false })
    ]);
    
    res.json({
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Marquer une notification comme lue
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Marquer toutes les notifications comme lues
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer une notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};