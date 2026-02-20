import express from "express";
import YTDlpWrapModule from "yt-dlp-wrap";
import ffmpeg from "ffmpeg-static";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializa o downloader
const ytDlpWrap = new YTDlpWrap();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function filterFormats(rawFormats = []) {
  const VIDEO_HEIGHTS = [2160, 1440, 1080, 720, 480, 360, 240, 144];

  const availableHeights = new Set(
    rawFormats
      .filter((f) => f.vcodec && f.vcodec !== "none" && f.height)
      .map((f) => f.height),
  );

  const videoFormats = VIDEO_HEIGHTS.filter((h) => availableHeights.has(h)).map(
    (h) => ({ id: `video_${h}`, label: `${h}p`, type: "video", height: h }),
  );

  const hasAudio = rawFormats.some((f) => f.acodec && f.acodec !== "none");
  const audioFormats = hasAudio
    ? [{ id: "audio_best", label: "Melhor qualidade (MP3)", type: "audio" }]
    : [];

  return { videoFormats, audioFormats };
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// ─── GET /api/info ─────────────────────────────────────────────────────────────

app.get("/api/info", async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith("http"))
    return res.status(400).json({ error: "URL inválida." });

  try {
    const metadata = await ytDlpWrap.getVideoInfo(url);
    const { videoFormats, audioFormats } = filterFormats(
      metadata.formats || [],
    );

    return res.json({
      title: metadata.title || "Sem título",
      thumbnail: metadata.thumbnail || null,
      duration: parseDuration(metadata.duration),
      durationSeconds: metadata.duration || 0,
      uploader: metadata.uploader || metadata.channel || "",
      videoFormats,
      audioFormats,
    });
  } catch (err) {
    console.error("[/api/info] Erro:", err.message);
    return res.status(500).json({ error: "Erro ao obter info." });
  }
});

// ─── GET /api/download ────────────────────────────────────────────────────────
// Mudamos para GET para permitir download nativo via browser (sem carregar blob em RAM)
app.get("/api/download", (req, res) => {
  const { url, format, quality } = req.query;
  if (!url) return res.status(400).json({ error: "URL faltando." });

  let ytdlpArgs = ["--ffmpeg-location", ffmpeg, "--no-playlist"];
  let ext = "mp4";
  let mimeType = "video/mp4";

  if (format === "audio") {
    ytdlpArgs.push(
      "-f",
      "bestaudio/best",
      // Removemos o -x e --audio-format mp3 pois o re-encoding via stdout
      // para MP3 as vezes corrompe o header. Vamos baixar o formato nativo (geralmente m4a/webm)
      // mas dizer ao browser que é audio.
      "-o",
      "-",
      url,
    );
    ext = "m4a"; // m4a é mais seguro para streams do que mp3 fixo
    mimeType = "audio/mp4";
  } else {
    const height = parseInt(quality, 10) || 720;
    ytdlpArgs.push(
      "-f",
      `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}]`,
      "--merge-output-format",
      "mp4",
      // CRÍTICO: Força o ffmpeg a colocar o moov atom no início para permitir reprodução via stream
      "--postprocessor-args",
      `ffmpeg:-movflags frag_keyframe+empty_moov+default_base_moof`,
      "-o",
      "-",
      url,
    );
    ext = "mp4";
    mimeType = "video/mp4";
  }

  const filename = `myvid_${Date.now()}.${ext}`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", mimeType);

  console.log(`🎬 Iniciando download: ${url}`);

  // Usa execStream para obter um Readable Stream diretamente
  const downloadStream = ytDlpWrap.execStream(ytdlpArgs);

  // Pipe direto para a resposta
  downloadStream.pipe(res);

  downloadStream.on("error", (err) => {
    console.error("❌ Erro no download:", err.message);
    if (!res.headersSent) res.status(500).end();
  });

  downloadStream.on("close", () => {
    console.log("✅ Stream finalizada.");
  });

  // Se o cliente cancelar o request, pare o download
  res.on("close", () => {
    if (!res.writableEnded && downloadStream.ytDlpProcess) {
      console.log("🛑 Conexão fechada prematuramente pelo cliente.");
      downloadStream.ytDlpProcess.kill();
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function init() {
  console.log("🔍 Checando yt-dlp...");
  try {
    await ytDlpWrap.getVersion();
  } catch {
    console.log("📥 Baixando yt-dlp...");
    await YTDlpWrap.downloadFromGithub();
  }

  app.listen(PORT, () => console.log(`🚀 myVid ON: http://localhost:${PORT}`));
}

init();
