import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listModels } from "../controllers/modelController.js";

const router = Router();

router.use(requireAuth);
router.get("/", listModels);

export default router;
