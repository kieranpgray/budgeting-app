const express = require("express");
const router = express.Router();
const financialGoalController = require("../controllers/financialGoalController");
const authMiddleware = require("../middleware/authMiddleware");

// Apply authentication middleware to all financial goal routes
router.use(authMiddleware.protect);

// Routes for financial goals
router.get("/", financialGoalController.getFinancialGoals);
router.post("/", financialGoalController.addFinancialGoal);
router.put("/:id", financialGoalController.updateFinancialGoal);
router.delete("/:id", financialGoalController.deleteFinancialGoal);

module.exports = router;
