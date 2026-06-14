(function () {
  "use strict";

  const T = window.ThemeColor;
  const $ = (id) => document.getElementById(id);

  const PRESETS = [
    "#6c5ce7", "#0984e3", "#00b894", "#00cec9",
    "#fdcb6e", "#e17055", "#d63031", "#e84393",
    "#a29bfe", "#74b9ff", "#55efc4", "#81ecec",
    "#ffeaa7", "#fab1a0", "#ff7675", "#fd79a8",
  ];

  // Home page elements
  const bgLayer = $("bgLayer");
  const bgA = $("bgA");
  const bgB = $("bgB");
  const bgOverlay = $("bgOverlay");
  const clockEl = $("clock");
  const greetingEl = $("greeting");
  const searchForm = $("searchForm");
  const searchInput = $("searchInput");
  const shortcutsEl = $("shortcuts");
  const settingsBtn = $("settingsBtn");

  // Drawer + controls
  const drawer = $("drawer");
  const scrim = $("scrim");
  const colorInput = $("colorInput");
  const hexInput = $("hexInput");
  const presetsEl = $("presets");
  const randomBtn = $("randomBtn");
  const resetBtn = $("resetBtn");
  const bgGradientBtn = $("bgGradientBtn");
  const bgImageBtn = $("bgImageBtn");
  const bgFileInput = $("bgFileInput");
  const bgRemoveBtn = $("bgRemoveBtn");
  const bgPreview = $("bgPreview");
  const bgThumb = $("bgThumb");
  const dimRow = $("dimRow");
  const bgDim = $("bgDim");
  const dimVal = $("dimVal");
  const bgMotionSel = $("bgMotion");
  const bgTextureSel = $("bgTexture");
  const wpTabs = $("wpTabs");
  const wpGrid = $("wpGrid");
  const wpRotateSel = $("wpRotate");
  const uiThemeSeg = $("uiThemeSeg");
  const showSearch = $("showSearch");
  const engineSelect = $("engineSelect");
  const placeholderInput = $("placeholderInput");
  const showClock = $("showClock");
  const clockStyleSel = $("clockStyle");
  const hour24Chk = $("hour24");
  const showSecondsChk = $("showSeconds");
  const showGreeting = $("showGreeting");
  const nameInput = $("nameInput");
  const greetingTextInput = $("greetingText");
  const scList = $("scList");
  const scName = $("scName");
  const scUrl = $("scUrl");
  const scAddBtn = $("scAddBtn");

  // Cached state
  let lastColor = T.DEFAULT_COLOR;
  let lastSettings = Object.assign({}, T.DEFAULT_SETTINGS);
  let lastBg = null;
  let bgLoaded = false;

  // Crossfade state: which of the two .bg-img layers is currently shown.
  let bgFront = bgA;
  let bgBack = bgB;
  let lastBgKey = null;
  let lastBgIsImage = false;

  // Skip re-rendering the shortcut DOM when the list hasn't changed.
  let lastShortcutsKey = null;

  // ---------- utilities ----------

  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function normalizeUrl(u) {
    u = (u || "").trim();
    if (!u) return "#";
    if (/^https?:\/\//i.test(u)) return u;
    return "https://" + u;
  }

  function firstChar(s) {
    const m = (s || "").trim().match(/[a-z0-9]/i);
    return m ? m[0].toUpperCase() : "•";
  }

  function hostOf(url) {
    try {
      return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
    } catch (e) {
      return url;
    }
  }

  // Only allow https:// or data:image/ URLs into a CSS url("...") / <img>, and
  // reject characters that could break out of the string. Defense-in-depth for
  // any value read back from synced storage.
  function safeBgUrl(u) {
    return typeof u === "string" &&
      /^(https:\/\/|data:image\/)/i.test(u) &&
      !/["'()\\\s]/.test(u)
      ? u
      : "";
  }

  // Downscale + compress an uploaded image to keep storage small and loading fast.
  function compressImage(file, maxW, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not load image."));
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- background motion ----------

  const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const MOTIONS = ["aurora", "kenburns", "drift", "pan", "parallax"];

  // On-theme animated gradient (soft drifting blobs) for the Aurora motion.
  function auroraGradient(c) {
    const a1 = T.shade(c, 0.28);
    const a2 = T.shade(c, 0.05);
    const a3 = T.shade(c, -0.18);
    const base = T.shade(c, -0.45);
    return [
      `radial-gradient(45% 55% at 22% 28%, ${a1} 0%, transparent 60%)`,
      `radial-gradient(50% 60% at 80% 24%, ${a2} 0%, transparent 62%)`,
      `radial-gradient(55% 65% at 55% 82%, ${a3} 0%, transparent 65%)`,
      `linear-gradient(${base}, ${base})`,
    ].join(", ");
  }

  // Subtle repeating texture layered onto the gradient so motion has detail to "grab".
  // Returns { image, size, repeat } (each may hold multiple comma-separated sub-layers) or null.
  function textureLayers(name, c) {
    const ink = T.luminance(c) > 0.5 ? "0,0,0" : "255,255,255";
    switch (name) {
      case "dots":
        return {
          image: `radial-gradient(circle, rgba(${ink},0.13) 1.2px, transparent 1.7px)`,
          size: "22px 22px",
          repeat: "repeat",
        };
      case "grid":
        return {
          image:
            `linear-gradient(rgba(${ink},0.08) 1px, transparent 1px), ` +
            `linear-gradient(90deg, rgba(${ink},0.08) 1px, transparent 1px)`,
          size: "32px 32px, 32px 32px",
          repeat: "repeat, repeat",
        };
      case "lines":
        return {
          image: `repeating-linear-gradient(45deg, rgba(${ink},0.07) 0, rgba(${ink},0.07) 1px, transparent 1px, transparent 13px)`,
          size: "auto",
          repeat: "repeat",
        };
      case "noise":
        return {
          image:
            "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
            "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
            "<feColorMatrix type='saturate' values='0'/></filter>" +
            "<rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>\")",
          size: "160px 160px",
          repeat: "repeat",
        };
      default:
        return null;
    }
  }

  // Lightweight mouse parallax: rAF-coalesced writes, with a CSS transition easing the rest.
  const Parallax = {
    enabled: false,
    pending: false,
    lastX: 0,
    lastY: 0,
    max: 14, // px of travel at the screen edge
    scale: 1.06, // headroom so the translate never reveals an edge
    onMove: null,
    apply: null,

    setEnabled(on) {
      if (on === this.enabled) return;
      this.enabled = on;
      if (on) {
        this.lastX = window.innerWidth / 2;
        this.lastY = window.innerHeight / 2;
        bgLayer.style.transform = `translate3d(0,0,0) scale(${this.scale})`;
        this.apply = () => {
          this.pending = false;
          if (!this.enabled) return;
          const nx = (this.lastX / window.innerWidth) * 2 - 1;
          const ny = (this.lastY / window.innerHeight) * 2 - 1;
          bgLayer.style.transform =
            `translate3d(${(-nx * this.max).toFixed(2)}px, ${(-ny * this.max).toFixed(2)}px, 0) scale(${this.scale})`;
        };
        this.onMove = (e) => {
          this.lastX = e.clientX;
          this.lastY = e.clientY;
          if (!this.pending) {
            this.pending = true;
            requestAnimationFrame(this.apply);
          }
        };
        window.addEventListener("mousemove", this.onMove, { passive: true });
      } else {
        if (this.onMove) window.removeEventListener("mousemove", this.onMove);
        this.onMove = null;
        this.apply = null;
        this.pending = false;
        bgLayer.style.transform = "";
      }
    },

    pause() {
      if (this.onMove) window.removeEventListener("mousemove", this.onMove);
    },
    resume() {
      if (this.enabled && this.onMove) {
        window.addEventListener("mousemove", this.onMove, { passive: true });
      }
    },
  };

  function applyMotion(motion) {
    MOTIONS.forEach((m) => bgLayer.classList.remove("motion-" + m));
    const useParallax = motion === "parallax" && !REDUCED;
    if (motion !== "none" && motion !== "parallax") {
      bgLayer.classList.add("motion-" + motion);
    } else if (useParallax) {
      bgLayer.classList.add("motion-parallax");
    }
    Parallax.setEnabled(useParallax);
  }

  // ---------- wallpapers (free Unsplash photos, fetched on demand) ----------

  const WALLPAPERS = {
    landscapes: [
      "1506744038136-46273834b3fb",
      "1470071459604-3b5ec3a7fe05",
      "1501785888041-af3ef285b470",
      "1426604966848-d7adac402bff",
      "1433086966358-54859d0ed716",
    ],
    animals: [
      "1543466835-00a7907e9de1",
      "1518717758536-85ae29035b6d",
      "1574144611937-0df059b5ef3e",
      "1518791841217-8f162f1e1131",
      "1552053831-71594a27632d",
    ],
    tech: [
      "1485827404703-89b55fcc595e",
      "1518770660439-4636190af475",
      "1517336714731-489689fd1ca8",
      "1526374965328-7f61d4dc18c5",
      "1498050108023-c5249f4df085",
    ],
  };

  const wpFull = (id) =>
    `https://images.unsplash.com/photo-${id}?w=1920&q=80&auto=format&fit=crop`;
  const wpThumb = (id) =>
    `https://images.unsplash.com/photo-${id}?w=160&h=100&fit=crop&q=60`;

  let currentWpCat = "landscapes";
  let wpRendered = false;

  function renderWallpaperGrid(cat) {
    currentWpCat = cat;
    wpTabs.querySelectorAll(".wp-tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.cat === cat)
    );
    wpGrid.innerHTML = "";
    (WALLPAPERS[cat] || []).forEach((id) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wp-thumb";
      b.style.backgroundImage = `url("${wpThumb(id)}")`;
      b.dataset.url = wpFull(id);
      b.dataset.cat = cat;
      b.title = "Use this wallpaper";
      b.addEventListener("click", () =>
        setSettings({ bgType: "image", bgWallpaper: b.dataset.url, wpCategory: b.dataset.cat })
      );
      wpGrid.appendChild(b);
    });
    updateWallpaperActive();
  }

  function updateWallpaperActive() {
    const cur = Slideshow.url || lastSettings.bgWallpaper || "";
    wpGrid.querySelectorAll(".wp-thumb").forEach((b) =>
      b.classList.toggle("active", b.dataset.url === cur)
    );
  }

  // Auto-rotate the wallpaper through its category. Per-tab + boundary-aligned,
  // and never writes to storage (so frequent changes don't hit sync quotas).
  const ROTATE_MS = {
    off: 0, "10s": 10000, "5m": 300000, "10m": 600000, "1h": 3600000, "1d": 86400000,
  };

  const Slideshow = {
    sig: "",
    list: [],
    index: 0,
    url: null, // current rotated wallpaper (null = not rotating)
    intervalMs: 0,
    timer: 0,

    configure(settings) {
      const intervalMs = ROTATE_MS[settings.wpRotate] || 0;
      const cat = settings.wpCategory;
      const list = WALLPAPERS[cat] || [];
      const active =
        settings.bgType === "image" && intervalMs > 0 && list.length > 1 && !!settings.bgWallpaper;
      const sig = active ? cat + "|" + intervalMs + "|" + settings.bgWallpaper : "off";
      if (sig === this.sig) return;
      this.sig = sig;
      this.stop();
      if (!active) {
        this.url = null;
        this.intervalMs = 0;
        return;
      }
      this.list = list;
      this.intervalMs = intervalMs;
      const found = list.map(wpFull).indexOf(settings.bgWallpaper);
      this.index = found >= 0 ? found : 0;
      this.url = wpFull(list[this.index]);
      this.schedule();
    },

    schedule() {
      this.stop();
      if (document.hidden || !this.intervalMs) return;
      const delay = this.intervalMs - (Date.now() % this.intervalMs);
      this.timer = setTimeout(() => this.tick(), delay);
    },

    tick() {
      // Preload the next photo, then swap once it's ready so there's no flash.
      const nextIndex = (this.index + 1) % this.list.length;
      const nextUrl = wpFull(this.list[nextIndex]);
      const swap = () => {
        this.index = nextIndex;
        this.url = nextUrl;
        applyAll(lastColor, lastSettings, lastBg);
        this.schedule();
      };
      const img = new Image();
      img.onload = swap;
      img.onerror = swap;
      img.src = nextUrl;
    },

    stop() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = 0;
      }
    },

    pause() {
      this.stop();
    },
    resume() {
      this.schedule();
    },
  };

  // ---------- rendering ----------

  function setLayerContent(el, desc) {
    el.style.backgroundImage = desc.image;
    el.style.backgroundSize = desc.size;
    el.style.backgroundRepeat = desc.repeat;
    el.style.backgroundPosition = "center";
  }

  // Paint the background; crossfade between the two layers when one image
  // replaces another (rotation or a manual pick). Other changes are instant.
  function paintBackground(desc, isImage) {
    const key = desc.image;
    if (key === lastBgKey) return;
    const fade = isImage && lastBgIsImage && lastBgKey !== null;
    if (fade) {
      setLayerContent(bgBack, desc);
      void bgBack.offsetWidth; // reflow so the opacity transition runs
      bgBack.style.opacity = "1";
      bgFront.style.opacity = "0";
      const tmp = bgFront;
      bgFront = bgBack;
      bgBack = tmp;
    } else {
      setLayerContent(bgFront, desc);
      bgFront.style.opacity = "1";
      bgBack.style.opacity = "0";
    }
    lastBgKey = key;
    lastBgIsImage = isImage;
  }

  function applyAll(color, settings, bg) {
    const root = document.documentElement.style;
    const c = T.normalizeHex(color) || T.DEFAULT_COLOR;

    T.applyUiTheme(settings.uiTheme); // light/dark/auto for the Settings panel

    // Accent (buttons, shortcuts, highlights) always follows the chosen color.
    root.setProperty("--accent", c);
    root.setProperty("--accent-light", T.shade(c, 0.22));
    root.setProperty("--accent-dark", T.shade(c, -0.4));

    Slideshow.configure(settings);
    const effImg = safeBgUrl(Slideshow.url || settings.bgWallpaper || bg); // rotation > pick > upload
    const usingImage = settings.bgType === "image" && !!effImg;
    let motion = settings.bgMotion || "none";
    let desc;

    if (usingImage) {
      desc = { image: `url("${effImg}")`, size: "cover", repeat: "no-repeat" };
      bgOverlay.style.opacity = (Math.min(80, Math.max(0, settings.bgDim)) / 100).toString();
      if (motion === "aurora") motion = "none"; // Aurora is a gradient-only effect
    } else if (motion === "aurora") {
      desc = { image: auroraGradient(c), size: "cover", repeat: "no-repeat" };
      bgOverlay.style.opacity = "0";
    } else {
      const grad =
        `radial-gradient(120% 120% at 50% 0%, ${T.shade(c, 0.22)} 0%, ${c} 45%, ${T.shade(c, -0.4)} 100%)`;
      const tex = textureLayers(settings.bgTexture, c);
      desc = tex
        ? { image: tex.image + ", " + grad, size: tex.size + ", cover", repeat: tex.repeat + ", no-repeat" }
        : { image: grad, size: "cover", repeat: "no-repeat" };
      bgOverlay.style.opacity = "0";
    }

    paintBackground(desc, usingImage);
    applyMotion(motion);

    // Text + field contrast: white over images, otherwise derived from the color.
    const fg = usingImage ? "#ffffff" : T.contrastColor(c);
    const dark = fg === "#16161a";
    root.setProperty("--fg", fg);
    root.setProperty("--fg-soft", dark ? "rgba(22,22,26,0.7)" : "rgba(255,255,255,0.78)");
    root.setProperty("--field", dark ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.16)");
    root.setProperty("--field-border", dark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.28)");

    // Search box
    const engine = T.ENGINES[settings.searchEngine] ? settings.searchEngine : "google";
    searchForm.style.display = settings.showSearch ? "" : "none";
    searchInput.placeholder = settings.searchPlaceholder
      ? settings.searchPlaceholder
      : `Search ${T.ENGINES[engine].name} or type a URL`;
    searchForm.dataset.engine = engine;

    // Clock + greeting
    clockEl.style.display = settings.showClock ? "" : "none";
    greetingEl.style.display = settings.showGreeting ? "" : "none";
    updateGreeting();
    Clock.config(settings.clockStyle, settings.hour24, settings.showSeconds);

    renderShortcutsIfChanged(settings.shortcuts || []);
    syncControls(c, settings, bg);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function getTimeParts() {
    const now = new Date();
    const H = now.getHours();
    return {
      H,
      m: now.getMinutes(),
      s: now.getSeconds(),
      h12: H % 12 || 12,
      ampm: H < 12 ? "AM" : "PM",
    };
  }

  function updateGreeting() {
    const name = (lastSettings.greetingName || "").trim();
    const custom = (lastSettings.customGreeting || "").trim();
    if (custom) {
      // {name} is an optional placeholder for the user's name.
      greetingEl.textContent = custom.replace(/\{name\}/gi, name).trim();
      return;
    }
    const hour = new Date().getHours();
    let part = "evening";
    if (hour < 12) part = "morning";
    else if (hour < 18) part = "afternoon";
    greetingEl.textContent = `Good ${part}${name ? ", " + name : ""}`;
  }

  // ---- word-clock vocabulary ----
  const HOUR_WORDS = ["twelve", "one", "two", "three", "four", "five", "six",
    "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const SMALL = ["zero", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen"];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty"];

  function numWord(n) {
    if (n < 20) return SMALL[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return TENS[t] + (o ? "-" + SMALL[o] : "");
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function wordPhrase(h12, m) {
    const hw = HOUR_WORDS[h12];
    const nextHw = HOUR_WORDS[(h12 % 12) + 1];
    if (m === 0) return cap(hw + " o'clock");
    if (m === 15) return cap("quarter past " + hw);
    if (m === 30) return cap("half past " + hw);
    if (m === 45) return cap("quarter to " + nextHw);
    if (m < 30) return cap(numWord(m) + " past " + hw);
    return cap(numWord(60 - m) + " to " + nextHw);
  }

  // ---- clock controller: builds DOM when the style changes, then ticks values ----
  const CLOCK_STYLES = ["digital", "analog", "flip", "binary", "word"];

  const Clock = {
    sig: "",
    style: "digital",
    hour24: false,
    showSeconds: false,
    nodes: null,

    config(style, hour24, showSeconds) {
      this.style = CLOCK_STYLES.indexOf(style) >= 0 ? style : "digital";
      this.hour24 = !!hour24;
      this.showSeconds = !!showSeconds;
      const sig = this.style + "|" + this.hour24 + "|" + this.showSeconds;
      if (sig !== this.sig) {
        this.sig = sig;
        this.build();
      }
      this.tick();
    },

    build() {
      clockEl.className = "clock style-" + this.style;
      this.nodes = {};
      this["build_" + this.style]();
    },

    tick() {
      if (clockEl.style.display === "none") return;
      this["tick_" + this.style](getTimeParts());
    },

    build_digital() {
      clockEl.innerHTML = '<span class="t"></span><span class="ap"></span>';
      this.nodes.t = clockEl.querySelector(".t");
      this.nodes.ap = clockEl.querySelector(".ap");
    },
    tick_digital(t) {
      const hh = this.hour24 ? pad(t.H) : String(t.h12);
      this.nodes.t.textContent = hh + ":" + pad(t.m) + (this.showSeconds ? ":" + pad(t.s) : "");
      this.nodes.ap.textContent = this.hour24 ? "" : t.ampm;
    },

    build_analog() {
      let ticks = "";
      for (let i = 0; i < 12; i++) {
        const a = (i * 30) * Math.PI / 180;
        const big = i % 3 === 0;
        const r1 = big ? 40 : 42;
        const x1 = (50 + Math.sin(a) * r1).toFixed(2);
        const y1 = (50 - Math.cos(a) * r1).toFixed(2);
        const x2 = (50 + Math.sin(a) * 46).toFixed(2);
        const y2 = (50 - Math.cos(a) * 46).toFixed(2);
        ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${big ? 2 : 1}" opacity="${big ? 0.9 : 0.5}"/>`;
      }
      clockEl.innerHTML =
        '<svg viewBox="0 0 100 100" class="analog-face">' +
        '<circle class="a-rim" cx="50" cy="50" r="48" stroke-width="1.5" stroke-opacity="0.3"/>' +
        ticks +
        '<line class="h-hour" x1="50" y1="50" x2="50" y2="29" stroke-width="3.5"/>' +
        '<line class="h-min" x1="50" y1="50" x2="50" y2="17" stroke-width="2.5"/>' +
        '<line class="h-sec" x1="50" y1="55" x2="50" y2="13" stroke-width="1"/>' +
        '<circle class="a-center" cx="50" cy="50" r="2.6"/>' +
        '</svg>';
      this.nodes.hour = clockEl.querySelector(".h-hour");
      this.nodes.min = clockEl.querySelector(".h-min");
      this.nodes.sec = clockEl.querySelector(".h-sec");
      this.nodes.sec.style.display = this.showSeconds ? "" : "none";
    },
    tick_analog(t) {
      this.nodes.hour.setAttribute("transform", `rotate(${(t.h12 % 12) * 30 + t.m * 0.5} 50 50)`);
      this.nodes.min.setAttribute("transform", `rotate(${t.m * 6 + t.s * 0.1} 50 50)`);
      if (this.showSeconds) {
        this.nodes.sec.setAttribute("transform", `rotate(${t.s * 6} 50 50)`);
      }
    },

    build_flip() {
      const groups = this.showSeconds ? 3 : 2;
      let html = "";
      for (let g = 0; g < groups; g++) {
        if (g > 0) html += '<span class="flip-colon">:</span>';
        html += '<span class="flip-group"><span class="flip-card"></span><span class="flip-card"></span></span>';
      }
      if (!this.hour24) html += '<span class="flip-ap"></span>';
      clockEl.innerHTML = html;
      this.nodes.cards = Array.prototype.slice.call(clockEl.querySelectorAll(".flip-card"));
      this.nodes.ap = clockEl.querySelector(".flip-ap");
    },
    tick_flip(t) {
      const hh = this.hour24 ? pad(t.H) : pad(t.h12);
      const digits = hh + pad(t.m) + (this.showSeconds ? pad(t.s) : "");
      this.nodes.cards.forEach((card, i) => {
        const d = digits.charAt(i);
        if (card.textContent !== d) {
          card.textContent = d;
          card.classList.remove("flip");
          void card.offsetWidth; // restart the flip animation
          card.classList.add("flip");
        }
      });
      if (this.nodes.ap) this.nodes.ap.textContent = t.ampm;
    },

    build_binary() {
      const cols = [
        { label: "H", max: this.hour24 ? 2 : 1, get: (t) => Math.floor((this.hour24 ? t.H : t.h12) / 10) },
        { label: "H", max: 9, get: (t) => (this.hour24 ? t.H : t.h12) % 10 },
        { label: "M", max: 5, get: (t) => Math.floor(t.m / 10) },
        { label: "M", max: 9, get: (t) => t.m % 10 },
      ];
      if (this.showSeconds) {
        cols.push({ label: "S", max: 5, get: (t) => Math.floor(t.s / 10) });
        cols.push({ label: "S", max: 9, get: (t) => t.s % 10 });
      }
      const weights = [8, 4, 2, 1];
      let html = '<div class="bin">';
      for (let r = 0; r < 4; r++) {
        html += '<div class="bin-row">';
        for (let c = 0; c < cols.length; c++) {
          const w = weights[r];
          html += w <= cols[c].max
            ? `<span class="bdot" data-col="${c}" data-bit="${w}"></span>`
            : '<span class="bdot empty"></span>';
        }
        html += "</div>";
      }
      html += '<div class="bin-row labels">';
      for (let c = 0; c < cols.length; c++) html += `<span class="blabel">${cols[c].label}</span>`;
      html += "</div></div>";
      clockEl.innerHTML = html;
      this.nodes.cols = cols;
      this.nodes.dots = Array.prototype.slice.call(clockEl.querySelectorAll(".bdot:not(.empty)"));
    },
    tick_binary(t) {
      const vals = this.nodes.cols.map((c) => c.get(t));
      this.nodes.dots.forEach((dot) => {
        dot.classList.toggle("on", (vals[+dot.dataset.col] & +dot.dataset.bit) !== 0);
      });
    },

    build_word() {
      clockEl.innerHTML = '<span class="word-text"></span>';
      this.nodes.w = clockEl.querySelector(".word-text");
    },
    tick_word(t) {
      this.nodes.w.textContent = wordPhrase(t.h12, t.m);
    },
  };

  function renderShortcuts(list) {
    shortcutsEl.innerHTML = "";
    list.forEach((s) => {
      const a = document.createElement("a");
      a.className = "shortcut";
      a.href = normalizeUrl(s.url);
      a.title = `${s.name || s.url} — ${s.url}`;

      const avatar = document.createElement("span");
      avatar.className = "sc-avatar";
      avatar.textContent = firstChar(s.name || hostOf(s.url));

      const label = document.createElement("span");
      label.className = "sc-label";
      label.textContent = s.name || hostOf(s.url);

      a.appendChild(avatar);
      a.appendChild(label);
      shortcutsEl.appendChild(a);
    });
  }

  function renderScList(list) {
    scList.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "sc-empty";
      empty.textContent = "No shortcuts yet.";
      scList.appendChild(empty);
      return;
    }
    list.forEach((s, i) => {
      const item = document.createElement("div");
      item.className = "sc-item";

      const ico = document.createElement("span");
      ico.className = "ico";
      ico.textContent = firstChar(s.name || hostOf(s.url));

      const meta = document.createElement("div");
      meta.className = "meta";
      const nm = document.createElement("div");
      nm.className = "nm";
      nm.textContent = s.name || hostOf(s.url);
      const ur = document.createElement("div");
      ur.className = "ur";
      ur.textContent = s.url;
      meta.appendChild(nm);
      meta.appendChild(ur);

      const del = document.createElement("button");
      del.className = "del";
      del.type = "button";
      del.textContent = "✕";
      del.title = "Remove";
      del.addEventListener("click", () => {
        const next = (lastSettings.shortcuts || []).slice();
        next.splice(i, 1);
        setSettings({ shortcuts: next });
      });

      item.appendChild(ico);
      item.appendChild(meta);
      item.appendChild(del);
      scList.appendChild(item);
    });
  }

  // Rebuild the shortcut DOM only when the list actually changes (applyAll runs
  // on every color drag / rotation tick, where shortcuts are usually unchanged).
  function renderShortcutsIfChanged(list) {
    const key = JSON.stringify(list);
    if (key === lastShortcutsKey) return;
    lastShortcutsKey = key;
    renderShortcuts(list);
    renderScList(list);
  }

  // Reflect current state into the drawer controls (without disrupting active typing).
  function syncControls(color, settings, bg) {
    if (drawer.hidden) return; // drawer controls aren't visible — skip the work
    const focused = document.activeElement;
    const set = (el, val) => {
      if (el !== focused) el.value = val;
    };

    set(colorInput, color);
    set(hexInput, color.slice(1));
    presetsEl.querySelectorAll(".preset").forEach((el) => {
      el.classList.toggle("active", el.dataset.color === color);
    });

    const isImage = settings.bgType === "image";
    bgGradientBtn.classList.toggle("active", !isImage);
    bgImageBtn.classList.toggle("active", isImage);
    const effImg = safeBgUrl(settings.bgWallpaper || bg);
    bgPreview.hidden = !effImg;
    if (effImg) bgThumb.src = effImg;
    updateWallpaperActive();
    dimRow.hidden = !isImage;
    set(bgDim, settings.bgDim);
    dimVal.textContent = settings.bgDim + "%";
    set(bgMotionSel, settings.bgMotion || "none");
    set(bgTextureSel, settings.bgTexture || "none");
    set(wpRotateSel, settings.wpRotate || "off");
    uiThemeSeg.querySelectorAll(".seg").forEach((b) =>
      b.classList.toggle("active", b.dataset.ui === (settings.uiTheme || "dark"))
    );

    showSearch.checked = !!settings.showSearch;
    set(engineSelect, T.ENGINES[settings.searchEngine] ? settings.searchEngine : "google");
    set(placeholderInput, settings.searchPlaceholder || "");

    showClock.checked = !!settings.showClock;
    set(clockStyleSel, CLOCK_STYLES.indexOf(settings.clockStyle) >= 0 ? settings.clockStyle : "digital");
    hour24Chk.checked = !!settings.hour24;
    showSecondsChk.checked = !!settings.showSeconds;
    showGreeting.checked = !!settings.showGreeting;
    set(nameInput, settings.greetingName || "");
    set(greetingTextInput, settings.customGreeting || "");
  }

  // ---------- state mutation ----------

  const persistColorDebounced = debounce((c) => T.setStoredColor(c), 200);

  function setColor(c, persistNow) {
    lastColor = T.normalizeHex(c) || T.DEFAULT_COLOR;
    applyAll(lastColor, lastSettings, lastBg);
    if (persistNow) T.setStoredColor(lastColor);
    else persistColorDebounced(lastColor);
  }

  const persistSettingsDebounced = debounce(() => T.saveSettings(lastSettings), 350);

  function setSettings(partial, debounced) {
    lastSettings = Object.assign({}, lastSettings, partial);
    applyAll(lastColor, lastSettings, lastBg);
    if (debounced) persistSettingsDebounced();
    else T.saveSettings(lastSettings);
  }

  function refresh(opts) {
    opts = opts || {};
    return Promise.all([T.getStoredColor(), T.getSettings()]).then(([color, settings]) => {
      lastColor = color;
      lastSettings = settings;
      const done = () => applyAll(lastColor, lastSettings, lastBg);
      if (opts.reloadBg || !bgLoaded) {
        return T.getBackground().then((bg) => {
          lastBg = bg;
          bgLoaded = true;
          done();
        });
      }
      done();
    });
  }

  // ---------- drawer open/close ----------

  function openDrawer() {
    // Build the wallpaper thumbnails only the first time Settings is opened,
    // so no external image requests happen unless the user wants them.
    if (!wpRendered) {
      renderWallpaperGrid(lastSettings.wpCategory || currentWpCat);
      wpRendered = true;
    }
    drawer.hidden = false;
    scrim.hidden = false;
    syncControls(lastColor, lastSettings, lastBg); // after un-hiding so the guard passes
  }

  function closeDrawer() {
    drawer.hidden = true;
    scrim.hidden = true;
  }

  // ---------- event wiring ----------

  // Build preset swatches
  PRESETS.forEach((color) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset";
    btn.style.background = color;
    btn.dataset.color = color;
    btn.title = color;
    btn.addEventListener("click", () => setColor(color, true));
    presetsEl.appendChild(btn);
  });

  colorInput.addEventListener("input", (e) => setColor(e.target.value, false));
  colorInput.addEventListener("change", (e) => setColor(e.target.value, true));
  hexInput.addEventListener("input", (e) => {
    const n = T.normalizeHex(e.target.value);
    if (n) setColor(n, false);
  });
  hexInput.addEventListener("blur", () => syncControls(lastColor, lastSettings, lastBg));
  randomBtn.addEventListener("click", () =>
    setColor("#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"), true)
  );
  resetBtn.addEventListener("click", () => setColor(T.DEFAULT_COLOR, true));

  // Background
  bgGradientBtn.addEventListener("click", () => setSettings({ bgType: "gradient" }));
  bgImageBtn.addEventListener("click", () => {
    if (lastBg || lastSettings.bgWallpaper) setSettings({ bgType: "image" });
    else bgFileInput.click();
  });
  bgFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    compressImage(file, 2560, 0.82)
      .then((dataUrl) =>
        T.setBackground(dataUrl).then(() => {
          lastBg = dataUrl;
          bgLoaded = true;
          setSettings({ bgType: "image", bgWallpaper: "" });
        })
      )
      .catch((err) =>
        alert("Sorry, that image couldn't be used: " + (err && err.message ? err.message : err))
      );
    bgFileInput.value = "";
  });
  bgRemoveBtn.addEventListener("click", () => {
    T.clearBackground().then(() => {
      lastBg = null;
      bgLoaded = true;
      setSettings({ bgType: "gradient", bgWallpaper: "" });
    });
  });
  bgDim.addEventListener("input", (e) => {
    dimVal.textContent = e.target.value + "%";
    setSettings({ bgDim: parseInt(e.target.value, 10) }, true);
  });
  bgMotionSel.addEventListener("change", (e) => setSettings({ bgMotion: e.target.value }));
  bgTextureSel.addEventListener("change", (e) => setSettings({ bgTexture: e.target.value }));
  wpTabs.querySelectorAll(".wp-tab").forEach((t) => {
    t.addEventListener("click", () => renderWallpaperGrid(t.dataset.cat));
  });
  wpRotateSel.addEventListener("change", (e) => setSettings({ wpRotate: e.target.value }));
  uiThemeSeg.querySelectorAll(".seg").forEach((b) => {
    b.addEventListener("click", () => setSettings({ uiTheme: b.dataset.ui }));
  });
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if ((lastSettings.uiTheme || "dark") === "auto") T.applyUiTheme("auto");
    });
  } catch (e) {
    /* no-op */
  }

  // Search
  showSearch.addEventListener("change", (e) => setSettings({ showSearch: e.target.checked }));
  engineSelect.addEventListener("change", (e) => setSettings({ searchEngine: e.target.value }));
  placeholderInput.addEventListener("input", (e) =>
    setSettings({ searchPlaceholder: e.target.value }, true)
  );

  // Clock + greeting
  showClock.addEventListener("change", (e) => setSettings({ showClock: e.target.checked }));
  clockStyleSel.addEventListener("change", (e) => setSettings({ clockStyle: e.target.value }));
  hour24Chk.addEventListener("change", (e) => setSettings({ hour24: e.target.checked }));
  showSecondsChk.addEventListener("change", (e) => setSettings({ showSeconds: e.target.checked }));
  showGreeting.addEventListener("change", (e) => setSettings({ showGreeting: e.target.checked }));
  nameInput.addEventListener("input", (e) => setSettings({ greetingName: e.target.value }, true));
  greetingTextInput.addEventListener("input", (e) => setSettings({ customGreeting: e.target.value }, true));

  // Shortcuts
  function addShortcut() {
    const url = scUrl.value.trim();
    if (!url) {
      scUrl.focus();
      return;
    }
    const name = scName.value.trim() || hostOf(url);
    setSettings({ shortcuts: (lastSettings.shortcuts || []).concat([{ name, url }]) });
    scName.value = "";
    scUrl.value = "";
    scName.focus();
  }
  scAddBtn.addEventListener("click", addShortcut);
  scUrl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addShortcut();
  });

  // Search submit -> URL or chosen search engine
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    const looksLikeUrl =
      /^(https?:\/\/)/i.test(q) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q);
    if (looksLikeUrl) {
      window.location.href = /^https?:\/\//i.test(q) ? q : "https://" + q;
    } else {
      const engine = T.ENGINES[searchForm.dataset.engine] || T.ENGINES.google;
      window.location.href = engine.url + encodeURIComponent(q);
    }
  });

  // Drawer triggers
  settingsBtn.addEventListener("click", openDrawer);
  $("closeDrawer").addEventListener("click", closeDrawer);
  scrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) closeDrawer();
  });

  // Stay in sync with the popup / other tabs
  T.onAnyChange((changes) => refresh({ reloadBg: !!changes[T.BG_KEY] }));

  // ---------- init ----------
  let clockTimer = 0;
  function startTicks() {
    if (!clockTimer) {
      clockTimer = setInterval(() => {
        Clock.tick();
        updateGreeting();
      }, 1000);
    }
  }
  function stopTicks() {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = 0;
    }
  }

  // Pause animations + clock while the tab is hidden to save CPU/GPU/battery/memory.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      bgLayer.classList.add("bg-paused");
      Parallax.pause();
      Slideshow.pause();
      stopTicks();
    } else {
      bgLayer.classList.remove("bg-paused");
      Parallax.resume();
      Slideshow.resume();
      Clock.tick();
      updateGreeting();
      startTicks();
    }
  });

  refresh().then(() => {
    if (lastSettings.showSearch) searchInput.focus();
  });
  startTicks();
})();
