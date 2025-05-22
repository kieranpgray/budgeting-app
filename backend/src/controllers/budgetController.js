// Controller for budget-related operations
const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");

// Get all budgets for a user
exports.getBudgets = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      "SELECT * FROM budgets WHERE user_id = $1 ORDER BY category ASC, start_date DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Add a new budget
exports.addBudget = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { category, amount, start_date, end_date, notes } = req.body;

    if (!category || !amount || !start_date || !end_date) {
      return next(new AppError("Category, amount, start date, and end date are required", 400));
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return next(new AppError("Budget amount must be a positive number", 400));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return next(new AppError("Dates must be in YYYY-MM-DD format", 400));
    }
    if (new Date(start_date) >= new Date(end_date)) {
        return next(new AppError("Start date must be before end date", 400));
    }

    // Check for overlapping budgets for the same category (optional, but good practice)
    const overlapCheck = await db.query(
        `SELECT 1 FROM budgets 
         WHERE user_id = $1 AND category = $2 
         AND (start_date, end_date) OVERLAPS ($3::DATE, $4::DATE)`, 
        [userId, category, start_date, end_date]
    );
    if (overlapCheck.rows.length > 0) {
        return next(new AppError(`An overlapping budget for category '${category}' already exists for this period.`, 409));
    }

    const result = await db.query(
      `INSERT INTO budgets (user_id, category, amount, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, category, parsedAmount, start_date, end_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update an existing budget
exports.updateBudget = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { category, amount, start_date, end_date, notes } = req.body;
    const budgetId = parseInt(id, 10);

    if (isNaN(budgetId)) {
      return next(new AppError("Invalid budget ID format", 400));
    }

    let parsedAmount;
    if (amount !== undefined) {
        parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return next(new AppError("Budget amount must be a positive number", 400));
        }
    }
    if ((start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) || 
        (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date))) {
      return next(new AppError("Dates must be in YYYY-MM-DD format if provided", 400));
    }
    
    // Fetch current budget to validate date logic if only one date is provided
    const currentBudgetResult = await db.query("SELECT start_date, end_date FROM budgets WHERE budget_id = $1 AND user_id = $2", [budgetId, userId]);
    if (currentBudgetResult.rows.length === 0) {
        return next(new AppError("Budget not found or not authorized to update", 404));
    }
    const currentStartDate = new Date(currentBudgetResult.rows[0].start_date);
    const currentEndDate = new Date(currentBudgetResult.rows[0].end_date);

    const newStartDate = start_date ? new Date(start_date) : currentStartDate;
    const newEndDate = end_date ? new Date(end_date) : currentEndDate;

    if (newStartDate >= newEndDate) {
        return next(new AppError("Start date must be before end date", 400));
    }

    // Check for overlaps if category or dates change
    if (category || start_date || end_date) {
        const finalCategory = category || (await db.query("SELECT category FROM budgets WHERE budget_id = $1", [budgetId])).rows[0].category;
        const overlapCheck = await db.query(
            `SELECT 1 FROM budgets 
             WHERE user_id = $1 AND category = $2 AND budget_id != $3 
             AND (start_date, end_date) OVERLAPS ($4::DATE, $5::DATE)`, 
            [userId, finalCategory, budgetId, newStartDate.toISOString().split("T")[0], newEndDate.toISOString().split("T")[0]]
        );
        if (overlapCheck.rows.length > 0) {
            return next(new AppError(`An overlapping budget for category '${finalCategory}' already exists for this period.`, 409));
        }
    }

    const updates = [];
    const values = [budgetId, userId];
    let valueIndex = 3;

    if (category) { updates.push(`category = $${valueIndex++}`); values.push(category); }
    if (parsedAmount !== undefined) { updates.push(`amount = $${valueIndex++}`); values.push(parsedAmount); }
    if (start_date) { updates.push(`start_date = $${valueIndex++}`); values.push(start_date); }
    if (end_date) { updates.push(`end_date = $${valueIndex++}`); values.push(end_date); }
    if (notes !== undefined) { updates.push(`notes = $${valueIndex++}`); values.push(notes); }

    if (updates.length === 0) {
      return next(new AppError("No valid fields provided for budget update", 400));
    }

    const updateQuery = `UPDATE budgets SET ${updates.join(", ")} WHERE budget_id = $1 AND user_id = $2 RETURNING *`;
    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      // This check might be redundant due to the one above, but good for safety
      return next(new AppError("Budget not found or not authorized to update", 404));
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Delete a budget
exports.deleteBudget = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const budgetId = parseInt(id, 10);

    if (isNaN(budgetId)) {
      return next(new AppError("Invalid budget ID format", 400));
    }

    const result = await db.query(
      "DELETE FROM budgets WHERE budget_id = $1 AND user_id = $2 RETURNING budget_id",
      [budgetId, userId]
    );

    if (result.rowCount === 0) {
      return next(new AppError("Budget not found or not authorized to delete", 404));
    }
    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Get budget summary (how much spent vs budgeted for active budgets)
// This requires joining with an expenses table (assuming it exists and has user_id, category, amount, date)
exports.getBudgetSummary = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    // Fetch active budgets (current date is between start_date and end_date)
    const activeBudgetsResult = await db.query(
      `SELECT budget_id, category, amount as budgeted_amount, start_date, end_date 
       FROM budgets 
       WHERE user_id = $1 AND CURRENT_DATE BETWEEN start_date AND end_date`, 
      [userId]
    );

    if (activeBudgetsResult.rows.length === 0) {
      return res.json({ message: "No active budgets for the current period.", summary: [] });
    }

    const summary = [];
    for (const budget of activeBudgetsResult.rows) {
      // Assuming an 'expenses' table exists with 'category', 'amount', 'date', 'user_id'
      // This query needs to be adapted if your expenses table is different.
      const expensesResult = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as spent_amount 
         FROM expenses 
         WHERE user_id = $1 AND category = $2 AND date BETWEEN $3 AND $4`,
        [userId, budget.category, budget.start_date, budget.end_date]
      );
      
      const spentAmount = parseFloat(expensesResult.rows[0].spent_amount);
      const budgetedAmount = parseFloat(budget.budgeted_amount);
      summary.push({
        category: budget.category,
        budgeted: budgetedAmount.toFixed(2),
        spent: spentAmount.toFixed(2),
        remaining: (budgetedAmount - spentAmount).toFixed(2),
        startDate: budget.start_date,
        endDate: budget.end_date
      });
    }

    res.json({ summary });
  } catch (error) {
    next(error);
  }
};
