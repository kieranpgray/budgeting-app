const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../../config/db');
const { AppError } = require('../middleware/errorHandler');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Environment variables for Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback';
const JWT_SECRET = process.env.JWT_SECRET;

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists in database
      const userResult = await db.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      
      if (userResult.rows.length > 0) {
        // User exists, return user
        return done(null, userResult.rows[0]);
      } else {
        // User doesn't exist, check if email is already used
        if (profile.emails && profile.emails.length > 0) {
          const email = profile.emails[0].value;
          const emailCheckResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
          
          if (emailCheckResult.rows.length > 0) {
            // Email already in use, link Google account to existing user
            const existingUser = emailCheckResult.rows[0];
            await db.query(
              'UPDATE users SET google_id = $1 WHERE user_id = $2',
              [profile.id, existingUser.user_id]
            );
            return done(null, existingUser);
          } else {
            // Create new user
            const newUser = await db.query(
              'INSERT INTO users (email, google_id, display_name) VALUES ($1, $2, $3) RETURNING *',
              [email, profile.id, profile.displayName || email.split('@')[0]]
            );
            return done(null, newUser.rows[0]);
          }
        } else {
          // No email provided by Google (rare)
          return done(new AppError('No email provided by Google', 400));
        }
      }
    } catch (error) {
      return done(error);
    }
  }
));

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const userResult = await db.query('SELECT * FROM users WHERE user_id = $1', [id]);
    if (userResult.rows.length === 0) {
      return done(new AppError('User not found', 404));
    }
    done(null, userResult.rows[0]);
  } catch (error) {
    done(error);
  }
});

// Google auth controller methods
exports.googleAuth = passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false
});

exports.googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(new AppError('Authentication failed', 401));
    }
    
    // Generate JWT token
    const token = jwt.sign({ userId: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    
    // Redirect to frontend with token
    // In production, consider more secure token transfer methods
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/social-callback?token=${token}`);
  })(req, res, next);
};
