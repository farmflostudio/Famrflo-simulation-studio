import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { register, login, logout, me } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
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

export default router;
