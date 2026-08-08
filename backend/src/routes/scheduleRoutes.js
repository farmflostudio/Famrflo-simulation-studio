import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createSchedule, listSchedules } from "../controllers/scheduleController.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

// Each schedule generation runs the optimisation engine, calls the weather forecast API, and
// calls the language model for the explanation - tighter than the global API limit since it's
// meaningfully more expensive per request.
const scheduleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
  message: { error: "Too many schedule requests, please try again later" },
});

const scheduleRules = [body("horizonDays").optional().isInt({ min: 1, max: 14 })];

router.post("/", scheduleLimiter, scheduleRules, validate, createSchedule);
router.get("/", listSchedules);

export default router;
