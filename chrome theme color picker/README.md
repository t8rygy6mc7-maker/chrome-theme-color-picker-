
# Theme Color Picker, I promise I wont spy on you or collect stupid data 

A Chrome extension (Manifest V3) that puts a **color picker in a dropdown** (the
toolbar popup). Pick any color and it instantly themes your **New Tab page** —
background gradient, accents, and text contrast all update live.

🌐 Works in Chrome, Edge, Brave, and other Chromium-based browsers (Manifest V3).

![icon](icons/icon48.png)

### ⬇️ [Download the latest version (ZIP)](https://github.com/t8rygy6mc7-maker/chrome-theme-color-picker-/archive/refs/heads/main.zip)

Then follow [Install (Load Unpacked)](#install-load-unpacked) below it's free, no Chrome Web Store needed. Pweeeeaaase check it out 

## Screenshots

| Landscape wallpaper | Tech wallpaper |
|---|---|
| ![Forest wallpaper with clock, greeting, search bar, and weather widget](screenshots/screenshot-forest.jpg) | ![MacBook wallpaper with animated color glow and mouse parallax](screenshots/screenshot-macbook.jpg) |

## Features

- 🎨 Full color picker in the toolbar popup (native picker + hex input + presets)
- ⚙️ A **Settings** panel on the New Tab page (bottom-right button) to customize everything
- 🌗 **Light / Dark / Auto** appearance for the Settings panel and popup (Auto follows your system)
- 🖼️ **Custom background** — upload your own image (auto-compressed) or use the color gradient, with a dimming slider for readability
- 🏞️ **Built-in wallpapers** — pick from free [Unsplash](https://unsplash.com/license) photos in three categories (Landscapes, Cute animals, Cool tech), 10 photos each. A landscape is the default background, and you can **auto-rotate** them every 10s / 5m / 10m / 1h / day, in order or **shuffled** (smooth crossfade between photos, next image preloaded so there's no flash, paused when the tab is hidden)
- 🌀 **Background motion** — Aurora (animated gradient), Ken Burns, Float drift, Pan, or Mouse parallax. GPU-accelerated (`transform` only), auto-paused when the tab is hidden, and disabled under `prefers-reduced-motion`
- 🟦 **Gradient texture** — overlay Dots, Grid, Diagonal lines, or Noise (grain) on the color gradient so the motion effects are actually visible (a smooth gradient has no detail to track). CSS-only, no image assets
- 🔍 **Search box options** — pick Google / Bing / DuckDuckGo, set a custom placeholder, or hide it
- 🌦️ **Weather** — type a city, or tap **Use my location** for an opt-in one-tap lookup via the browser's geolocation, and see the current temperature + conditions in °C or °F. Off by default; powered by [Open-Meteo](https://open-meteo.com/) (free, **no API key or account**). Only makes a network request when you turn it on
- 🔗 **Shortcuts** — add any links you want to your home page
- 🕐 **Clock styles** — Digital, **Analog**, Flip cards, Binary (geeky), or a Word clock, with 12/24-hour and show-seconds options
- 👋 **Greeting** — toggle it, add your name, or write a fully custom greeting (supports a `{name}` placeholder)
- 🔁 Live sync — change something in the popup or one tab and other tabs update instantly
- ☁️ Settings saved with `chrome.storage` (color/settings sync across your Chrome profile; the background image is stored locally)
- 📦 Zero dependencies / no build step

## Install (Load Unpacked)

It's free — no Chrome Web Store needed.

1. **[Download the ZIP](https://github.com/t8rygy6mc7-maker/chrome-theme-color-picker-/archive/refs/heads/main.zip)**, then unzip it.
   (Or on the repo page use the green **Code ▸ Download ZIP** button, or `git clone`.)
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the unzipped folder (the one containing `manifest.json`).
5. Click the extension icon to open the picker, choose a color, then open a
   **new tab** to see the theme.

To update later, download the latest version and click the ↻ reload icon on the
extension card.

## How to use

- Click the toolbar icon → pick a color, type a hex code, or tap a preset.
- Open a **new tab** and click **⚙ Settings** (bottom-right) to:
  - **Appearance** — Light, Dark, or Auto (follows your OS) for the panel + popup.
  - **Theme color** — same picker as the popup, kept in sync.
  - **Background** — switch between the color gradient, an uploaded image, or a
    built-in **Wallpaper** (Landscapes / Animals / Tech). Use **Change wallpaper**
    to auto-rotate them on an interval, toggle **Shuffle order** to randomize
    which photo comes next instead of cycling in order, *Image dimming* to keep
    text readable over photos, and pick a **Motion**
    effect (Aurora / Ken Burns / Float drift / Pan / Mouse parallax) to bring it
    to life. Aurora applies to the color gradient; the rest also animate uploaded
    images. For a plain color gradient, add a **Texture** (Dots / Grid / Diagonal
    lines / Noise) so the motion has detail to track and is actually visible.
  - **Search box** — choose your search engine, set a custom placeholder, or hide it.
  - **Weather** — turn it on, type a **city**, and pick **°C or °F**. It shows the
    current temperature and conditions on your home page. Off by default; when on,
    it looks the city up and fetches the forecast from Open-Meteo (no API key needed).
  - **Clock & greeting** — pick a clock style (Digital / Analog / Flip cards /
    Binary / Word), 12- or 24-hour, show seconds, and either add your name or
    write your own greeting (`{name}` is replaced with your name).
  - **Shortcuts** — type a name + URL and click **Add** to put links on your home page.
  - **Reset** — a **Reset to defaults** button at the bottom restores every setting above
    (color, background, wallpaper, search, weather, clock, greeting, shortcuts) in one go.
    It asks for a second click to confirm since it also clears your shortcuts and background.
- Everything saves automatically and updates open tabs live.

## A note on scope (important)

Chrome's extension APIs **do not allow JavaScript to recolor the actual browser
toolbar/frame at runtime** — built-in themes are static and baked into a
manifest, so there is no `chrome.theme.setColor()` to call when you pick a color.
This extension therefore themes the part of the browser an extension *is* allowed
to fully control: the **New Tab page**. That gives the smooth "pick any color →
instant theme" experience without needing to repackage and reinstall a theme for
every color.

If you specifically need the real toolbar/frame recolored, that requires a
**static theme package** (a separate, one-color-at-a-time theme `.crx`), which is
a different mechanism than a live color picker.

## Privacy

This extension is aggressively boring from a data perspective. It collects absolutely nothing no analytics, no trackers, no secret handshake with a server farm somewhere. Your settings mind their own business inside your own chrome.storage, and any background images you upload stay right there on your device, living their best local life.
The only things that ever escape your machine are two completely ordinary requests, and only when you opt into them:
- **Wallpapers** — the built-in photos load directly from Unsplash's CDN, which is the same completely normal image request that happens every time any website shows you a picture. Nothing sinister. Just pixels.
- **Weather** — if (and only if) you turn on the weather widget, the **city name you type** is sent to [Open-Meteo](https://open-meteo.com/) to look up its coordinates and current forecast. No API key, no account, no location tracking — it only knows the city you told it. If you instead tap **Use my location**, your browser's own geolocation prompt asks for consent, and only then are your coordinates sent straight to Open-Meteo — nothing passes through us, and nothing is stored beyond your local `chrome.storage`. Leave weather off (the default) and nothing is ever sent.

Fair warning though: the New Tab page ships with a landscape wallpaper by default, so out of the box it does ping Unsplash for that one photo (weather stays off until you enable it). If you'd like to achieve peak hermit mode with zero network requests, just turn weather off and swap Background to the color gradient or one of your own uploaded images. We support your offline era.
That's it. Seriously. No data broker is getting rich off your new tab activity today.
## Files

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest: popup action + new tab override |
| `popup.html/.css/.js` | The dropdown color-picker UI |
| `newtab.html/.css/.js` | The themed New Tab page + Settings panel |
| `theme.js` | Shared color math, settings, and `chrome.storage` helpers |
| `make_icons.py` | Regenerates the PNG icons (pure Python stdlib) |
| `icons/` | Generated 16/32/48/128 px icons |

## Regenerating icons

```bash
python3 make_icons.py
```

## License

[MIT](LICENSE) — free to use, modify, and share. Attribution appreciated but not required.
