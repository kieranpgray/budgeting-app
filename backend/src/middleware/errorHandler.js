const winston = require("winston");
require("dotenv").config();

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

const logColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue"
};

winston.addColors(logColors);

const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    // In production, you would also add transports for file logging
    // new winston.transports.File({ filename: "error.log", level: "error" }),
    // new winston.transports.File({ filename: "combined.log" })
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: "exceptions.log" })
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: "rejections.log" })
  ]
});

// Middleware for handling errors
const errorHandler = (err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  // If the error is operational and has a status code, use it
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // For unexpected errors, send a generic message
    // In development, you might want to send the full error
    if (process.env.NODE_ENV === "development") {
      res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
        stack: err.stack
      });
    } else {
      res.status(500).json({
        error: "Internal Server Error",
        message: "Something went wrong on our end. Please try again later."
      });
    }
  }
};

// Custom Error class for operational errors
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { logger, errorHandler, AppError };
