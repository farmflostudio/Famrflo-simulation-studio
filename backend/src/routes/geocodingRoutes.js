import { Router } from "express";
import { query } from "express-validator";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reverse, search } from "../controllers/geocodingController.js";

const router = Router();

router.use(requireAuth);

// Nominatim's fair use policy caps at roughly 1 request/second overall; this keeps any
// single user well within that even while typing.
const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
  message: { error: "Too many location searches, please slow down" },
});

router.get(
  "/search",
  geocodeLimiter,
  [query("q").trim().notEmpty().withMessage("A search query is required").isLength({ max: 200 })],
  validate,
  search
);

router.get(
  "/reverse",
  geocodeLimiter,
  [
    query("lat").isFloat({ min: -90, max: 90 }).withMessage("A valid latitude is required"),
    query("lon").isFloat({ min: -180, max: 180 }).withMessage("A valid longitude is required"),
  ],
  validate,
  reverse
);

export default router;
