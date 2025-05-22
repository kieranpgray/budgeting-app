const express = require("express");
const router = express.Router();
const netWorthController = require("../controllers/netWorthController");
const authMiddleware = require("../middleware/authMiddleware");

// Apply authentication middleware to all net worth related routes
router.use(authMiddleware.protect);

// Asset Routes
router.get("/assets", netWorthController.getAssets);
router.post("/assets", netWorthController.addAsset);
router.put("/assets/:id", netWorthController.updateAsset);
router.delete("/assets/:id", netWorthController.deleteAsset);

// Liability Routes
router.get("/liabilities", netWorthController.getLiabilities);
router.post("/liabilities", netWorthController.addLiability);
router.put("/liabilities/:id", netWorthController.updateLiability);
router.delete("/liabilities/:id", netWorthController.deleteLiability);

// Net Worth Calculation Route
router.get("/summary", netWorthController.getNetWorth);

module.exports = router;
