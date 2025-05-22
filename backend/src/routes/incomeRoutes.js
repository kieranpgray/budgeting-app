const express = require("express");
const router = express.Router();
const incomeController = require("../controllers/incomeController");
const authMiddleware = require("../middleware/authMiddleware"); // Assuming you have this for protecting routes

// Apply authentication middleware to all income routes
router.use(authMiddleware.protect);

// Routes for income
router.get("/", incomeController.getIncomes);
router.post("/", incomeController.addIncome);
router.put("/:id", incomeController.updateIncome);
router.delete("/:id", incomeController.deleteIncome);
router.get("/summary", incomeController.getIncomeSummary);

module.exports = router;
