const db = require(".../../config/db");
const { AppError } = require(".../middleware/errorHandler");

// Mock data for now, replace with actual DB query
const mockExpenses = [
    { expense_id: 1, user_id: 1, description: "Groceries", amount: "50.00", frequency: "Weekly", start_date: "2024-05-01" },
    { expense_id: 2, user_id: 1, description: "Rent", amount: "1200.00", frequency: "Monthly", start_date: "2024-05-01" },
];

exports.getExpenses = async (req, res, next) => {
    // const userId = req.user.userId; // Assuming auth middleware adds user to req
    try {
        // const result = await db.query("SELECT * FROM expenses WHERE user_id = $1 ORDER BY start_date DESC", [userId]);
        // res.json(result.rows);
        res.json(mockExpenses.filter(e => e.user_id === 1)); // Mock for user_id 1
    } catch (error) {
        next(error);
    }
};

exports.addExpense = async (req, res, next) => {
    // const userId = req.user.userId;
    const { description, amount, frequency, funding_source, start_date } = req.body;
    try {
        if (!description || !amount || !frequency || !start_date) {
            return next(new AppError("Description, amount, frequency, and start date are required.", 400));
        }
        if (typeof description !== "string" || description.trim() === "") {
            return next(new AppError("Description must be a non-empty string.", 400));
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return next(new AppError("Amount must be a positive number.", 400));
        }
        // Add more validation for frequency, funding_source, start_date format as needed
        if (typeof frequency !== "string" || frequency.trim() === "") {
            return next(new AppError("Frequency must be a non-empty string.", 400));
        }
        // Validate date format for start_date (e.g., YYYY-MM-DD)
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(start_date)) {
            return next(new AppError("Start date must be in YYYY-MM-DD format.", 400));
        }

        // const result = await db.query(
        //     "INSERT INTO expenses (user_id, description, amount, frequency, funding_source, start_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        //     [userId, description, parsedAmount, frequency, funding_source, start_date]
        // );
        // res.status(201).json(result.rows[0]);
        const newExpense = { expense_id: Date.now(), user_id: 1, description, amount: parsedAmount.toFixed(2), frequency, funding_source, start_date };
        mockExpenses.push(newExpense);
        res.status(201).json(newExpense);
    } catch (error) {
        next(error);
    }
};

exports.deleteExpense = async (req, res, next) => {
    // const userId = req.user.userId;
    const { id } = req.params;
    try {
        const expenseId = parseInt(id, 10);
        if (isNaN(expenseId)) {
            return next(new AppError("Invalid expense ID format.", 400));
        }

        // const result = await db.query("DELETE FROM expenses WHERE expense_id = $1 AND user_id = $2 RETURNING expense_id", [expenseId, userId]);
        // if (result.rowCount === 0) {
        //     return next(new AppError("Expense not found or not authorized to delete.", 404));
        // }
        const index = mockExpenses.findIndex(e => e.expense_id === expenseId && e.user_id === 1);
        if (index === -1) {
             return next(new AppError("Expense not found or not authorized to delete.", 404));
        }
        mockExpenses.splice(index, 1);
        res.status(200).json({ message: "Expense deleted successfully." });
    } catch (error) {
        next(error);
    }
};
