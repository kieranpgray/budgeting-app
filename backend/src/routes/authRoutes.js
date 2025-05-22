const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const googleAuthController = require("../controllers/googleAuthController");
const appleAuthController = require("../controllers/appleAuthController");
const facebookAuthController = require("../controllers/facebookAuthController"); // Import Facebook Auth Controller

// Standard Authentication Routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/2fa-verify", authController.verifyTwoFactor);
router.post("/request-password-reset", authController.requestPasswordReset);
router.post("/reset-password/:token", authController.resetPassword);

// Google OAuth Routes
router.get("/google", googleAuthController.googleAuth);
router.get("/google/callback", googleAuthController.googleCallback);

// Apple OAuth Routes
router.post("/apple", appleAuthController.appleAuth);
router.post("/apple/callback", appleAuthController.appleCallback);

// Facebook OAuth Routes
router.get("/facebook", facebookAuthController.facebookAuth); // Initiates Facebook OAuth flow
router.get("/facebook/callback", facebookAuthController.facebookCallback); // Facebook OAuth callback URL

module.exports = router;
