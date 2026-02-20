import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import downloadRoutes from "./routes/download.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, "../public")));

// Routes
app.use("/api", downloadRoutes);

export default app;