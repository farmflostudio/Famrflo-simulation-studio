import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { register, login, logout, me, forgotPassword, resetPassword } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter: triggers a real email send, and could be used to spam someone else's inbox.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests, please try again later" },
});

// More generous: requires already possessing a token, so the abuse surface is much
// smaller, and legitimate retries (mistyped confirmation, validation errors) are common.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset attempts, please try again later" },
});

const emailRule = body("email").isEmail().withMessage("A valid email is required").normalizeEmail();
const passwordRule = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters")
  .matches(/\d/)
  .withMessage("Password must include at least one number")
  .matches(/[A-Za-z]/)
  .withMessage("Password must include at least one letter");

router.post(
  "/register",
  authLimiter,
  [emailRule, passwordRule, body("name").optional().trim().isLength({ max: 80 })],
  validate,
  register
);

router.post(
  "/login",
  authLimiter,
  [emailRule, body("password").notEmpty().withMessage("Password is required")],
  validate,
  login
);

router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

router.post("/forgot-password", forgotPasswordLimiter, [emailRule], validate, forgotPassword);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  [body("token").trim().notEmpty().withMessage("A reset token is required"), passwordRule],
  validate,
  resetPassword
);

export default router;
