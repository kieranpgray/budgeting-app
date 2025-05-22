const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const db = require("../../config/db");
const { AppError } = require("../middleware/errorHandler");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Environment variables for Facebook OAuth
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL || "http://localhost:5001/api/auth/facebook/callback";
const JWT_SECRET = process.env.JWT_SECRET;

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: FACEBOOK_CALLBACK_URL,
    profileFields: ["id", "displayName", "emails", "name"], // Request these fields
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      if (!profile.emails || profile.emails.length === 0) {
        // Facebook might not return email if user hasn't verified it or has privacy settings
        // You need to handle this case, e.g., by prompting user to enter email manually
        return done(new AppError("Facebook did not provide an email address. Please ensure your email is verified on Facebook or try another login method.", 400));
      }
      const email = profile.emails[0].value;
      const facebookId = profile.id;
      const displayName = profile.displayName || `${profile.name.givenName} ${profile.name.familyName}` || email.split("@")[0];

      const userResult = await db.query("SELECT * FROM users WHERE facebook_id = $1", [facebookId]);

      if (userResult.rows.length > 0) {
        return done(null, userResult.rows[0]);
      } else {
        const emailCheckResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (emailCheckResult.rows.length > 0) {
          const existingUser = emailCheckResult.rows[0];
          await db.query(
            "UPDATE users SET facebook_id = $1 WHERE user_id = $2",
            [facebookId, existingUser.user_id]
          );
          return done(null, existingUser);
        } else {
          const newUser = await db.query(
            "INSERT INTO users (email, facebook_id, display_name) VALUES ($1, $2, $3) RETURNING *",
            [email, facebookId, displayName]
          );
          return done(null, newUser.rows[0]);
        }
      }
    } catch (error) {
      return done(error);
    }
  }
));

// Facebook auth controller methods
exports.facebookAuth = passport.authenticate("facebook", { scope: ["email", "public_profile"] });

exports.facebookCallback = (req, res, next) => {
  passport.authenticate("facebook", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      console.error("Facebook authentication failed:", info);
      return next(new AppError(info && info.message ? info.message : "Facebook authentication failed", 401));
    }

    const token = jwt.sign({ userId: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/social-callback?token=${token}`);
  })(req, res, next);
};
