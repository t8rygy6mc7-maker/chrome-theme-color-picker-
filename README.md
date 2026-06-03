
# Theme Color Picker

A Chrome extension (Manifest V3) that puts a **color picker in a dropdown** (the
toolbar popup). Pick any color and it instantly themes your **New Tab page** —
background gradient, accents, and text contrast all update live.

![icon](icons/icon48.png)

## Features

- 🎨 Full color picker in the toolbar popup (native picker + hex input + presets)
- ⚙️ A **Settings** panel on the New Tab page (bottom-right button) to customize everything
- 🖼️ **Custom background** — upload your own image (auto-compressed) or use the color gradient, with a dimming slider for readability
- 🌀 **Background motion** — Aurora (animated gradient), Ken Burns, Float drift, Pan, or Mouse parallax. GPU-accelerated (`transform` only), auto-paused when the tab is hidden, and disabled under `prefers-reduced-motion`
- 🔍 **Search box options** — pick Google / Bing / DuckDuckGo, set a custom placeholder, or hide it
- 🔗 **Shortcuts** — add any links you want to your home page
- 🕐 **Clock styles** — Digital, **Analog**, Flip cards, Binary (geeky), or a Word clock, with 12/24-hour and show-seconds options
- 👋 **Greeting** — toggle it, add your name, or write a fully custom greeting (supports a `{name}` placeholder)
- 🔁 Live sync — change something in the popup or one tab and other tabs update instantly
- ☁️ Settings saved with `chrome.storage` (color/settings sync across your Chrome profile; the background image is stored locally)
- 📦 Zero dependencies / no build step

## Install (Load Unpacked)

It's free — no Chrome Web Store needed.

1. Download this repo: click **Code ▸ Download ZIP** (or `git clone`), then unzip it.
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
  - **Theme color** — same picker as the popup, kept in sync.
  - **Background** — switch between the color gradient and an uploaded image; use
    *Image dimming* to keep text readable over photos, and pick a **Motion**
    effect (Aurora / Ken Burns / Float drift / Pan / Mouse parallax) to bring it
    to life. Aurora applies to the color gradient; the rest also animate uploaded
    images.
  - **Search box** — choose your search engine, set a custom placeholder, or hide it.
  - **Clock & greeting** — pick a clock style (Digital / Analog / Flip cards /
    Binary / Word), 12- or 24-hour, show seconds, and either add your name or
    write your own greeting (`{name}` is replaced with your name).
  - **Shortcuts** — type a name + URL and click **Add** to put links on your home page.
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
