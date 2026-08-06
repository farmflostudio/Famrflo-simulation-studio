import { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createFarm, deleteFarm, getFarm, listFarms, updateFarm } from "../controllers/farmController.js";

const router = Router();

router.use(requireAuth);

const farmRules = [
  body("name").trim().notEmpty().withMessage("Farm name is required"),
  body("location.latitude").isFloat({ min: -90, max: 90 }).withMessage("A valid latitude is required"),
  body("location.longitude").isFloat({ min: -180, max: 180 }).withMessage("A valid longitude is required"),
  body("soilType").trim().notEmpty().withMessage("Soil type is required"),
  body("landCover").trim().notEmpty().withMessage("Land cover is required"),
  body("areaHectares").optional().isFloat({ min: 0 }),
];

router.post("/", farmRules, validate, createFarm);
router.get("/", listFarms);
router.get("/:id", getFarm);
router.put("/:id", farmRules, validate, updateFarm);
router.delete("/:id", deleteFarm);

export default router;
