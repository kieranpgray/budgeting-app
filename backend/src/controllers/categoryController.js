// Controller for transaction categorization
const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");

// Get all categories for a user (both predefined and user-created)
exports.getCategories = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    // In a more complex system, you might have a dedicated categories table.
    // For now, we can infer from existing expense/income categories or have a simple list.
    // This example assumes we might want to manage categories more explicitly later.
    
    // Fetch distinct categories from expenses
    const expenseCategories = await db.query(
      "SELECT DISTINCT category FROM expenses WHERE user_id = $1 AND category IS NOT NULL ORDER BY category ASC", 
      [userId]
    );
    // Fetch distinct categories from incomes
    const incomeCategories = await db.query(
      "SELECT DISTINCT category FROM incomes WHERE user_id = $1 AND category IS NOT NULL ORDER BY category ASC", 
      [userId]
    );

    const allCategories = new Set();
    expenseCategories.rows.forEach(row => allCategories.add(row.category));
    incomeCategories.rows.forEach(row => allCategories.add(row.category));

    // Add some predefined common categories if they don't exist from user's transactions
    const predefined = ["Groceries", "Utilities", "Rent/Mortgage", "Transport", "Dining Out", "Entertainment", "Healthcare", "Salary", "Freelance", "Investment", "Shopping", "Travel"];
    predefined.forEach(cat => allCategories.add(cat));

    res.json(Array.from(allCategories).sort());

  } catch (error) {
    next(error);
  }
};

// (Future enhancement: Add/Edit/Delete custom categories if a dedicated table is used)

// Update category for an existing expense
exports.updateExpenseCategory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { expenseId } = req.params;
    const { category } = req.body;

    if (!category) {
      return next(new AppError("Category is required", 400));
    }
    const id = parseInt(expenseId, 10);
    if (isNaN(id)) {
        return next(new AppError("Invalid expense ID format", 400));
    }

    const result = await db.query(
      "UPDATE expenses SET category = $1, updated_at = NOW() WHERE expense_id = $2 AND user_id = $3 RETURNING *",
      [category, id, userId]
    );

    if (result.rows.length === 0) {
      return next(new AppError("Expense not found or not authorized to update", 404));
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Update category for an existing income
exports.updateIncomeCategory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { incomeId } = req.params;
    const { category } = req.body;

    if (!category) {
      return next(new AppError("Category is required", 400));
    }
    const id = parseInt(incomeId, 10);
    if (isNaN(id)) {
        return next(new AppError("Invalid income ID format", 400));
    }

    const result = await db.query(
      "UPDATE incomes SET category = $1, updated_at = NOW() WHERE income_id = $2 AND user_id = $3 RETURNING *",
      [category, id, userId]
    );

    if (result.rows.length === 0) {
      return next(new AppError("Income not found or not authorized to update", 404));
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

// Get transactions by category (could be expenses or incomes, or combined)
exports.getTransactionsByCategory = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { category, type, startDate, endDate } = req.query; // type can be 'expense', 'income', or 'all'

        if (!category) {
            return next(new AppError("Category parameter is required", 400));
        }

        let query = "";
        const queryParams = [userId, category];
        let paramIndex = 3;

        const dateFilter = (start, end) => {
            let filter = "";
            if (start) { filter += ` AND date >= $${paramIndex++}`; queryParams.push(start); }
            if (end) { filter += ` AND date <= $${paramIndex++}`; queryParams.push(end); }
            return filter;
        }

        const expensesQuery = `SELECT expense_id as id, description, amount, date, category, 'expense' as type, created_at FROM expenses WHERE user_id = $1 AND category = $2 ${dateFilter(startDate, endDate)}`
        const incomesQuery = `SELECT income_id as id, description, amount, date, category, 'income' as type, created_at FROM incomes WHERE user_id = $1 AND category = $2 ${dateFilter(startDate, endDate)}` // Note: paramIndex will be incremented by dateFilter if used
        
        let results = [];

        if (type === 'expense' || type === 'all' || !type) {
            const expenseResults = await db.query(expensesQuery, queryParams.slice(0, paramIndex)); // Adjust queryParams if dateFilter was used
            results = results.concat(expenseResults.rows);
        }
        
        // Reset paramIndex for incomes if dates are used for both
        if (type === 'income' || type === 'all' || !type) {
            const incomeQueryParams = [userId, category];
            let incomeParamIndex = 3;
            const incomeDateFilter = (start, end) => {
                let filter = "";
                if (start) { filter += ` AND date >= $${incomeParamIndex++}`; incomeQueryParams.push(start); }
                if (end) { filter += ` AND date <= $${incomeParamIndex++}`; incomeQueryParams.push(end); }
                return filter;
            }
            const currentIncomesQuery = `SELECT income_id as id, description, amount, date, category, 'income' as type, created_at FROM incomes WHERE user_id = $1 AND category = $2 ${incomeDateFilter(startDate, endDate)}`
            const incomeResults = await db.query(currentIncomesQuery, incomeQueryParams.slice(0, incomeParamIndex));
            results = results.concat(incomeResults.rows);
        }

        results.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at));

        res.json(results);

    } catch (error) {
        next(error);
    }
};
