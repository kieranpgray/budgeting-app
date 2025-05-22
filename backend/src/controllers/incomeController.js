// Controller for income-related operations
const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");

// Get all income entries for a user
exports.getIncomes = async (req, res, next) => {
  try {
    const userId = req.user.userId; // Assuming auth middleware adds user to req
    
    const result = await db.query(
      "SELECT * FROM incomes WHERE user_id = $1 ORDER BY date DESC",
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Add a new income entry
exports.addIncome = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { description, amount, category, date, recurring, frequency } = req.body;
    
    // Validate required fields
    if (!description || !amount || !date) {
      return next(new AppError("Description, amount, and date are required", 400));
    }
    
    // Validate amount is a positive number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return next(new AppError("Amount must be a positive number", 400));
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(new AppError("Date must be in YYYY-MM-DD format", 400));
    }
    
    // If recurring is true, frequency is required
    if (recurring && !frequency) {
      return next(new AppError("Frequency is required for recurring income", 400));
    }
    
    const result = await db.query(
      `INSERT INTO incomes 
       (user_id, description, amount, category, date, recurring, frequency) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [userId, description, parsedAmount, category, date, recurring, frequency]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update an existing income entry
exports.updateIncome = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { description, amount, category, date, recurring, frequency } = req.body;
    
    // Validate income ID
    const incomeId = parseInt(id, 10);
    if (isNaN(incomeId)) {
      return next(new AppError("Invalid income ID format", 400));
    }
    
    // Check if income exists and belongs to user
    const checkResult = await db.query(
      "SELECT * FROM incomes WHERE income_id = $1 AND user_id = $2",
      [incomeId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return next(new AppError("Income not found or not authorized to update", 404));
    }
    
    // Validate amount if provided
    let parsedAmount = null;
    if (amount) {
      parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return next(new AppError("Amount must be a positive number", 400));
      }
    }
    
    // Validate date format if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return next(new AppError("Date must be in YYYY-MM-DD format", 400));
    }
    
    // If recurring is true, frequency is required
    if (recurring === true && !frequency) {
      return next(new AppError("Frequency is required for recurring income", 400));
    }
    
    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [incomeId, userId];
    let valueIndex = 3;
    
    if (description) {
      updates.push(`description = $${valueIndex++}`);
      values.push(description);
    }
    
    if (parsedAmount !== null) {
      updates.push(`amount = $${valueIndex++}`);
      values.push(parsedAmount);
    }
    
    if (category) {
      updates.push(`category = $${valueIndex++}`);
      values.push(category);
    }
    
    if (date) {
      updates.push(`date = $${valueIndex++}`);
      values.push(date);
    }
    
    if (recurring !== undefined) {
      updates.push(`recurring = $${valueIndex++}`);
      values.push(recurring);
    }
    
    if (frequency) {
      updates.push(`frequency = $${valueIndex++}`);
      values.push(frequency);
    }
    
    if (updates.length === 0) {
      return next(new AppError("No valid fields provided for update", 400));
    }
    
    const updateQuery = `
      UPDATE incomes 
      SET ${updates.join(", ")} 
      WHERE income_id = $1 AND user_id = $2 
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete an income entry
exports.deleteIncome = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    // Validate income ID
    const incomeId = parseInt(id, 10);
    if (isNaN(incomeId)) {
      return next(new AppError("Invalid income ID format", 400));
    }
    
    const result = await db.query(
      "DELETE FROM incomes WHERE income_id = $1 AND user_id = $2 RETURNING income_id",
      [incomeId, userId]
    );
    
    if (result.rowCount === 0) {
      return next(new AppError("Income not found or not authorized to delete", 404));
    }
    
    res.status(200).json({ message: "Income deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Get income summary (e.g., total by category, month, etc.)
exports.getIncomeSummary = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { period } = req.query; // 'month', 'year', etc.
    
    let timeFilter = "";
    if (period === 'month') {
      timeFilter = "AND date >= date_trunc('month', CURRENT_DATE)";
    } else if (period === 'year') {
      timeFilter = "AND date >= date_trunc('year', CURRENT_DATE)";
    }
    
    // Total income
    const totalResult = await db.query(
      `SELECT SUM(amount) as total 
       FROM incomes 
       WHERE user_id = $1 ${timeFilter}`,
      [userId]
    );
    
    // Income by category
    const categoryResult = await db.query(
      `SELECT category, SUM(amount) as amount 
       FROM incomes 
       WHERE user_id = $1 ${timeFilter} 
       GROUP BY category 
       ORDER BY amount DESC`,
      [userId]
    );
    
    // Income by month (for the current year)
    const monthlyResult = await db.query(
      `SELECT date_trunc('month', date) as month, SUM(amount) as amount 
       FROM incomes 
       WHERE user_id = $1 AND date >= date_trunc('year', CURRENT_DATE) 
       GROUP BY month 
       ORDER BY month`,
      [userId]
    );
    
    res.json({
      total: totalResult.rows[0]?.total || 0,
      byCategory: categoryResult.rows,
      byMonth: monthlyResult.rows
    });
  } catch (error) {
    next(error);
  }
};
