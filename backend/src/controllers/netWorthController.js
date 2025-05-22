// Controller for assets and liabilities (Net Worth)
const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");

// ASSETS
exports.getAssets = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      "SELECT * FROM assets WHERE user_id = $1 ORDER BY description ASC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

exports.addAsset = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { description, value, category, notes } = req.body;

    if (!description || value === undefined) {
      return next(new AppError("Description and value are required for assets", 400));
    }
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue < 0) { // Assets can be 0, but not negative in this simple model
      return next(new AppError("Asset value must be a non-negative number", 400));
    }

    const result = await db.query(
      `INSERT INTO assets (user_id, description, value, category, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, description, parsedValue, category, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.updateAsset = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { description, value, category, notes } = req.body;
    const assetId = parseInt(id, 10);

    if (isNaN(assetId)) {
      return next(new AppError("Invalid asset ID format", 400));
    }

    let parsedValue;
    if (value !== undefined) {
        parsedValue = parseFloat(value);
        if (isNaN(parsedValue) || parsedValue < 0) {
            return next(new AppError("Asset value must be a non-negative number", 400));
        }
    }

    const updates = [];
    const values = [assetId, userId];
    let valueIndex = 3;

    if (description) { updates.push(`description = $${valueIndex++}`); values.push(description); }
    if (parsedValue !== undefined) { updates.push(`value = $${valueIndex++}`); values.push(parsedValue); }
    if (category) { updates.push(`category = $${valueIndex++}`); values.push(category); }
    if (notes) { updates.push(`notes = $${valueIndex++}`); values.push(notes); }

    if (updates.length === 0) {
      return next(new AppError("No valid fields provided for asset update", 400));
    }

    const updateQuery = `UPDATE assets SET ${updates.join(", ")} WHERE asset_id = $1 AND user_id = $2 RETURNING *`;
    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return next(new AppError("Asset not found or not authorized to update", 404));
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.deleteAsset = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const assetId = parseInt(id, 10);

    if (isNaN(assetId)) {
      return next(new AppError("Invalid asset ID format", 400));
    }

    const result = await db.query(
      "DELETE FROM assets WHERE asset_id = $1 AND user_id = $2 RETURNING asset_id",
      [assetId, userId]
    );

    if (result.rowCount === 0) {
      return next(new AppError("Asset not found or not authorized to delete", 404));
    }
    res.status(200).json({ message: "Asset deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// LIABILITIES
exports.getLiabilities = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      "SELECT * FROM liabilities WHERE user_id = $1 ORDER BY description ASC",
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

exports.addLiability = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { description, amount, category, interest_rate, notes } = req.body;

    if (!description || amount === undefined) {
      return next(new AppError("Description and amount are required for liabilities", 400));
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) { // Liabilities can be 0, but not negative
      return next(new AppError("Liability amount must be a non-negative number", 400));
    }
    let parsedInterestRate = null;
    if (interest_rate !== undefined && interest_rate !== null && interest_rate !== ''){
        parsedInterestRate = parseFloat(interest_rate);
        if (isNaN(parsedInterestRate) || parsedInterestRate < 0) {
            return next(new AppError("Interest rate must be a non-negative number if provided", 400));
        }
    }

    const result = await db.query(
      `INSERT INTO liabilities (user_id, description, amount, category, interest_rate, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, description, parsedAmount, category, parsedInterestRate, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.updateLiability = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { description, amount, category, interest_rate, notes } = req.body;
    const liabilityId = parseInt(id, 10);

    if (isNaN(liabilityId)) {
      return next(new AppError("Invalid liability ID format", 400));
    }

    let parsedAmount;
    if (amount !== undefined) {
        parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return next(new AppError("Liability amount must be a non-negative number", 400));
        }
    }
    let parsedInterestRate;
    if (interest_rate !== undefined) {
        if (interest_rate === null || interest_rate === '') {
            parsedInterestRate = null; // Allow clearing the interest rate
        } else {
            parsedInterestRate = parseFloat(interest_rate);
            if (isNaN(parsedInterestRate) || parsedInterestRate < 0) {
                return next(new AppError("Interest rate must be a non-negative number if provided", 400));
            }
        }
    }

    const updates = [];
    const values = [liabilityId, userId];
    let valueIndex = 3;

    if (description) { updates.push(`description = $${valueIndex++}`); values.push(description); }
    if (parsedAmount !== undefined) { updates.push(`amount = $${valueIndex++}`); values.push(parsedAmount); }
    if (category) { updates.push(`category = $${valueIndex++}`); values.push(category); }
    if (parsedInterestRate !== undefined) { updates.push(`interest_rate = $${valueIndex++}`); values.push(parsedInterestRate); }
    if (notes) { updates.push(`notes = $${valueIndex++}`); values.push(notes); }

    if (updates.length === 0) {
      return next(new AppError("No valid fields provided for liability update", 400));
    }

    const updateQuery = `UPDATE liabilities SET ${updates.join(", ")} WHERE liability_id = $1 AND user_id = $2 RETURNING *`;
    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return next(new AppError("Liability not found or not authorized to update", 404));
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.deleteLiability = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const liabilityId = parseInt(id, 10);

    if (isNaN(liabilityId)) {
      return next(new AppError("Invalid liability ID format", 400));
    }

    const result = await db.query(
      "DELETE FROM liabilities WHERE liability_id = $1 AND user_id = $2 RETURNING liability_id",
      [liabilityId, userId]
    );

    if (result.rowCount === 0) {
      return next(new AppError("Liability not found or not authorized to delete", 404));
    }
    res.status(200).json({ message: "Liability deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// NET WORTH CALCULATION
exports.getNetWorth = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const totalAssetsResult = await db.query(
      "SELECT COALESCE(SUM(value), 0) as total_assets FROM assets WHERE user_id = $1",
      [userId]
    );
    const totalLiabilitiesResult = await db.query(
      "SELECT COALESCE(SUM(amount), 0) as total_liabilities FROM liabilities WHERE user_id = $1",
      [userId]
    );

    const totalAssets = parseFloat(totalAssetsResult.rows[0].total_assets);
    const totalLiabilities = parseFloat(totalLiabilitiesResult.rows[0].total_liabilities);
    const netWorth = totalAssets - totalLiabilities;

    res.json({
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      netWorth: netWorth.toFixed(2)
    });
  } catch (error) {
    next(error);
  }
};
