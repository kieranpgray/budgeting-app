const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");
const authMiddleware = require("../middleware/authMiddleware");

// Apply authentication middleware to all budget routes
router.use(authMiddleware.protect);

// Routes for budgets
router.get("/", budgetController.getBudgets);
router.post("/", budgetController.addBudget);
router.put("/:id", budgetController.updateBudget);
router.delete("/:id", budgetController.deleteBudget);
router.get("/summary", budgetController.getBudgetSummary);

module.exports = router;
