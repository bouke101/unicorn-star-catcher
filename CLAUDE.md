# Games — Unicorn Star Catcher

## Overview
A fun, casual browser game where a unicorn with a basket catches falling stars. The longer you play and the more stars you catch, the higher your score. But watch out — a rainbow poo falling into the basket means instant game over!

---

## Gameplay

### Objective
Move the unicorn left and right to catch as many falling stars as possible within 30 seconds.

### Core Mechanics
- **Stars** fall from the top of the screen at varying speeds and positions
- Catching a star adds to the score
- **Rainbow poo** falls occasionally — catching it ends the game immediately
- The game ends automatically after **\~30 seconds** (countdown timer visible)

### Controls
- **Arrow keys** (left/right) or **A/D keys** — move the unicorn
- **Mobile:** touch/swipe left and right

---

## Game Elements

### 🦄 Unicorn + Basket
- The player character
- Moves horizontally along the bottom of the screen
- Has a visible basket/bucket to catch items
- Smooth movement, responsive to input

### ⭐ Stars
- Fall from random horizontal positions at the top
- Vary in speed (faster as time progresses — increasing difficulty)
- Multiple stars can be on screen at once
- Catching a star: +1 point (or +1 per star size/type if variants added later)

### 🌈💩 Rainbow Poo
- Appears randomly, less frequently than stars (roughly 1 every 5–8 seconds)
- Visually distinct and fun — rainbow-colored poo emoji style
- Falls at a similar speed to stars
- Catching it: **instant game over**

---

## Game Flow

```
Start Screen
    ↓ (press start / tap)
Gameplay (30 second countdown)
    ↓
    ├── Catch rainbow poo → Game Over Screen (early)
    └── Timer reaches 0 → Game Over Screen
         ↓
     Score + Replay button
```

### Screens

**Start Screen**
- Title: "Unicorn Star Catcher" (or similar fun name)
- Brief instruction: "Catch the stars! Avoid the rainbow poo 🌈💩"
- Start button

**Game Screen**
- Scrolling or static night sky background (stars, moon)
- Unicorn at the bottom, moveable
- Score counter (top left)
- Countdown timer (top right)
- Falling stars and occasional rainbow poo

**Game Over Screen**
- If caught poo: "Oh no! 🌈💩 You caught the rainbow poo!"
- If timer ended: "Time's up! ⭐"
- Final score displayed
- "Play Again" button

---

## Difficulty Progression
- Stars fall faster as the 30 seconds progress
- More stars on screen simultaneously in the final 10 seconds
- Rainbow poo frequency stays roughly constant (not increasing)

---

## Visual Style
- Bright, colorful, playful — like a children's mobile game
- Night sky background (dark blue/purple with sparkles)
- Emoji-style or cartoon characters
- Fun sound effects (optional): star catch chime, poo splat, game over jingle

---

## Tech Stack
- **Vanilla HTML + CSS + JavaScript** (single file, no framework needed)
- Or **React** if part of a larger games collection
- Canvas API or simple DOM-based animation
- No backend required — fully client-side

---

## File Structure
```
games/
├── unicorn-star-catcher/
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   └── assets/
│       ├── unicorn.png (or emoji-based)
│       ├── star.png
│       └── poo.png
```

---

## Future Ideas
- High score saved in localStorage
- Different star types (shooting star = bonus points)
- Power-ups (shield that protects from one poo)
- Multiple difficulty levels
- Multiplayer (two unicorns, split keyboard)
