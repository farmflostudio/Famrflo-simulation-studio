import { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createPrediction, listPredictions } from "../controllers/predictionController.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

const predictionRules = [body("targetDate").optional().isISO8601()];

router.post("/", predictionRules, validate, createPrediction);
router.get("/", listPredictions);

export default router;
