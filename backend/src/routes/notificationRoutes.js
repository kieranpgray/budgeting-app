const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all notification routes
router.use(authMiddleware.protect);

// Get all notifications for the authenticated user
router.get('/', notificationController.getNotifications);

// Mark a specific notification as read
router.put('/:id/read', notificationController.markNotificationAsRead);

// Delete a specific notification
router.delete('/:id', notificationController.deleteNotification);

// Mark all notifications as read
router.put('/mark-all-read', notificationController.markAllAsRead);

// Get unread notification count
router.get('/count', notificationController.getNotificationCount);

// Generate notifications (budget alerts, bill reminders, etc.)
// This would typically be called by a scheduled job, but we expose it as an API endpoint for testing
// In production, you might want to restrict this to admin users or remove it entirely
router.post('/generate-alerts', notificationController.generateBudgetAlerts);

module.exports = router;
