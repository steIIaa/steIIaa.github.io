# ultraviolet. — studio site

Minimal single-page site for ultraviolet games. Pure HTML/CSS/JS, no build step — ready for GitHub Pages as-is.

## File structure

```
index.html      — page structure & copy
style.css       — design tokens, layout, type
grid.js         — interactive mouse-following grid background
assets/
  infared-logo.png       — infaRED bot logo
  ultraviolet-logo.png    — studio logo (used as favicon)
```

## Preview locally

From this folder, run:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Deploy to GitHub Pages

1. Create a new repo (e.g. `ultraviolet-games.github.io` for a root-domain site, or any name for a project page).
2. Push these files to the repo root:
   ```
   git init
   git add .
   git commit -m "initial site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, select **Deploy from a branch**.
5. Pick **main** branch, **/ (root)** folder, save.
6. Wait ~1 minute, then your site is live at the URL GitHub shows on that page.

## What to customize

- **Discord invite link** — in `index.html`, find `<a href="#" class="btn btn--ghost">add to discord →</a>` and swap `#` for your real invite URL.
- **Social links** — in the `<footer>` of `index.html`, update the GitHub/Discord/email links.
- **Next game card** — currently a placeholder ("untitled" / "in development"). Swap in real art and copy once you're ready to reveal it.
- **Studio statement** — short paragraph in the `#studio` section; written generically, edit to sound like you.

## Design notes

- **Wordmark**: Cambria italic, gradient `#f6f6f6 → #cb4fff`, matches your logo files. Used in nav, hero, and footer for consistency.
- **Background**: black canvas grid (`grid.js`) that brightens in a soft radius around the cursor — dim white lines, with a violet ambient glow that breathes underneath. Respects `prefers-reduced-motion` (falls back to a static dim grid, no animation).
- **Accent glyph**: the arrow mark from your logos is reused (rotated) as a scroll indicator in the hero, tying infaRED's visual language back to the parent brand.
- Fonts: Cambria for display/headings (system font, no load needed), Inter for body text, JetBrains Mono for small utility labels (tags, eyebrow text) — loaded from Google Fonts.

## Browser support

Canvas-based grid works in all modern browsers. No build tooling, no dependencies beyond the two Google Fonts.
