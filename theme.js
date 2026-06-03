// Shared color, settings, and storage helpers used by the popup and new tab page.
(function (global) {
  "use strict";

  const STORAGE_KEY = "themeColor";   // sync: the theme color (small, kept separate)
  const SETTINGS_KEY = "newtabSettings"; // sync: everything else small
  const BG_KEY = "bgImage";            // local: the uploaded background (large)
  const DEFAULT_COLOR = "#6c5ce7";

  const DEFAULT_SETTINGS = {
    bgType: "gradient", // "gradient" | "image"
    bgWallpaper: "", // remote wallpaper URL (takes precedence over an upload when set)
    bgDim: 35, // 0-80, overlay darkness for image backgrounds
    bgMotion: "parallax", // none | aurora | kenburns | drift | pan | parallax
    bgTexture: "dots", // none | dots | grid | lines | noise (color gradient only)
    showSearch: true,
    searchEngine: "google",
    searchPlaceholder: "", // "" => auto from engine
    showClock: true,
    clockStyle: "digital", // digital | analog | flip | binary | word
    hour24: false,
    showSeconds: false,
    showGreeting: true,
    greetingName: "",
    customGreeting: "", // overrides the default "Good morning"; supports {name}
    shortcuts: [], // [{ name, url }]
  };

  const ENGINES = {
    google: { name: "Google", url: "https://www.google.com/search?q=" },
    bing: { name: "Bing", url: "https://www.bing.com/search?q=" },
    duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
  };

  // ---------- color helpers ----------

  // Accepts "#abc", "abc", "#aabbcc", "aabbcc" -> returns "#aabbcc" or null.
  function normalizeHex(input) {
    if (typeof input !== "string") return null;
    let h = input.trim().replace(/^#/, "").toLowerCase();
    if (/^[0-9a-f]{3}$/.test(h)) {
      h = h.split("").map((c) => c + c).join("");
    }
    if (/^[0-9a-f]{6}$/.test(h)) return "#" + h;
    return null;
  }

  function hexToRgb(hex) {
    const h = normalizeHex(hex) || DEFAULT_COLOR;
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16),
    };
  }

  function clamp(n) {
    return Math.max(0, Math.min(255, Math.round(n)));
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
  }

  // amount in [-1, 1]: positive lightens toward white, negative darkens toward black.
  function shade(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const t = amount < 0 ? 0 : 255;
    const p = Math.abs(amount);
    return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
  }

  // WCAG relative luminance, used to choose readable text color.
  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }

  function contrastColor(hex) {
    return luminance(hex) > 0.5 ? "#16161a" : "#ffffff";
  }

  // ---------- theme color storage (sync) ----------

  function getStoredColor() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_COLOR }, (res) => {
          resolve(normalizeHex(res[STORAGE_KEY]) || DEFAULT_COLOR);
        });
      } catch (e) {
        resolve(DEFAULT_COLOR);
      }
    });
  }

  function setStoredColor(hex) {
    const value = normalizeHex(hex) || DEFAULT_COLOR;
    try {
      chrome.storage.sync.set({ [STORAGE_KEY]: value });
    } catch (e) {
      /* storage unavailable (e.g. opened outside extension) */
    }
    return value;
  }

  // ---------- settings storage (sync) ----------

  function getSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ [SETTINGS_KEY]: {} }, (res) => {
          resolve(Object.assign({}, DEFAULT_SETTINGS, res[SETTINGS_KEY] || {}));
        });
      } catch (e) {
        resolve(Object.assign({}, DEFAULT_SETTINGS));
      }
    });
  }

  // Merge `partial` into the stored settings and persist. Resolves with the merged object.
  function saveSettings(partial) {
    return getSettings().then((current) => {
      const next = Object.assign({}, current, partial);
      return new Promise((resolve) => {
        try {
          chrome.storage.sync.set({ [SETTINGS_KEY]: next }, () => resolve(next));
        } catch (e) {
          resolve(next);
        }
      });
    });
  }

  // ---------- background image storage (local, can be large) ----------

  function getBackground() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get({ [BG_KEY]: null }, (res) => resolve(res[BG_KEY] || null));
      } catch (e) {
        resolve(null);
      }
    });
  }

  function setBackground(dataUrl) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ [BG_KEY]: dataUrl }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  function clearBackground() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.remove(BG_KEY, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  // ---------- change notifications ----------

  // Calls back with the new color whenever it changes (kept for the popup).
  function onColorChange(callback) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if ((area === "sync" || area === "local") && changes[STORAGE_KEY]) {
          callback(normalizeHex(changes[STORAGE_KEY].newValue) || DEFAULT_COLOR);
        }
      });
    } catch (e) {
      /* no-op */
    }
  }

  // Fires whenever the color, settings, or background change anywhere.
  function onAnyChange(callback) {
    try {
      chrome.storage.onChanged.addListener((changes) => {
        if (changes[STORAGE_KEY] || changes[SETTINGS_KEY] || changes[BG_KEY]) {
          callback(changes);
        }
      });
    } catch (e) {
      /* no-op */
    }
  }

  global.ThemeColor = {
    STORAGE_KEY,
    SETTINGS_KEY,
    BG_KEY,
    DEFAULT_COLOR,
    DEFAULT_SETTINGS,
    ENGINES,
    normalizeHex,
    hexToRgb,
    shade,
    luminance,
    contrastColor,
    getStoredColor,
    setStoredColor,
    getSettings,
    saveSettings,
    getBackground,
    setBackground,
    clearBackground,
    onColorChange,
    onAnyChange,
  };
})(window);
