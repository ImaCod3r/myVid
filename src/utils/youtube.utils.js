export function parseDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function filterFormats(rawFormats = []) {
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
