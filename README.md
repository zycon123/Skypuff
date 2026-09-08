# SkyPuff

**Bounce. Boost. Reach the stars.**
*by Zycon Studios*

SkyPuff is a mobile-first, endless vertical jumper starring **Puff**, a small
fluffy cloud mascot who bounces automatically from platform to platform. You
only steer left and right — the goal is simple: **climb as high as possible**.

Built with plain HTML5, CSS and JavaScript/Canvas. No frameworks, no
backend, no accounts, no paid APIs.

## Play

Open `index.html` in a browser (or serve the folder with any static file
server, e.g. `python3 -m http.server`) and press **PLAY**.

- **Mobile:** drag/hold left or right anywhere on screen to steer Puff.
- **Desktop:** Arrow Left/Right or A/D. Mouse/pointer drag also works.
- Puff bounces automatically — there is no jump button.
- Leaving the left edge wraps you to the right, and vice versa.

## Project structure

```
index.html        Markup, screens (menu/pause/game over/skins/settings) & HUD
styles.css         Layout, mobile safe-area handling, screen styling
favicon.svg         Tiny Puff icon
src/
  game.js           State machine (MENU/PLAYING/PAUSED/GAME_OVER/SKINS), main
                     loop, collision resolution, scoring, screens wiring
  player.js         Puff physics constants, movement & expressive states
  platforms.js      Platform type definitions, per-type update & landing test
  world.js          Deterministic seeded procedural generation
                     (`generateWorld(seed)`), difficulty bands, environments
  renderer.js       All canvas drawing (background, platforms, Puff, effects)
  input.js          Keyboard / touch-drag / pointer input, gesture prevention
  audio.js          Lightweight synthesized SFX + music manager (no external
                     audio files — everything is generated with WebAudio)
  effects.js        Particle bursts, rainbow trail, floating combo text
  storage.js        localStorage persistence with corruption recovery
```

## Core gameplay

- **Auto-bounce physics** — Puff always bounces on landing; you only control
  horizontal air movement (acceleration/deceleration, slight floatiness,
  strong air control).
- **Smooth camera** — once Puff reaches the upper ~40% of the screen the
  world scrolls down to meet them; the camera only ever advances upward, so
  falling below the visible area ends the run.
- **Fair endless generation** — a guaranteed-reachable "safe path" of
  platforms is generated first every step, using the real jump physics
  (gravity, bounce velocity, max horizontal speed) to bound both the vertical
  gap and the horizontal offset of the next platform. Bonus elements (extra
  stars, mystery clouds, rare optional spike hazards placed well clear of the
  safe platform) are layered on afterwards and are never required to
  progress.
- **Difficulty bands** by height: Beginner (0–250m) → Easy (250–750m,
  moving platforms) → Medium (750–1500m, breakable/ice) → Hard
  (1500–2500m, smaller/faster) → Sky Master (2500m+).
- **Platform types:** Normal, Moving, Breakable, Ice, Spring, Cloud, and a
  very rare Spike hazard that is always placed beside — never on top of —
  the guaranteed safe platform.
- **Collectibles & moments:** stars (persisted currency), perfect landings
  with combo callouts, close-call detection with brief slow-motion, a single
  rescuable Heart Save, a rare Golden Platform that triggers a Star Rush, and
  a Mystery Cloud that always grants a positive effect (star burst, super
  boost, magnet, giant Puff, or rainbow rush).
- **Scoring:** live height in meters, persisted best height, and record
  chasing hints ("50m to your Best!", "So close!", "New Best!").
- **Environment progression:** Sunny Sky → Sunset → Night → Upper Atmosphere
  → Space, all blended smoothly within the same endless run (no level
  loads).
- **Skins:** Classic (free), Blue, Pink, Storm, Golden and Galaxy Puff,
  unlockable with Stars and persisted, cosmetic only.
- **Daily Sky ready:** `generateWorld(seed)` (and `seedFromString`) produce
  fully deterministic worlds from a seed, so a future "same seed for
  everyone" mode can be added without touching the generator.

## Save data

Everything is stored under a single `localStorage` key. Loading always goes
through a sanitizer — if the value is missing, unparsable, or has the wrong
shape, SkyPuff silently falls back to safe defaults instead of failing to
launch.

## Mobile support

- Fills the viewport using `window.innerWidth/innerHeight` with devicePixelRatio
  scaling, and re-measures on resize/orientation change.
- Respects `env(safe-area-inset-*)` for notches/home indicators.
- Prevents page scroll, pull-to-refresh, double-tap zoom, text selection and
  context menus on the game surface.
- Respects `prefers-reduced-motion` (fewer/no particles, rainbow trail off).

## Testing performed

- Manual and scripted (headless Chromium) smoke tests covering: launch with
  no console errors, Play → auto-bounce → keyboard & simulated pointer-drag
  steering, screen wrapping, camera follow, procedural generation, pause /
  resume, resize mid-run, Game Over → Play Again, Share (clipboard
  fallback), Skins purchase/select/persist, corrupted-`localStorage`
  recovery, and 25 rapid consecutive restarts with no duplicate listeners,
  no duplicate render loops, and bounded particle/platform counts (no
  unbounded memory growth).
- A dedicated fairness check generated 200 different seeded worlds ~3300m
  deep each (100,000+ gaps) and confirmed every mandatory gap stays within
  the physically reachable vertical/horizontal bounds, and that every
  generated Spike hazard never overlaps the guaranteed safe platform beside
  it.

## Known limitations (v0.1)

- Rare purely-decorative sky events (background rainbows, shooting stars,
  balloons, meteors, UFOs) are not yet implemented — they are lower priority
  polish and were intentionally deferred in favor of a stable core loop.
- Star Rush and Mystery Cloud effects are functional but intentionally
  simple (e.g. Star Rush slightly raises star spawn odds rather than
  reshaping upcoming terrain in place).
- Audio is fully synthesized via WebAudio (no music/SFX asset files yet) —
  swapping in an original soundtrack later only requires replacing the
  bodies of the methods in `src/audio.js`.
- No automated unit-test harness is included; verification was performed via
  headless-browser scripts and a standalone generation-fairness script (not
  committed, as the repo currently has no test runner configured).

## Next recommended step

Add a small deterministic "Daily Sky" mode UI (pick today's date as the seed
via `seedFromString`) on top of the existing `generateWorld(seed)` support,
and layer in the deferred rare background sky events for extra polish.
