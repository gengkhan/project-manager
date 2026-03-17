const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const auth = require("../middlewares/auth");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.post("/logout", auth, authController.logout);
router.post("/refresh", authController.refresh); // Menggunakan refreshToken cookie
router.get("/me", auth, authController.getMe);

module.exports = router;
