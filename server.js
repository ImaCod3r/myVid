import app from "./src/app.js";
import downloadingService from "./src/services/downloading.service.js";

const PORT = process.env.PORT || 3000;

async function start() {
  console.log("🔍 Inicializando serviços...");

  // Inicializa o yt-dlp antes de subir o servidor
  await downloadingService.init();

  app.listen(PORT, () => {
    console.log(`🚀 myVid ON: http://localhost:${PORT}`);
  });
}

start();
