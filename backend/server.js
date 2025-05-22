const express = require("express");
require("dotenv").config(); // Ensure this is at the top
const cors = require("cors");
const helmet = require("helmet"); // Import Helmet
const rateLimit = require("express-rate-limit"); // Import rate limiter

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const expenseRoutes = require("./src/routes/expenseRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const incomeRoutes = require("./src/routes/incomeRoutes"); 
const netWorthRoutes = require("./src/routes/netWorthRoutes");
const budgetRoutes = require("./src/routes/budgetRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const financialGoalRoutes = require("./src/routes/financialGoalRoutes"); // Import financial goal routes

// Import error handling middleware and logger
const { logger, errorHandler, AppError } = require("./src/middleware/errorHandler");
const authMiddleware = require("./src/middleware/authMiddleware"); // Import auth middleware

const app = express();

// Security Middleware
app.use(helmet()); // Use Helmet to set various HTTP headers for security

// CORS Middleware - configure appropriately for your frontend URL in production
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));

// Body Parsers
app.use(express.json({ limit: "10kb" })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Request logging middleware (optional, but good for debugging)
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Rate limiting middleware
// Global rate limiter for all requests
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased global limit slightly
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
  skip: (req) => process.env.NODE_ENV === "development" && process.env.DISABLE_RATE_LIMIT === "true"
});

// More strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Slightly increased auth attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts from this IP, please try again after an hour",
  skip: (req) => process.env.NODE_ENV === "development" && process.env.DISABLE_RATE_LIMIT === "true"
});

// Apply global rate limiter to all requests
app.use(globalLimiter);

// API Routes - Apply specific rate limiters to sensitive routes
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/request-password-reset", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/expenses", authMiddleware.protect, expenseRoutes); // Protect expense routes
app.use("/api/notifications", authMiddleware.protect, notificationRoutes); // Protect notification routes
app.use("/api/incomes", authMiddleware.protect, incomeRoutes); // Protect income routes
app.use("/api/networth", authMiddleware.protect, netWorthRoutes); // Protect net worth routes
app.use("/api/budgets", authMiddleware.protect, budgetRoutes); // Protect budget routes
app.use("/api/categories", authMiddleware.protect, categoryRoutes); // Protect category routes
app.use("/api/financial-goals", authMiddleware.protect, financialGoalRoutes); // Protect financial goal routes

// Catch-all for 404 Not Found errors
app.all("*", (req, res, next) => {
  next(new AppError(`Can\\\\'t find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});
