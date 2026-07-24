# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Serve locally:** Open `index.html` in a browser or use VS Code's Live Server extension (configured for port 5501):
```bash
# VS Code: Right-click index.html → "Open with Live Server"
# Or use any local server: python -m http.server 8000
```

No build step, no npm install, no tests — vanilla HTML/CSS/JavaScript.

## Project Architecture

**Guess The Song** is a music guessing game where users select an artist, listen to 15-second song clips, and guess the song title. Only XXXTENTACION has songs loaded; other artists show a "Coming Soon" message.

### User Flow
1. `index.html` → homepage with navigation to artist selection
2. `international.html` → list of 13 artists, dynamically rendered from shared data. Clicking a card fades the page out (`.page-exit`, `css/artists-page.css`) before navigating to `game.html?artist={id}`
3. `game.html?artist={id}` → game page for the selected artist. Fades in on load (`.page-enter`). Header includes a "← กลับสู่เมนูหลัก" (Back to Menu) link back to `international.html`, present in the normal game view and in the "Artist Not Found"/"Coming Soon" states

### Data & Logic Structure

**Shared artist data** (`js/artists-data.js`):
- `mockArtists[]` — array of 13 artists with name, image path, kebab-case id
- Single source of truth for artist metadata across all pages

**Song data** (`js/songs-data.js`):
- `artistSongs["xxxtentacion"]` — 138 songs, generated from every file under `audio/` (8 album subfolders), de-duplicated by song name (a handful of tracks appear on both an original album and a deluxe/re-release under the same title; only one copy is kept so the no-repeat session logic can't show the same song twice)
- `file` paths point directly at the actual files under `audio/{Album Folder}/`, including the bitrate/codec suffix in the filename (e.g. `audio/- Album - ¿/NUMB (128kbit_AAC).m4a`)
- Regenerating this list: scan `audio/` recursively, strip the extension and the trailing `(NNNkbit_CODEC)` suffix from each filename to get the display `name`, then de-dupe by exact name before writing the array

**Artist selection pages** (`artists.html`, `international.html`):
- Both use identical markup (thin shells)
- Load shared data + rendering logic: `js/artists-data.js`, `js/artists-page.js`, `css/artists-page.css`
- Renders grid of artist cards that link to `game.html?artist={id}`
- `renderArtists()` creates cards with circular fallback avatar on image fail

**Game page** (`game.html`):
- URL parameter `artist` selects which artist's song list to load
- Validates against `mockArtists` (404 if unknown; "Coming Soon" if no songs)
- Populates header (title, image, subtitle) dynamically from artist metadata
- `artistSongs{}` map (`js/songs-data.js`) stores per-artist song lists (currently only `"xxxtentacion"` populated; other 12 artists have empty placeholder arrays)
- `Game` class (generic, not hardcoded to one artist) manages:
  - Round/level progression (3/5/7 songs per level)
  - 15-second timer, rendered as a donut progress ring (`.timer-ring`, CSS `--progress` custom property) with a visual/pulse warning at ≤5 sec
  - Levenshtein distance + similarity scoring for fuzzy song title matching
  - Score/level tracking with animations: score-flash on the stat card, floating "+N"/"-N" delta indicator, input shake on wrong answers, input glow on correct answers, feedback slide-in
  - Per-artist high score + global top-10 leaderboard persisted to `localStorage` (see below)
  - Song pool for a session is drawn from a shrinking `availableSongs` array (spliced on pick, refilled on reset), so no song repeats within a session
- Audio files: `audio/{Album Folder}/{Song Name} ({bitrate}_{codec}).{m4a,opus}` for XXXTENTACION (138 unique tracks across 8 albums; ~147 files on disk before de-duping songs that appear on multiple albums/re-releases under the same title)

### High Score / Leaderboard (localStorage)

- `game.html`'s `Game` class stores a per-artist high score under `gts_highscore_{artistId}` and a shared top-10 leaderboard under `gts_highscores_all` (array of `{score, artistId, artistName, level, date}`, sorted descending).
- Displayed in a 4th "สูงสุด" (High Score) stat card, loaded via `loadHighScore()` in `init()`.
- `saveHighScoreIfBeaten()` runs on `showGameOver()` and `showAllSongsPlayed()`; if the run's score beats the stored high score, it updates both keys and shows a "🏆 New High Score" badge in the corresponding overlay.
- Resetting the game (`resetGame()`) clears in-memory session state only — the stored high score persists across resets and page reloads.

### Legacy/Unused
- `songs.html`, `vocabulary-game.html`, `script.js`, `vocabulary-game.js` — appear to be early prototypes; not linked from navigation
- `style.css` — contains base styles for index.html; artist pages use separate `css/artists-page.css` to avoid conflicts

## Adding a New Artist

1. **Add to mockArtists** (`js/artists-data.js`):
   ```javascript
   { "name": "Artist Name", "image": "images/Artist Name.jpg", "id": "artist-id" }
   ```
   - Ensure image file exists in `images/` with exact filename match
   - Use kebab-case for id; name can have spaces/capitals

2. **Add song list to artistSongs** (`js/songs-data.js`):
   ```javascript
   "artist-id": [
       { name: "Song Title", file: "audio/Song Title.mp3" },
       // ... more songs
   ]
   ```
   - Each audio file must exist in `audio/` directory
   - Song names should match filenames exactly for matching logic to work
   - If empty/omitted, artist shows "Coming Soon" (graceful degradation)

3. **Add images/Song Name.jpg** for each artist

4. **Add audio files** to `audio/` directory for each song (optional; "Coming Soon" displays if missing)

## Key Design Decisions

**De-duplication (recent refactor):**
- Extracted shared data/logic from `artists.html` and `international.html` into `js/artists-data.js`, `js/artists-page.js`, `css/artists-page.css`
- Eliminates 400+ lines of duplication; single edit point for artist data now
- Both artist selection pages are now thin markup shells

**Generic game class:**
- `Game` class accepts songs array in constructor, not hardcoded for XXXTENTACION
- Gracefully handles missing songs with "Coming Soon" modal instead of blocking access
- Makes adding new artists straightforward (just populate `artistSongs` map)

**Fuzzy matching:**
- Levenshtein distance + similarity score in `checkAnswerIntelligently()`
- Tolerates typos, whitespace, articles (a/an/the) stripped
- Medium difficulty: ≥80% similarity + distance ≤2

**High scores via localStorage, not a backend:**
- No server/build step exists (per Quick Start), so persistence is client-side only, scoped per browser
- Per-artist key (`gts_highscore_{artistId}`) keeps each artist's best score independent; a separate global leaderboard key aggregates top runs across artists
- Follows the same shape as the pre-existing (unused) leaderboard pattern in `vocabulary-game.js` for consistency

**Page transitions are CSS-opacity based, not a router:**
- `international.html`/`artists.html` fade out (`.page-exit`) on card click before a real navigation to `game.html`; `game.html` fades in (`.page-enter`) on load
- Kept intentionally simple (no JS transition library) since navigation is still full-page loads, matching the rest of the vanilla-JS architecture

## File Structure Reference

```
index.html              — Homepage with hero, feature banners, category links
artists.html            — Artist selection page (thin markup)
international.html      — Artist selection page (identical to artists.html)
game.html               — Game page; dynamically loads artist data from URL param

js/
  artists-data.js       — mockArtists array (shared by all pages)
  songs-data.js         — artistSongs map, per-artist song lists (loaded by game.html)
  artists-page.js       — loadArtists(), renderArtists() (shared by artist pages)

css/
  artists-page.css      — Spotify-style dark theme for artist selection pages

style.css               — Base styles for index.html, game.html, legacy pages
audio/                  — MP3 files (16 XXXTENTACION tracks + placeholders)
images/                 — Artist photos (13 .jpg files)
```

## Common Workflows

**Test a new artist locally:**
1. Add to `mockArtists` in `js/artists-data.js`
2. Add song list to `artistSongs` in `js/songs-data.js` (or leave empty for "Coming Soon")
3. Add image to `images/` folder
4. Reload `international.html`, click the artist card

**Debug game logic:**
- Open browser DevTools Console while playing
- Game state logged to console during `init()`
- Audio playback errors logged to console (browser security, CORS, missing file)

**Inspect artist data:**
- `js/artists-data.js:mockArtists` — authoritative list; changes here cascade everywhere
- Ensure no id duplicates or spaces in ids (will break URL param matching)
