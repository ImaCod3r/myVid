import downloadingService from "../services/downloading.service.js";

class DownloadController {
  async getInfo(req, res) {
    const { url } = req.query;
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "URL inválida." });
    }

    try {
      const info = await downloadingService.getVideoInfo(url);
      return res.json(info);
    } catch (err) {
      console.error("[/api/info] Erro:", err.message);
      return res.status(500).json({ error: "Erro ao obter info." });
    }
  }

  download(req, res) {
    const { url, format, quality } = req.query;
    if (!url) return res.status(400).json({ error: "URL faltando." });

    try {
      const { downloadStream, filename, mimeType } =
        downloadingService.getDownloadStream(url, format, quality);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Type", mimeType);

      console.log(`🎬 Iniciando download: ${url}`);

      downloadStream.pipe(res);

      downloadStream.on("error", (err) => {
        console.error("❌ Erro no download:", err.message);
        if (!res.headersSent) res.status(500).end();
      });

      downloadStream.on("close", () => {
        console.log("✅ Stream finalizada.");
      });

      res.on("close", () => {
        if (!res.writableEnded && downloadStream.ytDlpProcess) {
          console.log("🛑 Conexão fechada prematuramente pelo cliente.");
          downloadStream.ytDlpProcess.kill();
        }
      });
    } catch (err) {
      console.error("❌ Erro ao iniciar stream:", err.message);
      return res.status(500).json({ error: "Erro ao iniciar download." });
    }
  }
}

export default new DownloadController();
