# ultraviolet.

A static portfolio site. No build step, no dependencies — just HTML/CSS/JS.

## Publish it on GitHub Pages

1. Create a repo (e.g. `ultraviolet-site` or `yourusername.github.io`).
2. Put `index.html`, `css/`, and `js/` at the repo root (not in a subfolder).
3. Push to GitHub.
4. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / `root`.
5. Your site goes live at `https://yourusername.github.io/repo-name/`
   (or `https://yourusername.github.io/` if you used the special repo name above).

## Things to swap out before you launch

Search the files for these and replace with your real info:

- `index.html` — phone number, `hello@ultraviolet.games` email (appears 3x), social links (`itch`, `x`, `bsky`, `gh` — currently `href="#"`), the six games in `#games` (titles/genres/years/blurbs are placeholders), the "Journey" timeline dates/copy, and the stat numbers in `#about` (games shipped / jams won).
- The tools strip (`Unity`, `Godot`, `Unreal`...) — trim to whatever you actually use.

## How the visuals work (no photos needed)

Instead of a headshot, the hero uses an animated canvas ("signal" particles) inside
a cartridge-shaped frame, styled with scanlines. Each game card's cover art is
generated on the fly in `js/script.js` (`paintProceduralArt`) — it's seeded by
the game's `data-seed` attribute, so the same title always produces the same
piece of art, but every game looks distinct. If you get real cover art later,
just replace the `<canvas>` in a `.game-art` div with an `<img>`.

## Local preview

Any static server works, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000`.
