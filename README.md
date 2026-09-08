# SkyPuff

**Bounce. Boost. Reach the stars.**

A mobile-first vertical endless jumper game built with HTML5 Canvas and vanilla JavaScript.

## About

SkyPuff is an addictive arcade game where you control Puff, a cute cloud creature, as it bounces endlessly upward through an ever-changing sky. The game features:

- **Simple one-handed controls** - Just steer left and right
- **Procedurally generated platforms** - Always a new challenge
- **Beautiful environment progression** - From sunny skies to deep space
- **Special abilities and power-ups** - Springs, mystery clouds, heart saves, and more
- **Cosmetic skins** - Unlock new looks for Puff with collected stars
- **Perfect landing combos** - Master your timing for bonus points
- **Persistent high scores** - Beat your best height

## How to Play

### Controls

**Mobile:**
- Drag left or right anywhere on screen to move Puff

**Desktop:**
- Arrow Keys (← →) or A/D keys to move
- Click and drag with mouse also works

### Objective

Climb as high as possible by bouncing from platform to platform!

- **Normal platforms** (green) - Basic bouncing
- **Moving platforms** (blue) - Move side to side
- **Breakable platforms** (brown) - One bounce only
- **Ice platforms** (light blue) - Slippery surface
- **Spring platforms** (purple) - Super boost!
- **Cloud platforms** (white) - Disappear after use
- **Golden platforms** (gold) - Star Rush mode!
- **Spike platforms** (red) - Avoid these!

Collect ⭐ stars to unlock new skins for Puff!

## Features

- **Perfect Landings**: Land near the center of platforms for combo bonuses
- **Close Call**: Recover from near-death falls for bonus stars
- **Heart Save**: Collect a ❤️ to survive one fall
- **Mystery Clouds**: Random positive effects (star burst, super boost, magnet, giant mode, rainbow rush)
- **Rainbow Trail**: Colorful trail follows Puff while jumping
- **Environment Zones**: 
  - Sunny Sky (0-500m)
  - Sunset (500-1000m)
  - Night (1000-1750m)
  - Upper Atmosphere (1750-2500m)
  - Space (2500m+)

## Skins

- **Classic Puff** - Free
- **Blue Puff** - 50 stars
- **Pink Puff** - 100 stars
- **Storm Puff** - 200 stars
- **Golden Puff** - 500 stars
- **Galaxy Puff** - 1000 stars

## Technical Details

- Pure HTML5/CSS/JavaScript - No frameworks
- Canvas-based rendering at 60 FPS
- Responsive design for portrait mobile devices
- Safe area support for notched phones
- LocalStorage for save data persistence
- Deterministic procedural generation (seed-based)
- Optimized for mobile performance

## Installation

No installation required! Simply open `index.html` in a modern web browser.

For local development:
```bash
# Serve with any static file server
npx serve .
# or
python -m http.server 8000
```

Then navigate to `http://localhost:8000` in your browser.

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

### File Structure

```
index.html          - Main HTML file
styles.css          - Game styling
src/
  game.js          - Main game logic and state management
  player.js        - Player (Puff) class and rendering
  platforms.js     - Platform types, stars, hearts, mystery clouds
  world.js         - Procedural world generation
  renderer.js      - Canvas rendering and backgrounds
  input.js         - Touch and keyboard input handling
  audio.js         - Sound effects using Web Audio API
  storage.js       - LocalStorage save data management
  effects.js       - Particle effects and floating text
```

### Key Systems

1. **Physics**: Custom arcade-style physics tuned for feel
2. **Procedural Generation**: Seeded random generation ensures fair, reachable platforms
3. **Camera**: Smooth vertical scrolling with predictive positioning
4. **Collision**: Optimized AABB collision detection
5. **Rendering**: Efficient canvas rendering with object pooling
6. **Audio**: Lightweight Web Audio API sound synthesis

## Credits

**Developer**: Zycon Studios

**Game Design**: Original concept inspired by classic vertical jumpers

**Art**: Original vector/canvas artwork

**Audio**: Synthesized sound effects (Web Audio API)

## License

Copyright © 2026 Zycon Studios. All rights reserved.

---

*Made with ☁️ and 🌈*
