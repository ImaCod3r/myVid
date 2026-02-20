import { Router } from "express";
import downloadController from "../controllers/download.controller.js";

const router = Router();

router.get("/info", downloadController.getInfo);
router.get("/download", downloadController.download);

export default router;
