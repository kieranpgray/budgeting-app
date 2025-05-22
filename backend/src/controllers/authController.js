const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const qrcode = require("qrcode");
const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const JWT_TEMP_EXPIRES_IN = process.env.JWT_TEMP_EXPIRES_IN || "10m";
const APP_NAME = process.env.APP_NAME || "Budgeting App";

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const sendPasswordResetEmail = async (email, resetLink) => {
    console.log(`Email to ${email} with link: ${resetLink}`);
    return Promise.resolve();
};

exports.register = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return next(new AppError("Email and password are required", 400));
        }
        if (!isValidEmail(email)) {
            return next(new AppError("Invalid email format", 400));
        }
        if (password.length < 10) { // Increased password length
            return next(new AppError("Password must be at least 10 characters long", 400));
        }

        const existingUser = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return next(new AppError("Email already in use", 409)); // 409 Conflict
        }
        const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds
        
        const secret = speakeasy.generateSecret({ 
            length: 20,
            name: `${APP_NAME} (${email})`
        });

        const otpauthURL = secret.otpauth_url;
        let qrCodeDataURL = "";
        try {
            qrCodeDataURL = await qrcode.toDataURL(otpauthURL);
        } catch (qrErr) {
            console.error("QR Code generation error:", qrErr);
        }

        // Placeholder for recovery codes - this should be a more robust implementation
        const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString("hex").toUpperCase());
        const hashedRecoveryCodes = await Promise.all(recoveryCodes.map(code => bcrypt.hash(code, 12)));
        // TODO: Store hashedRecoveryCodes in a separate table linked to the user, or as a JSONB array in the users table.
        // For now, we are not storing them, just generating for the response.

        const result = await db.query(
            "INSERT INTO users (email, password_hash, totp_secret, totp_auth_url) VALUES ($1, $2, $3, $4) RETURNING user_id",
            [email, hashedPassword, secret.base32, otpauthURL]
        );
        res.status(201).json({
            message: "Registration successful. Please set up 2FA with the provided secret or QR code, and save your recovery codes.",
            userId: result.rows[0].user_id,
            totpSecret: secret.base32,
            qrCodeDataURL: qrCodeDataURL,
            recoveryCodes: recoveryCodes, // Send to user ONCE. User must save these.
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return next(new AppError("Email and password are required", 400));
        }
        if (!isValidEmail(email)) {
            return next(new AppError("Invalid email format", 400));
        }

        const userResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            return next(new AppError("Invalid credentials", 401));
        }
        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return next(new AppError("Invalid credentials", 401));
        }

        if (user.totp_secret && user.is_totp_enabled) { // Assuming a flag `is_totp_enabled` 
            const tempToken = jwt.sign({ userId: user.user_id, email: user.email, twoFactorPending: true }, JWT_SECRET, { expiresIn: JWT_TEMP_EXPIRES_IN });
            return res.json({ 
                message: "2FA required", 
                requires2FA: true, 
                tempToken: tempToken 
            });
        }

        const token = jwt.sign({ userId: user.user_id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({ message: "Login successful", token, requires2FA: false });

    } catch (error) {
        next(error);
    }
};

exports.verifyTwoFactor = async (req, res, next) => {
    const { tempToken, totpCode } = req.body;
    try {
        if (!tempToken || !totpCode) {
            return next(new AppError("Temporary token and TOTP code are required", 400));
        }
        if (!/^\d{6}$/.test(totpCode)) {
            return next(new AppError("Invalid TOTP code format. Must be 6 digits.", 400));
        }

        let decodedTempToken;
        try {
            decodedTempToken = jwt.verify(tempToken, JWT_SECRET);
        } catch (err) {
            return next(new AppError("Invalid or expired temporary token.", 401));
        }

        if (!decodedTempToken.twoFactorPending) {
            return next(new AppError("2FA not pending for this token.", 400));
        }

        const userResult = await db.query("SELECT user_id, email, totp_secret, role FROM users WHERE user_id = $1", [decodedTempToken.userId]);
        if (userResult.rows.length === 0) {
            return next(new AppError("User not found.", 404));
        }
        const user = userResult.rows[0];

        if (!user.totp_secret) {
            return next(new AppError("2FA is not enabled for this account.", 400));
        }

        const verified = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: "base32",
            token: totpCode,
            window: 1 
        });

        if (verified) {
            // If this is the first time verifying, mark 2FA as enabled
            // await db.query("UPDATE users SET is_totp_enabled = true WHERE user_id = $1", [user.user_id]);
            const finalToken = jwt.sign({ userId: user.user_id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            res.json({ message: "2FA verification successful", token: finalToken });
        } else {
            // TODO: Implement attempt tracking for 2FA codes to prevent brute-force
            return next(new AppError("Invalid 2FA code", 401));
        }
    } catch (error) {
        next(error);
    }
};

exports.requestPasswordReset = async (req, res, next) => {
    const { email } = req.body;
    try {
        if (!email) {
            return next(new AppError("Email is required", 400));
        }
        if (!isValidEmail(email)) {
            return next(new AppError("Invalid email format", 400));
        }

        const userResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            // Security: Don't reveal if email exists
            return res.json({ message: "If an account with that email exists, a password reset link has been sent."});
        }
        const user = userResult.rows[0];
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedResetToken = await bcrypt.hash(resetToken, 12);
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

        await db.query(
            "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE user_id = $3",
            [hashedResetToken, resetTokenExpires, user.user_id]
        );

        const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
        await sendPasswordResetEmail(user.email, resetLink);

        res.json({ message: "If an account with that email exists, a password reset link has been sent."});
    } catch (error) {
        next(error);
    }
};

exports.resetPassword = async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        if (!token) {
            return next(new AppError("Reset token is missing", 400));
        }
        if (!password || password.length < 10) { // Consistent password length
            return next(new AppError("Password must be at least 10 characters long", 400));
        }

        const usersWithPotentiallyValidTokens = await db.query(
            "SELECT user_id, reset_password_token FROM users WHERE reset_password_expires > NOW() AND reset_password_token IS NOT NULL"
        );

        let userToUpdate = null;
        for (const user of usersWithPotentiallyValidTokens.rows) {
            if (user.reset_password_token && await bcrypt.compare(token, user.reset_password_token)) {
                userToUpdate = user;
                break;
            }
        }

        if (!userToUpdate) {
            return next(new AppError("Password reset token is invalid or has expired.", 400));
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await db.query(
            "UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE user_id = $2",
            [hashedPassword, userToUpdate.user_id]
        );

        res.json({ message: "Password has been reset successfully."});
    } catch (error) {
        next(error);
    }
};
