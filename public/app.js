// public/app.js — ES Module
// Lógica do frontend do myVid

// ─── Elementos do DOM ─────────────────────────────────────────────────────────
const infoForm = document.getElementById("info-form");
const urlInput = document.getElementById("url-input");
const formatSelect = document.getElementById("format-select");
const qualitySelect = document.getElementById("quality-select");
const qualityWrapper = document.getElementById("quality-wrapper");
const infoBtn = document.getElementById("info-btn");
const previewCard = document.getElementById("preview-card");
const thumbImg = document.getElementById("thumb-img");
const thumbTitle = document.getElementById("thumb-title");
const thumbUploader = document.getElementById("thumb-uploader");
const thumbDuration = document.getElementById("thumb-duration");
const downloadBtn = document.getElementById("download-btn");
const downloadBtnText = document.getElementById("download-btn-text");
const progressWrapper = document.getElementById("progress-wrapper");
const progressLabel = document.getElementById("progress-label");
const errorBanner = document.getElementById("error-banner");
const errorText = document.getElementById("error-text");

// ─── Estado ───────────────────────────────────────────────────────────────────
let currentInfo = null; // dados retornados por /api/info

// ─── Utilitários ──────────────────────────────────────────────────────────────

function showError(msg) {
  errorText.textContent = msg;
  errorBanner.classList.remove("hidden");
  errorBanner.classList.add("flex");
}

function hideError() {
  errorBanner.classList.add("hidden");
  errorBanner.classList.remove("flex");
}

function setInfoLoading(loading) {
  infoBtn.disabled = loading;
  infoBtn.innerHTML = loading
    ? `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
         <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
         <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
       </svg> Carregando...`
    : `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
         <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
       </svg> Carregar informações`;
}

function setDownloadLoading(loading) {
  downloadBtn.disabled = loading;
  if (loading) {
    downloadBtnText.textContent = "Baixando...";
    progressWrapper.classList.remove("hidden");
  } else {
    downloadBtnText.textContent = "Baixar";
    progressWrapper.classList.add("hidden");
  }
}

function populateQualities(videoFormats, audioFormats, selectedFormat) {
  qualitySelect.innerHTML = "";

  if (selectedFormat === "audio") {
    qualityWrapper.style.opacity = "0.4";
    qualitySelect.disabled = true;
    const opt = document.createElement("option");
    opt.value = "best";
    opt.textContent = "Melhor qualidade (automático)";
    qualitySelect.appendChild(opt);
    return;
  }

  // Formato vídeo
  qualityWrapper.style.opacity = "1";
  qualitySelect.disabled = false;

  if (videoFormats.length === 0) {
    qualitySelect.disabled = true;
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "— Nenhuma resolução disponível —";
    qualitySelect.appendChild(opt);
    return;
  }

  videoFormats.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.height;
    opt.textContent = f.label;
    qualitySelect.appendChild(opt);
  });
}

// ─── Carregar info do vídeo ───────────────────────────────────────────────────

infoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const url = urlInput.value.trim();
  if (!url) {
    showError("Insira uma URL válida do YouTube.");
    return;
  }

  setInfoLoading(true);
  previewCard.classList.remove("visible");
  currentInfo = null;

  try {
    const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Erro ao carregar informações do vídeo.");
      return;
    }

    currentInfo = data;

    // Preencher preview card
    thumbImg.src = data.thumbnail || "";
    thumbImg.style.display = data.thumbnail ? "block" : "none";
    thumbTitle.textContent = data.title;
    thumbUploader.textContent = data.uploader;
    thumbDuration.textContent = data.duration;

    // Preencher qualidades
    populateQualities(data.videoFormats, data.audioFormats, formatSelect.value);

    // Mostrar card
    previewCard.classList.add("visible");
  } catch (err) {
    showError("Erro de rede: não foi possível contactar o servidor.");
    console.error(err);
  } finally {
    setInfoLoading(false);
  }
});

// ─── Atualizar qualidades ao mudar formato ────────────────────────────────────

formatSelect.addEventListener("change", () => {
  if (!currentInfo) return;
  populateQualities(
    currentInfo.videoFormats,
    currentInfo.audioFormats,
    formatSelect.value,
  );
});

// ─── Download via blob/anchor trick ──────────────────────────────────────────

downloadBtn.addEventListener("click", async () => {
  if (!currentInfo) return;

  const url = urlInput.value.trim();
  const format = formatSelect.value; // 'video' | 'audio'
  const quality = qualitySelect.value || "1080"; // altura em px ou 'best'

  setDownloadLoading(true);
  hideError();

  const ext = format === "audio" ? "mp3" : "mp4";
  const safeTitle = currentInfo.title.replace(/[^a-z0-9]/gi, "_").slice(0, 60);
  const filename = `${safeTitle}.${ext}`;

  try {
    progressLabel.textContent = "A contactar o servidor...";

    const urlParam = encodeURIComponent(url);
    const formatParam = encodeURIComponent(format);
    const qualityParam = encodeURIComponent(quality);

    const downloadUrl = `/api/download?url=${urlParam}&format=${formatParam}&quality=${qualityParam}`;

    // Usamos redirecionamento para o link de download.
    // O header Content-Disposition no server vai garantir que o browser baixe o arquivo em vez de sair da página.
    window.location.href = downloadUrl;

    // Como não temos feedback direto do progresso via window.location,
    // apenas mostramos uma mensagem e resetamos após um tempo.
    progressLabel.textContent =
      "O download vai começar agora... Verifique a barra de downloads do seu navegador.";
    setTimeout(() => {
      setDownloadLoading(false);
    }, 5000);
  } catch (err) {
    showError("Erro de rede durante o download. Verifique sua conexão.");
    console.error(err);
  }
});

// ─── Paste automático da área de transferência ───────────────────────────────

document.addEventListener("paste", (e) => {
  const active = document.activeElement;
  // Só cola no input de URL se outro campo não estiver focado
  if (active === urlInput) return;
  const text = e.clipboardData?.getData("text") || "";
  if (text.startsWith("http")) {
    urlInput.value = text;
    urlInput.focus();
  }
});
