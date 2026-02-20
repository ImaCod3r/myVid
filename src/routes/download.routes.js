import { Router } from "express";
import downloadController from "../controllers/download.controller.js";

const router = Router();

router.get("/info", downloadController.getInfo);
router.post("/info", downloadController.getInfo); // Suporte para API externa via POST

router.get("/download", downloadController.download);
router.post("/download", downloadController.download); // Suporte para API externa via POST

export default router;
