import { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createSimulation, listSimulations } from "../controllers/simulationController.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

const simulationRules = [
  body("startDate").isISO8601().withMessage("A valid start date is required"),
  body("endDate").isISO8601().withMessage("A valid end date is required"),
  body("initialVwc").optional().isFloat({ min: 0, max: 100 }),
];

router.post("/", simulationRules, validate, createSimulation);
router.get("/", listSimulations);

export default router;
