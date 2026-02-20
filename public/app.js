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
    ? `<ion-icon name="sync-outline" class="animate-spin text-lg"></ion-icon> Carregando...`
    : `<ion-icon name="search-outline" class="text-lg"></ion-icon> Carregar informações`;
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

// ─── Custom Dropdowns ──────────────────────────────────────────────────────────

function initCustomDropdown(dropdownId, onChange) {
  const container = document.getElementById(dropdownId);
  if (!container) return;

  const selected = container.querySelector(".custom-dropdown-selected");
  const optionsContainer = container.querySelector(".custom-dropdown-options");
  const hiddenInput = container.querySelector("input[type='hidden']");
  const selectedText = container.querySelector(".selected-text");

  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    // Fecha outros dropdowns
    document.querySelectorAll(".custom-dropdown").forEach((d) => {
      if (d !== container) d.classList.remove("active");
    });
    container.classList.toggle("active");
  });

  optionsContainer.addEventListener("click", (e) => {
    const option = e.target.closest(".custom-dropdown-option");
    if (!option) return;

    const value = option.dataset.value;
    const text = option.textContent;

    hiddenInput.value = value;
    selectedText.textContent = text;

    container
      .querySelectorAll(".custom-dropdown-option")
      .forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");

    container.classList.remove("active");
    if (onChange) onChange(value);
  });
}

// Fecha dropdowns ao clicar fora
document.addEventListener("click", () => {
  document
    .querySelectorAll(".custom-dropdown")
    .forEach((d) => d.classList.remove("active"));
});

initCustomDropdown("dropdown-format", (val) => {
  if (!currentInfo) return;
  populateQualities(currentInfo.videoFormats, currentInfo.audioFormats, val);
});
initCustomDropdown("dropdown-quality");

function populateQualities(videoFormats, audioFormats, selectedFormat) {
  const container = document.getElementById("dropdown-quality");
  const optionsContainer = container.querySelector(".custom-dropdown-options");
  const selectedText = container.querySelector(".selected-text");
  const hiddenInput = container.querySelector("input[type='hidden']");

  optionsContainer.innerHTML = "";

  if (selectedFormat === "audio") {
    qualityWrapper.style.opacity = "0.4";
    qualityWrapper.style.pointerEvents = "none";
    hiddenInput.value = "best";
    selectedText.textContent = "Melhor qualidade (automático)";
    return;
  }

  // Formato vídeo
  qualityWrapper.style.opacity = "1";
  qualityWrapper.style.pointerEvents = "auto";

  if (videoFormats.length === 0) {
    qualityWrapper.style.opacity = "0.4";
    qualityWrapper.style.pointerEvents = "none";
    hiddenInput.value = "";
    selectedText.textContent = "— Nenhuma resolução disponível —";
    return;
  }

  videoFormats.forEach((f, idx) => {
    const div = document.createElement("div");
    div.className = "custom-dropdown-option";
    if (idx === 0) {
      div.classList.add("selected");
      hiddenInput.value = f.height;
      selectedText.textContent = f.label;
    }
    div.dataset.value = f.height;
    div.textContent = f.label;
    optionsContainer.appendChild(div);
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
