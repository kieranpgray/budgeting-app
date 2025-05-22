const passport = require("passport");
const AppleStrategy = require("passport-apple");
const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Environment variables for Apple OAuth
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH;
const APPLE_CALLBACK_URL = process.env.APPLE_CALLBACK_URL || "http://localhost:5001/api/auth/apple/callback";
const JWT_SECRET = process.env.JWT_SECRET;

let privateKeyContent = null;
const fs = require("fs");
try {
    privateKeyContent = fs.readFileSync(APPLE_PRIVATE_KEY_PATH, "utf8");
} catch (err) {
    console.error("Error reading Apple private key file:", err.message);
    console.warn("Apple Sign In will not function without a valid private key.");
    // Depending on strictness, you might throw an error here or allow the app to start with Apple Sign In disabled.
}

if (privateKeyContent) {
    passport.use(new AppleStrategy({
        clientID: APPLE_CLIENT_ID,
        teamID: APPLE_TEAM_ID,
        keyID: APPLE_KEY_ID,
        privateKeyString: privateKeyContent, // Use the content of the key file
        callbackURL: APPLE_CALLBACK_URL,
        passReqToCallback: true,
        scope: ["name", "email"] // Request name and email
    },
    async (req, accessToken, refreshToken, idToken, profile, done) => {
        try {
            // `profile` from passport-apple might be undefined or an empty object.
            // The actual user data (like email and name) comes from the decoded idToken.
            const decodedIdToken = jwt.decode(idToken);
            const appleUserId = decodedIdToken.sub; // User's unique Apple ID
            const email = decodedIdToken.email;
            const emailVerified = decodedIdToken.email_verified === "true";

            // Note: Apple only provides user's name and email on the *first* authentication.
            // You need to handle the `user` object passed in the POST body for subsequent logins if you need name.
            // For simplicity, we'll rely on the email from idToken.

            if (!appleUserId) {
                return done(new AppError("Apple Sign In failed: No user ID provided.", 400));
            }
            if (!email || !emailVerified) {
                // Handle cases where email is not provided or not verified, as per your app's policy
                // You might prompt the user to enter an email or deny login.
                console.warn(`Apple Sign In: Email not provided or not verified for user ${appleUserId}`);
                // For now, we'll proceed if email is present, but you might require verification.
                if (!email) return done(new AppError("Apple Sign In failed: No email provided.", 400));
            }

            const userResult = await db.query("SELECT * FROM users WHERE apple_id = $1", [appleUserId]);

            if (userResult.rows.length > 0) {
                return done(null, userResult.rows[0]);
            } else {
                // User doesn't exist with this Apple ID, check if email is already used
                const emailCheckResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
                if (emailCheckResult.rows.length > 0) {
                    const existingUser = emailCheckResult.rows[0];
                    await db.query(
                        "UPDATE users SET apple_id = $1 WHERE user_id = $2",
                        [appleUserId, existingUser.user_id]
                    );
                    return done(null, existingUser);
                } else {
                    // Create new user
                    // Name might not be available here directly, Apple sends it in a separate `user` POST field on first auth.
                    // You might need to store it temporarily if user object is passed in req.body from Apple.
                    const displayName = email.split("@")[0]; // Fallback display name
                    const newUser = await db.query(
                        "INSERT INTO users (email, apple_id, display_name) VALUES ($1, $2, $3) RETURNING *",
                        [email, appleUserId, displayName]
                    );
                    return done(null, newUser.rows[0]);
                }
            }
        } catch (error) {
            return done(error);
        }
    }));
}

// Apple auth controller methods
exports.appleAuth = (req, res, next) => {
    if (!privateKeyContent) {
        return next(new AppError("Apple Sign In is not configured correctly (missing private key).", 500));
    }
    passport.authenticate("apple", { session: false })(req, res, next);
};

exports.appleCallback = (req, res, next) => {
    if (!privateKeyContent) {
        return next(new AppError("Apple Sign In is not configured correctly (missing private key).", 500));
    }
    passport.authenticate("apple", { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            // `info` might contain more details from Apple about the failure
            console.error("Apple authentication failed:", info);
            return next(new AppError(info && info.message ? info.message : "Apple authentication failed", 401));
        }

        const token = jwt.sign({ userId: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
        res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/social-callback?token=${token}`);
    })(req, res, next);
};
