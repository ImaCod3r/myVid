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
      ytdlpArgs.push("-f", "bestaudio/best", "-o", "-", url);
      ext = "m4a";
      mimeType = "audio/mp4";
    } else {
      const height = parseInt(quality, 10) || 720;
      ytdlpArgs.push(
        "-f",
        `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}]`,
        "--merge-output-format",
        "mp4",
        "--postprocessor-args",
        `ffmpeg:-movflags frag_keyframe+empty_moov+default_base_moof`,
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
