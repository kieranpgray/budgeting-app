const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const authMiddleware = require("../middleware/authMiddleware");

// Apply authentication middleware to all category routes
router.use(authMiddleware.protect);

// Get all available categories
router.get("/", categoryController.getCategories);

// Update category for an expense
router.put("/expenses/:expenseId", categoryController.updateExpenseCategory);

// Update category for an income
router.put("/incomes/:incomeId", categoryController.updateIncomeCategory);

// Get transactions by category
router.get("/transactions", categoryController.getTransactionsByCategory);

module.exports = router;
