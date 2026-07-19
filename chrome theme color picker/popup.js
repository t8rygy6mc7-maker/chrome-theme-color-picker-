(function () {
  "use strict";

  const T = window.ThemeColor;

  const colorInput = document.getElementById("colorInput");
  const hexInput = document.getElementById("hexInput");
  const previewDot = document.getElementById("previewDot");
  const presetsEl = document.getElementById("presets");
  const randomBtn = document.getElementById("randomBtn");
  const resetBtn = document.getElementById("resetBtn");

  const PRESETS = [
    "#6c5ce7", "#0984e3", "#00b894", "#00cec9",
    "#fdcb6e", "#e17055", "#d63031", "#e84393",
    "#a29bfe", "#74b9ff", "#55efc4", "#81ecec",
    "#ffeaa7", "#fab1a0", "#ff7675", "#fd79a8",
    "#2d3436", "#636e72", "#b2bec3", "#dfe6e9",
    "#1abc9c", "#9b59b6", "#34495e", "#f39c12",
  ];

  // Reflect a color across the whole popup UI.
  function reflect(hex) {
    const c = T.normalizeHex(hex) || T.DEFAULT_COLOR;
    document.documentElement.style.setProperty("--accent", c);
    document.documentElement.style.setProperty("--accent-contrast", T.contrastColor(c));
    previewDot.style.background = c;
    colorInput.value = c;
    hexInput.value = c.slice(1);
    document.querySelectorAll(".preset").forEach((el) => {
      el.classList.toggle("active", el.dataset.color === c);
    });
  }

  // Apply + persist a color.
  function apply(hex) {
    const c = T.setStoredColor(hex);
    reflect(c);
  }

  function buildPresets() {
    PRESETS.forEach((color) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset";
      btn.style.background = color;
      btn.dataset.color = color;
      btn.title = color;
      btn.addEventListener("click", () => apply(color));
      presetsEl.appendChild(btn);
    });
  }

  // --- Event wiring ---

  colorInput.addEventListener("input", (e) => apply(e.target.value));

  hexInput.addEventListener("input", (e) => {
    const normalized = T.normalizeHex(e.target.value);
    if (normalized) apply(normalized);
  });

  hexInput.addEventListener("blur", () => {
    // Snap an invalid hex back to the current stored value.
    T.getStoredColor().then(reflect);
  });

  randomBtn.addEventListener("click", () => {
    const rnd = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    apply(rnd);
  });

  resetBtn.addEventListener("click", () => apply(T.DEFAULT_COLOR));

  // --- Init ---
  buildPresets();
  T.getStoredColor().then(reflect);
  T.getSettings().then((s) => T.applyUiTheme(s.uiTheme)); // follow the light/dark setting
})();
