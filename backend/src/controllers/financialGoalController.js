// Controller for financial goals
const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");

// Get all financial goals for a user
exports.getFinancialGoals = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      "SELECT * FROM financial_goals WHERE user_id = $1 ORDER BY target_date ASC, name ASC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Add a new financial goal
exports.addFinancialGoal = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, target_amount, current_amount, target_date, description, priority } = req.body;

    if (!name || target_amount === undefined || !target_date) {
      return next(new AppError("Goal name, target amount, and target date are required", 400));
    }
    const parsedTargetAmount = parseFloat(target_amount);
    const parsedCurrentAmount = parseFloat(current_amount || 0);

    if (isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) {
      return next(new AppError("Target amount must be a positive number", 400));
    }
    if (isNaN(parsedCurrentAmount) || parsedCurrentAmount < 0) {
      return next(new AppError("Current amount must be a non-negative number", 400));
    }
    if (parsedCurrentAmount > parsedTargetAmount) {
        return next(new AppError("Current amount cannot exceed target amount", 400));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
      return next(new AppError("Target date must be in YYYY-MM-DD format", 400));
    }
    if (new Date(target_date) < new Date(new Date().toISOString().split("T")[0])) {
        return next(new AppError("Target date cannot be in the past", 400));
    }

    const result = await db.query(
      `INSERT INTO financial_goals (user_id, name, target_amount, current_amount, target_date, description, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, name, parsedTargetAmount, parsedCurrentAmount, target_date, description, priority]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update an existing financial goal
exports.updateFinancialGoal = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, target_amount, current_amount, target_date, description, priority, status } = req.body;
    const goalId = parseInt(id, 10);

    if (isNaN(goalId)) {
      return next(new AppError("Invalid goal ID format", 400));
    }

    const updates = [];
    const values = [goalId, userId];
    let valueIndex = 3;

    if (name) { updates.push(`name = $${valueIndex++}`); values.push(name); }
    if (description) { updates.push(`description = $${valueIndex++}`); values.push(description); }
    if (priority) { updates.push(`priority = $${valueIndex++}`); values.push(priority); }
    if (status) { updates.push(`status = $${valueIndex++}`); values.push(status); }

    let parsedTargetAmount, parsedCurrentAmount;
    if (target_amount !== undefined) {
        parsedTargetAmount = parseFloat(target_amount);
        if (isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) {
            return next(new AppError("Target amount must be a positive number", 400));
        }
        updates.push(`target_amount = $${valueIndex++}`); values.push(parsedTargetAmount);
    }
    if (current_amount !== undefined) {
        parsedCurrentAmount = parseFloat(current_amount);
        if (isNaN(parsedCurrentAmount) || parsedCurrentAmount < 0) {
            return next(new AppError("Current amount must be a non-negative number", 400));
        }
        updates.push(`current_amount = $${valueIndex++}`); values.push(parsedCurrentAmount);
    }

    // Validate current_amount against target_amount if both are being updated or one is updated and the other exists
    const finalCurrentAmount = parsedCurrentAmount !== undefined ? parsedCurrentAmount : (await db.query("SELECT current_amount FROM financial_goals WHERE goal_id = $1 AND user_id = $2", [goalId, userId])).rows[0]?.current_amount;
    const finalTargetAmount = parsedTargetAmount !== undefined ? parsedTargetAmount : (await db.query("SELECT target_amount FROM financial_goals WHERE goal_id = $1 AND user_id = $2", [goalId, userId])).rows[0]?.target_amount;

    if (finalCurrentAmount !== undefined && finalTargetAmount !== undefined && parseFloat(finalCurrentAmount) > parseFloat(finalTargetAmount)) {
        return next(new AppError("Current amount cannot exceed target amount", 400));
    }

    if (target_date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
            return next(new AppError("Target date must be in YYYY-MM-DD format", 400));
        }
        // Optionally, add validation that target_date is not in the past if status is not 'Achieved'
        updates.push(`target_date = $${valueIndex++}`); values.push(target_date);
    }

    if (updates.length === 0) {
      return next(new AppError("No valid fields provided for goal update", 400));
    }

    const updateQuery = `UPDATE financial_goals SET ${updates.join(", ")}, updated_at = NOW() WHERE goal_id = $1 AND user_id = $2 RETURNING *`;
    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return next(new AppError("Financial goal not found or not authorized to update", 404));
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete a financial goal
exports.deleteFinancialGoal = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const goalId = parseInt(id, 10);

    if (isNaN(goalId)) {
      return next(new AppError("Invalid goal ID format", 400));
    }

    const result = await db.query(
      "DELETE FROM financial_goals WHERE goal_id = $1 AND user_id = $2 RETURNING goal_id",
      [goalId, userId]
    );

    if (result.rowCount === 0) {
      return next(new AppError("Financial goal not found or not authorized to delete", 404));
    }
    res.status(200).json({ message: "Financial goal deleted successfully" });
  } catch (error) {
    next(error);
  }
};
