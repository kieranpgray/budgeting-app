const express = require("express");
const router = express.Router();
const dataIOController = require("../controllers/dataIOController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");

// Configure multer for file uploads (store in memory for processing)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
            cb(null, true);
        } else {
            cb(new Error("Only .csv files are allowed!"), false);
        }
    }
});

// Apply authentication middleware to all data I/O routes
router.use(authMiddleware.protect);

// Export expenses
router.get("/export/expenses", dataIOController.exportExpensesCSV);

// Import expenses
router.post("/import/expenses", upload.single("csvFile"), dataIOController.importExpensesCSV);

// Export incomes
router.get("/export/incomes", dataIOController.exportIncomesCSV);

// Import incomes
router.post("/import/incomes", upload.single("csvFile"), dataIOController.importIncomesCSV);

module.exports = router;

