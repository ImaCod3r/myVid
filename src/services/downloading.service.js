import YTDlpWrapModule from "yt-dlp-wrap";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { filterFormats, parseDuration } from "../utils/youtube.utils.js";

const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;
const ytDlpWrap = new YTDlpWrap();

class DownloadingService {
  constructor() {
    this.cookiesPath = path.resolve("cookies.txt");
    this.ffmpegPath = this.resolveFfmpegPath();
  }

  resolveFfmpegPath() {
    try {
      // Tenta usar o ffmpeg do sistema primeiro (mais estável em VPS Linux)
      execSync("ffmpeg -version", { stdio: "ignore" });
      console.log("🛠️ Usando FFmpeg do sistema");
      return "ffmpeg";
    } catch (e) {
      // Fallback para o binário estático do pacote
      console.log("📦 Usando FFmpeg estático");
      return ffmpegStatic;
    }
  }

  async init() {
    try {
      await ytDlpWrap.getVersion();
    } catch {
      console.log("📥 Baixando yt-dlp...");
      await YTDlpWrap.downloadFromGithub();
    }
  }

  getCommonArgs() {
    const args = ["--js-runtimes", "node"];
    if (fs.existsSync(this.cookiesPath)) {
      args.push("--cookies", this.cookiesPath);
    }
    return args;
  }

  async getVideoInfo(url) {
    // Passamos os argumentos como array para ter controle total
    const args = [...this.getCommonArgs(), url, "--dump-json", "--no-playlist"];
    const metadata = await ytDlpWrap.getVideoInfo(args);
    const { videoFormats, audioFormats } = filterFormats(
      metadata.formats || [],
    );

    return {
      title: metadata.title || "Sem título",
      thumbnail: metadata.thumbnail || null,
      duration: parseDuration(metadata.duration),
      durationSeconds: metadata.duration || 0,
      uploader: metadata.uploader || metadata.channel || "",
      videoFormats,
      audioFormats,
    };
  }

  getDownloadStream(url, format, quality) {
    let ytdlpArgs = [
      ...this.getCommonArgs(),
      "--ffmpeg-location",
      this.ffmpegPath,
      "--no-playlist",
    ];
    let ext = "mp4";
    let mimeType = "video/mp4";

    if (format === "audio") {
      // Forçamos a conversão para MP3 real para garantir compatibilidade universal
      ytdlpArgs.push(
        "-f",
        "bestaudio/best",
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "-o",
        "-",
        url,
      );
      ext = "mp3";
      mimeType = "audio/mpeg";
    } else {
      const height = parseInt(quality, 10) || 720;
      // Forçamos H.264 (avc1) e AAC (mp4a) que são os codecs mais compatíveis com Windows/Mac
      ytdlpArgs.push(
        "-f",
        `bestvideo[vcodec^=avc1][height<=${height}]+bestaudio[acodec^=mp4a]/best[vcodec^=avc1][height<=${height}]/best`,
        "--merge-output-format",
        "mp4",
        // Parâmetros cruciais para permitir o streaming de MP4 via pipe (stdout)
        "--postprocessor-args",
        "ffmpeg:-movflags frag_keyframe+empty_moov+default_base_moof",
        "-o",
        "-",
        url,
      );
      ext = "mp4";
      mimeType = "video/mp4";
    }

    const downloadStream = ytDlpWrap.execStream(ytdlpArgs);
    const filename = `myvid_${Date.now()}.${ext}`;

    return { downloadStream, filename, mimeType };
  }
}

export default new DownloadingService();
