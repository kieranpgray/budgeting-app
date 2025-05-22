const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");
const Papa = require("papaparse");

// Export expenses to CSV
exports.exportExpensesCSV = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const result = await db.query(
            "SELECT expense_id, description, amount, category, date, is_recurring, created_at FROM expenses WHERE user_id = $1 ORDER BY date DESC",
            [userId]
        );

        if (result.rows.length === 0) {
            // Send an empty CSV with headers if no data, or a message
            // For consistency, let's send headers for an empty file
            const headers = ["expense_id", "description", "amount", "category", "date", "is_recurring", "created_at"];
            const csv = Papa.unparse([{}], { header: true, fields: headers }); 
            // Remove the empty object line, Papa unparse with only headers is tricky
            const finalCsv = csv.split('\n')[0];
            res.header("Content-Type", "text/csv");
            res.attachment(`expenses_export_${new Date().toISOString().split("T")[0]}.csv`);
            return res.send(finalCsv);
        }

        const csv = Papa.unparse(result.rows);
        res.header("Content-Type", "text/csv");
        res.attachment(`expenses_export_${new Date().toISOString().split("T")[0]}.csv`);
        res.send(csv);
    } catch (error) {
        next(error);
    }
};

// Import expenses from CSV
exports.importExpensesCSV = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        if (!req.file) {
            return next(new AppError("No CSV file uploaded.", 400));
        }

        const csvData = req.file.buffer.toString("utf8");
        const parseResult = Papa.parse(csvData, { header: true, skipEmptyLines: true, dynamicTyping: true });

        if (parseResult.errors.length > 0) {
            console.error("CSV Parsing errors:", parseResult.errors);
            return next(new AppError(`Error parsing CSV: ${parseResult.errors.map(e => e.message).join(', ')}`, 400));
        }

        const expensesToImport = parseResult.data;
        if (expensesToImport.length === 0) {
            return res.status(200).json({ message: "No valid data found in CSV to import." });
        }

        let importedCount = 0;
        let skippedCount = 0;
        const errors = [];
        const importedExpenses = [];

        const requiredFields = ["description", "amount", "date"];
        for (const expense of expensesToImport) {
            const missingFields = requiredFields.filter(field => expense[field] === undefined || expense[field] === null || expense[field] === '');
            if (missingFields.length > 0) {
                errors.push(`Skipped row due to missing fields: ${missingFields.join(", ")}. Row: ${JSON.stringify(expense)}`);
                skippedCount++;
                continue;
            }
            if (isNaN(parseFloat(expense.amount)) || parseFloat(expense.amount) <= 0) {
                errors.push(`Skipped row due to invalid amount: ${expense.amount}. Row: ${JSON.stringify(expense)}`);
                skippedCount++;
                continue;
            }
            
            let formattedDate = expense.date;
            if (typeof expense.date === 'number') { // Handle Excel date serial numbers if PapaParse converts them
                // This is a simplified conversion, Excel dates are complex. Might need a library for robust conversion.
                const excelEpoch = new Date(1899, 11, 30);
                formattedDate = new Date(excelEpoch.getTime() + expense.date * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
            } else if (typeof expense.date === 'string') {
                if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(expense.date)) {
                    const parsedDate = new Date(expense.date);
                    if (isNaN(parsedDate.getTime())) {
                        errors.push(`Skipped row due to invalid date format: ${expense.date}. Row: ${JSON.stringify(expense)}`);
                        skippedCount++;
                        continue;
                    }
                    formattedDate = parsedDate.toISOString().split("T")[0];
                } else if (expense.date.includes("T")) {
                    formattedDate = expense.date.split("T")[0];
                }
            } else {
                 errors.push(`Skipped row due to invalid date type: ${typeof expense.date}. Row: ${JSON.stringify(expense)}`);
                 skippedCount++;
                 continue;
            }

            const isRecurring = expense.is_recurring === "true" || expense.is_recurring === true || expense.is_recurring === "TRUE" || expense.is_recurring === 1;

            try {
                const result = await db.query(
                    `INSERT INTO expenses (user_id, description, amount, category, date, is_recurring)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [userId, expense.description, parseFloat(expense.amount), expense.category || null, formattedDate, isRecurring]
                );
                importedExpenses.push(result.rows[0]);
                importedCount++;
            } catch (dbError) {
                errors.push(`Error importing row: ${JSON.stringify(expense)}. DB Error: ${dbError.message}`);
                skippedCount++;
            }
        }

        res.status(201).json({
            message: "CSV import process completed.",
            imported: importedCount,
            skipped: skippedCount,
            importedExpenses,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        next(error);
    }
};

// Export incomes to CSV
exports.exportIncomesCSV = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        const result = await db.query(
            "SELECT income_id, description, amount, category, date, recurring, frequency, created_at FROM incomes WHERE user_id = $1 ORDER BY date DESC",
            [userId]
        );

        if (result.rows.length === 0) {
            const headers = ["income_id", "description", "amount", "category", "date", "recurring", "frequency", "created_at"];
            const csv = Papa.unparse([{}], { header: true, fields: headers });
            const finalCsv = csv.split('\n')[0];
            res.header("Content-Type", "text/csv");
            res.attachment(`incomes_export_${new Date().toISOString().split("T")[0]}.csv`);
            return res.send(finalCsv);
        }

        const csv = Papa.unparse(result.rows);
        res.header("Content-Type", "text/csv");
        res.attachment(`incomes_export_${new Date().toISOString().split("T")[0]}.csv`);
        res.send(csv);
    } catch (error) {
        next(error);
    }
};

// Import incomes from CSV
exports.importIncomesCSV = async (req, res, next) => {
    const userId = req.user.userId;
    try {
        if (!req.file) {
            return next(new AppError("No CSV file uploaded.", 400));
        }

        const csvData = req.file.buffer.toString("utf8");
        const parseResult = Papa.parse(csvData, { header: true, skipEmptyLines: true, dynamicTyping: true });

        if (parseResult.errors.length > 0) {
            console.error("CSV Parsing errors:", parseResult.errors);
            return next(new AppError(`Error parsing CSV: ${parseResult.errors.map(e => e.message).join(', ')}`, 400));
        }

        const incomesToImport = parseResult.data;
        if (incomesToImport.length === 0) {
            return res.status(200).json({ message: "No valid data found in CSV to import." });
        }

        let importedCount = 0;
        let skippedCount = 0;
        const errors = [];
        const importedIncomes = [];

        const requiredFields = ["description", "amount", "date"];
        for (const income of incomesToImport) {
            const missingFields = requiredFields.filter(field => income[field] === undefined || income[field] === null || income[field] === '');
            if (missingFields.length > 0) {
                errors.push(`Skipped row due to missing fields: ${missingFields.join(", ")}. Row: ${JSON.stringify(income)}`);
                skippedCount++;
                continue;
            }
            if (isNaN(parseFloat(income.amount)) || parseFloat(income.amount) <= 0) {
                errors.push(`Skipped row due to invalid amount: ${income.amount}. Row: ${JSON.stringify(income)}`);
                skippedCount++;
                continue;
            }

            let formattedDate = income.date;
            if (typeof income.date === 'number') { 
                const excelEpoch = new Date(1899, 11, 30);
                formattedDate = new Date(excelEpoch.getTime() + income.date * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
            } else if (typeof income.date === 'string') {
                if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(income.date)) {
                    const parsedDate = new Date(income.date);
                    if (isNaN(parsedDate.getTime())) {
                        errors.push(`Skipped row due to invalid date format: ${income.date}. Row: ${JSON.stringify(income)}`);
                        skippedCount++;
                        continue;
                    }
                    formattedDate = parsedDate.toISOString().split("T")[0];
                } else if (income.date.includes("T")) {
                    formattedDate = income.date.split("T")[0];
                }
            } else {
                 errors.push(`Skipped row due to invalid date type: ${typeof income.date}. Row: ${JSON.stringify(income)}`);
                 skippedCount++;
                 continue;
            }

            const isRecurring = income.recurring === "true" || income.recurring === true || income.recurring === "TRUE" || income.recurring === 1;
            let frequency = income.frequency || null;

            if (isRecurring && !frequency) {
                errors.push(`Skipped row: Frequency is required for recurring income. Row: ${JSON.stringify(income)}`);
                skippedCount++;
                continue;
            }
            if (!isRecurring) {
                frequency = null; // Ensure frequency is null if not recurring
            }

            try {
                const result = await db.query(
                    `INSERT INTO incomes (user_id, description, amount, category, date, recurring, frequency)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                    [userId, income.description, parseFloat(income.amount), income.category || null, formattedDate, isRecurring, frequency]
                );
                importedIncomes.push(result.rows[0]);
                importedCount++;
            } catch (dbError) {
                errors.push(`Error importing row: ${JSON.stringify(income)}. DB Error: ${dbError.message}`);
                skippedCount++;
            }
        }

        res.status(201).json({
            message: "CSV import process completed.",
            imported: importedCount,
            skipped: skippedCount,
            importedIncomes,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        next(error);
    }
};
