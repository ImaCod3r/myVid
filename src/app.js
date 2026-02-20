import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import downloadRoutes from "./routes/download.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Rate Limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 requisições por janela
  message: {
    error: "Muitas requisições vindas deste IP. Tente novamente em 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false, 
});

// Middleware
app.use(cors());
app.use(limiter); 
app.use(express.json());
app.use(express.static(join(__dirname, "../public")));

// Routes
app.use("/api", downloadRoutes);

export default app;
