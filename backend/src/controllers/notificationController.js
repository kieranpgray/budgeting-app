const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");

// Get all notifications for a user
exports.getNotifications = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const result = await db.query(
            `SELECT n.*, 
                e.description as expense_description, 
                e.amount as expense_amount,
                b.name as budget_name,
                b.amount as budget_amount,
                g.name as goal_name,
                g.target_amount as goal_amount
            FROM notifications n
            LEFT JOIN expenses e ON n.expense_id = e.expense_id
            LEFT JOIN budgets b ON n.budget_id = b.budget_id
            LEFT JOIN financial_goals g ON n.goal_id = g.goal_id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Mark a notification as read
exports.markNotificationAsRead = async (req, res, next) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
        const notificationId = parseInt(id, 10);
        if (isNaN(notificationId)) {
            return next(new AppError("Invalid notification ID format", 400));
        }

        const result = await db.query(
            "UPDATE notifications SET is_read = true, updated_at = NOW() WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id",
            [notificationId, userId]
        );

        if (result.rowCount === 0) {
            return next(new AppError("Notification not found or not authorized to update", 404));
        }
        res.json({ message: "Notification marked as read" });
    } catch (error) {
        next(error);
    }
};

// Create a new notification (typically called by internal services)
exports.createNotification = async (req, res, next) => {
    try {
        const { user_id, type, message, expense_id, budget_id, goal_id, due_date } = req.body;

        if (!user_id || !type || !message) {
            return next(new AppError("User ID, notification type, and message are required", 400));
        }

        const result = await db.query(
            `INSERT INTO notifications 
            (user_id, type, message, expense_id, budget_id, goal_id, due_date, is_read) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, false) 
            RETURNING *`,
            [user_id, type, message, expense_id || null, budget_id || null, goal_id || null, due_date || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

// Delete a notification
exports.deleteNotification = async (req, res, next) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
        const notificationId = parseInt(id, 10);
        if (isNaN(notificationId)) {
            return next(new AppError("Invalid notification ID format", 400));
        }

        const result = await db.query(
            "DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id",
            [notificationId, userId]
        );

        if (result.rowCount === 0) {
            return next(new AppError("Notification not found or not authorized to delete", 404));
        }
        res.json({ message: "Notification deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// Mark all notifications as read for a user
exports.markAllAsRead = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const result = await db.query(
            "UPDATE notifications SET is_read = true, updated_at = NOW() WHERE user_id = $1 AND is_read = false RETURNING notification_id",
            [userId]
        );

        res.json({ 
            message: "All notifications marked as read",
            count: result.rowCount
        });
    } catch (error) {
        next(error);
    }
};

// Get notification count (unread)
exports.getNotificationCount = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const result = await db.query(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
            [userId]
        );

        res.json({ 
            unreadCount: parseInt(result.rows[0].count, 10)
        });
    } catch (error) {
        next(error);
    }
};

// Generate budget alerts (typically called by a scheduled job)
exports.generateBudgetAlerts = async (req, res, next) => {
    try {
        // This would typically be called by an internal scheduled job
        // For now, we'll make it available as an API endpoint with appropriate authorization
        
        // Find budgets that are approaching their limits (e.g., 80% spent)
        const budgetAlerts = await db.query(`
            WITH budget_spending AS (
                SELECT 
                    b.budget_id,
                    b.user_id,
                    b.category,
                    b.amount as budget_amount,
                    COALESCE(SUM(e.amount), 0) as spent_amount
                FROM 
                    budgets b
                LEFT JOIN 
                    expenses e ON b.user_id = e.user_id 
                    AND b.category = e.category
                    AND e.date BETWEEN b.start_date AND b.end_date
                WHERE 
                    b.start_date <= CURRENT_DATE 
                    AND b.end_date >= CURRENT_DATE
                GROUP BY 
                    b.budget_id, b.user_id, b.category, b.amount
            )
            SELECT 
                bs.budget_id,
                bs.user_id,
                bs.category,
                bs.budget_amount,
                bs.spent_amount,
                (bs.spent_amount / bs.budget_amount * 100) as percentage_used
            FROM 
                budget_spending bs
            WHERE 
                bs.spent_amount > 0
                AND (bs.spent_amount / bs.budget_amount * 100) >= 80
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n 
                    WHERE n.budget_id = bs.budget_id 
                    AND n.type = 'BUDGET_ALERT'
                    AND n.created_at > NOW() - INTERVAL '3 days'
                )
        `);

        // Create notifications for each budget alert
        const notifications = [];
        for (const alert of budgetAlerts.rows) {
            const percentage = Math.round(alert.percentage_used);
            const message = percentage >= 100
                ? `You've exceeded your ${alert.category} budget of $${alert.budget_amount}`
                : `You've used ${percentage}% of your ${alert.category} budget`;

            const notification = await db.query(
                `INSERT INTO notifications 
                (user_id, type, message, budget_id, is_read) 
                VALUES ($1, 'BUDGET_ALERT', $2, $3, false) 
                RETURNING *`,
                [alert.user_id, message, alert.budget_id]
            );
            
            notifications.push(notification.rows[0]);
        }

        // Find upcoming bill reminders (expenses that recur monthly)
        const billReminders = await db.query(`
            SELECT 
                e.expense_id,
                e.user_id,
                e.description,
                e.amount,
                e.date
            FROM 
                expenses e
            WHERE 
                e.is_recurring = true
                AND e.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n 
                    WHERE n.expense_id = e.expense_id 
                    AND n.type = 'BILL_REMINDER'
                    AND n.created_at > NOW() - INTERVAL '7 days'
                )
        `);

        // Create notifications for each bill reminder
        for (const bill of billReminders.rows) {
            const daysUntil = Math.ceil((new Date(bill.date) - new Date()) / (1000 * 60 * 60 * 24));
            const message = daysUntil <= 1
                ? `Reminder: Your ${bill.description} payment of $${bill.amount} is due today!`
                : `Reminder: Your ${bill.description} payment of $${bill.amount} is due in ${daysUntil} days`;

            const notification = await db.query(
                `INSERT INTO notifications 
                (user_id, type, message, expense_id, due_date, is_read) 
                VALUES ($1, 'BILL_REMINDER', $2, $3, $4, false) 
                RETURNING *`,
                [bill.user_id, message, bill.expense_id, bill.date]
            );
            
            notifications.push(notification.rows[0]);
        }

        // Find financial goals approaching deadline
        const goalReminders = await db.query(`
            SELECT 
                g.goal_id,
                g.user_id,
                g.name,
                g.target_amount,
                g.current_amount,
                g.target_date
            FROM 
                financial_goals g
            WHERE 
                g.status = 'In Progress'
                AND g.target_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
                AND g.current_amount < g.target_amount
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n 
                    WHERE n.goal_id = g.goal_id 
                    AND n.type = 'GOAL_REMINDER'
                    AND n.created_at > NOW() - INTERVAL '7 days'
                )
        `);

        // Create notifications for each goal reminder
        for (const goal of goalReminders.rows) {
            const daysUntil = Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24));
            const percentComplete = Math.round((goal.current_amount / goal.target_amount) * 100);
            const amountNeeded = goal.target_amount - goal.current_amount;
            
            const message = `Your goal "${goal.name}" is due in ${daysUntil} days. You're ${percentComplete}% there and need $${amountNeeded.toFixed(2)} more to reach your target.`;

            const notification = await db.query(
                `INSERT INTO notifications 
                (user_id, type, message, goal_id, due_date, is_read) 
                VALUES ($1, 'GOAL_REMINDER', $2, $3, $4, false) 
                RETURNING *`,
                [goal.user_id, message, goal.goal_id, goal.target_date]
            );
            
            notifications.push(notification.rows[0]);
        }

        res.status(201).json({
            message: "Notifications generated successfully",
            count: notifications.length,
            notifications
        });
    } catch (error) {
        next(error);
    }
};
