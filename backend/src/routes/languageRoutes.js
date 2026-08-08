import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { configureFromDescription } from "../controllers/languageController.js";

const router = Router();

router.use(requireAuth);

const languageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
  message: { error: "Too many description requests, please try again later" },
});

const configureRules = [
  body("description").trim().notEmpty().withMessage("A farm description is required").isLength({ max: 1000 }),
];

router.post("/configure-from-description", languageLimiter, configureRules, validate, configureFromDescription);

export default router;
