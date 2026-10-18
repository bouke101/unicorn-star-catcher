// Panda Hotel — arcade mini-games, one for each hotel extra.
// Every game gets harder each 30-second round and stops after 4 minutes.

const GAME_SECONDS = 240;
const ROUND_SECONDS = 30;
const MAX_REWARD = 150;
const FULL_TIME_BONUS = 30;

const miniEl = $('mini');
const miniCanvas = $('mini-canvas');
const mctx = miniCanvas.getContext('2d');
const miniCard = $('mini-card');

let g = null;           // the running mini-game
const keys = {};

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function emoji(ctx, ch, x, y, size, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}

function hitsCircle(a, b, r) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < r * r;
}

function hitsRect(c, r, x, y, w, h) {
  const nx = clamp(c.x, x, x + w);
  const ny = clamp(c.y, y, y + h);
  return (c.x - nx) ** 2 + (c.y - ny) ** 2 < r * r;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

// Blink the player while they can't be hit again.
const blinking = () => g.invuln > 0 && Math.floor(g.invuln * 10) % 2 === 0;

// ── The games ──
const MINI_GAMES = {

  pool: {
    title: 'Shark Escape',
    icon: '🏊',
    intro: 'Panda wants to try the new pool... but sharks sneaked in! Swim up and down, grab the coins and stay away from the sharks.',
    controls: 'Arrow keys ⬆️⬇️, or hold your finger where Panda should swim.',
    init() {
      g.p = { x: 80, y: g.H / 2 };
      g.items = [];
      g.nextShark = 1;
      g.nextCoin = 1.5;
    },
    update(dt) {
      const top = 80, bottom = g.H - 40, speed = 300;
      if (g.up) g.p.y -= speed * dt;
      else if (g.down) g.p.y += speed * dt;
      else if (g.pointer.down) {
        const d = g.pointer.y - g.p.y;
        g.p.y += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      }
      g.p.y = clamp(g.p.y, top, bottom);

      g.nextShark -= dt;
      if (g.nextShark <= 0) {
        g.nextShark = Math.max(0.4, 1.5 - g.t * 0.0065) * rand(0.7, 1.3);
        const big = g.t > 120 && Math.random() < 0.25;
        const y = rand(top, bottom);
        g.items.push({
          kind: 'shark', x: g.W + 40, y, y0: y,
          vx: -(150 + g.t * 1.6) * rand(0.85, 1.2),
          wave: g.t > 45 && Math.random() < 0.5 ? rand(30, 70) : 0,
          phase: rand(0, 6), size: big ? 66 : 44, r: big ? 30 : 20,
        });
      }
      g.nextCoin -= dt;
      if (g.nextCoin <= 0) {
        g.nextCoin = rand(1, 2);
        const y = rand(top, bottom);
        g.items.push({ kind: 'coin', x: g.W + 20, y, y0: y, vx: -(130 + g.t * 0.8), wave: 0, size: 28, r: 22 });
      }

      for (const it of g.items) {
        it.x += it.vx * dt;
        if (it.wave) it.y = clamp(it.y0 + Math.sin(g.t * 2.5 + it.phase) * it.wave, top, bottom);
        if (hitsCircle(it, g.p, it.r + 14)) {
          if (it.kind === 'coin') { it.dead = true; g.add(3); }
          else if (g.hit()) it.dead = true;
        }
        if (it.x < -60) {
          it.dead = true;
          if (it.kind === 'shark') g.add(1);
        }
      }
      g.items = g.items.filter(it => !it.dead);
    },
    draw(ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, g.H);
      grad.addColorStop(0, '#74d4f5');
      grad.addColorStop(1, '#1c7ed6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, g.W, g.H);
      // Pool tiles and waves
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      for (let x = (-g.t * 40) % 40; x < g.W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, g.H); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      for (let row = 0; row < 6; row++) {
        const y = 100 + row * (g.H - 120) / 6;
        ctx.beginPath();
        for (let x = 0; x <= g.W; x += 10) ctx.lineTo(x, y + Math.sin(x / 30 + g.t * 3 + row) * 5);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      for (const it of g.items) emoji(ctx, it.kind === 'coin' ? '🪙' : '🦈', it.x, it.y, it.size);
      if (!blinking()) {
        emoji(ctx, '🛟', g.p.x, g.p.y + 10, 40);
        emoji(ctx, '🐼', g.p.x, g.p.y - 6, 38);
      }
    },
  },

  heli: {
    title: 'Sky Flight',
    icon: '🚁',
    intro: 'Panda flies the hotel helicopter across the city. Fly through the gaps between the skyscrapers and the storm clouds, and watch out for birds!',
    controls: 'Hold Space or ⬆️ (or hold your finger on the screen) to fly up. Let go to sink.',
    init() {
      g.p = { x: 110, y: g.H / 2, vy: 0 };
      g.obs = [];
      g.items = [];
      g.next = 0.6;
      g.nextBird = 6;
    },
    update(dt) {
      const lift = g.action || g.up || g.pointer.down;
      g.p.vy = clamp(g.p.vy + (lift ? -1100 : 750) * dt, -320, 360);
      g.p.y += g.p.vy * dt;
      if (g.p.y < 70) { g.p.y = 70; g.p.vy = 0; }
      if (g.p.y > g.H - 30) { g.p.y = g.H - 30; g.p.vy = 0; }

      const speed = 150 + g.t * 1.1;
      g.next -= dt;
      if (g.next <= 0) {
        const gap = Math.max(140, 250 - g.t * 0.5);
        const mid = rand(70 + gap / 2 + 20, g.H - 50 - gap / 2);
        g.obs.push({ x: g.W + 40, w: 64, top: mid - gap / 2, bottom: mid + gap / 2 });
        g.items.push({ kind: 'coin', x: g.W + 72, y: mid, size: 28 });
        g.next = (280 - Math.min(90, g.t * 0.4)) / speed;
      }
      if (g.t > 40) {
        g.nextBird -= dt;
        if (g.nextBird <= 0) {
          g.nextBird = Math.max(1.5, rand(3, 6) - g.t * 0.012);
          const y = rand(90, g.H - 80);
          g.items.push({ kind: 'bird', x: g.W + 30, y, y0: y, phase: rand(0, 6), size: 34 });
        }
      }

      for (const o of g.obs) {
        o.x -= speed * dt;
        if (hitsRect(g.p, 18, o.x, 0, o.w, o.top) || hitsRect(g.p, 18, o.x, o.bottom, o.w, g.H)) g.hit();
        if (!o.passed && o.x + o.w < g.p.x) { o.passed = true; g.add(1); }
      }
      for (const it of g.items) {
        if (it.kind === 'bird') {
          it.x -= (speed + 90) * dt;
          it.y = it.y0 + Math.sin(g.t * 3 + it.phase) * 40;
          if (hitsCircle(it, g.p, 30) && g.hit()) it.dead = true;
        } else {
          it.x -= speed * dt;
          if (hitsCircle(it, g.p, 30)) { it.dead = true; g.add(2); }
        }
        if (it.x < -40) it.dead = true;
      }
      g.obs = g.obs.filter(o => o.x > -80);
      g.items = g.items.filter(it => !it.dead);
    },
    draw(ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, g.H);
      grad.addColorStop(0, '#4dabf7');
      grad.addColorStop(1, '#d0ebff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, g.W, g.H);
      for (const o of g.obs) {
        // Storm cloud from the top
        ctx.fillStyle = '#5c677d';
        roundRect(ctx, o.x - 6, -20, o.w + 12, o.top + 20, 18);
        ctx.fill();
        if (o.top > 50) emoji(ctx, '⚡', o.x + o.w / 2, o.top - 18, 22);
        // Skyscraper from the bottom
        ctx.fillStyle = '#495473';
        ctx.fillRect(o.x, o.bottom, o.w, g.H - o.bottom);
        ctx.fillStyle = '#ffe9a8';
        for (let y = o.bottom + 12; y < g.H - 8; y += 22)
          for (let x = o.x + 10; x < o.x + o.w - 10; x += 18) ctx.fillRect(x, y, 9, 11);
      }
      for (const it of g.items) emoji(ctx, it.kind === 'coin' ? '🪙' : '🐦', it.x, it.y, it.size);
      if (!blinking()) {
        ctx.save();
        ctx.translate(g.p.x, g.p.y);
        ctx.rotate(clamp(g.p.vy / 1200, -0.25, 0.25));
        emoji(ctx, '🚁', 0, 0, 46, true);
        emoji(ctx, '🐼', 8, -2, 18);
        ctx.restore();
      }
    },
  },

  taxi: {
    title: 'Taxi Rush',
    icon: '🚕',
    intro: 'Panda drives the hotel taxi to pick up new guests. Switch lanes to dodge the traffic and pick up the guests waiting on the road.',
    controls: 'Arrow keys ⬅️➡️, or tap the left or right side of the screen.',
    init() {
      g.laneW = Math.min(110, (g.W - 60) / 3);
      g.roadX = (g.W - g.laneW * 3) / 2;
      g.lane = 1;
      g.p = { x: laneX(1), y: g.H - 110 };
      g.items = [];
      g.next = 1;
      g.scroll = 0;
    },
    update(dt) {
      for (const k of g.presses) {
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') g.lane--;
        if (k === 'ArrowRight' || k === 'd' || k === 'D') g.lane++;
      }
      for (const tap of g.taps) g.lane += tap.x < g.W / 2 ? -1 : 1;
      g.lane = clamp(g.lane, 0, 2);
      g.p.x += (laneX(g.lane) - g.p.x) * Math.min(1, dt * 14);

      const speed = 220 + g.t * 2;
      g.scroll = (g.scroll + speed * dt) % 60;
      g.next -= dt;
      if (g.next <= 0) {
        g.next = Math.max(0.45, 1.2 - g.t * 0.004);
        const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
        // Always leave at least one lane open.
        const cars = g.t > 70 && Math.random() < 0.45 ? 2 : 1;
        for (let i = 0; i < cars; i++)
          g.items.push({ kind: 'car', lane: lanes[i], y: -50, ch: ['🚗', '🚙', '🚌', '🚓', '🚚'][Math.floor(Math.random() * 5)] });
        if (Math.random() < 0.35) g.items.push({ kind: 'guest', lane: lanes[2], y: -50, ch: '🙋' });
      }
      for (const it of g.items) {
        it.y += speed * dt;
        it.x = laneX(it.lane);
        if (Math.abs(it.x - g.p.x) < g.laneW * 0.55 && Math.abs(it.y - g.p.y) < 46) {
          if (it.kind === 'guest') { it.dead = true; g.add(3); }
          else if (g.hit()) it.dead = true;
        }
        if (it.y > g.H + 50) {
          it.dead = true;
          if (it.kind === 'car') g.add(1);
        }
      }
      g.items = g.items.filter(it => !it.dead);
    },
    draw(ctx) {
      ctx.fillStyle = '#51cf66';
      ctx.fillRect(0, 0, g.W, g.H);
      ctx.fillStyle = '#5c5f66';
      ctx.fillRect(g.roadX - 8, 0, g.laneW * 3 + 16, g.H);
      ctx.fillStyle = '#fff';
      for (let lane = 1; lane < 3; lane++)
        for (let y = -60 + g.scroll; y < g.H; y += 60) ctx.fillRect(g.roadX + lane * g.laneW - 3, y, 6, 30);
      // Trees on the side of the road
      for (let y = (-80 + g.scroll * 2) % 120 - 40; y < g.H; y += 120) {
        emoji(ctx, '🌳', g.roadX / 2, y, 30);
        emoji(ctx, '🌳', g.W - g.roadX / 2, y + 60, 30);
      }
      for (const it of g.items) emoji(ctx, it.ch, it.x, it.y, it.kind === 'guest' ? 36 : 48);
      if (!blinking()) emoji(ctx, '🚕', g.p.x, g.p.y, 52);
    },
  },

  garden: {
    title: 'Bamboo Catch',
    icon: '🎋',
    intro: 'Bamboo is falling in the new garden! Catch as much bamboo as you can in Panda\'s basket, but don\'t catch the bees. A golden star is worth extra!',
    controls: 'Arrow keys ⬅️➡️, or slide your finger left and right.',
    init() {
      g.p = { x: g.W / 2, y: g.H - 70 };
      g.items = [];
      g.next = 0.5;
    },
    update(dt) {
      const speed = 380;
      if (g.left) g.p.x -= speed * dt;
      else if (g.right) g.p.x += speed * dt;
      else if (g.pointer.down) {
        const d = g.pointer.x - g.p.x;
        g.p.x += Math.sign(d) * Math.min(Math.abs(d), 600 * dt);
      }
      g.p.x = clamp(g.p.x, 30, g.W - 30);

      g.next -= dt;
      if (g.next <= 0) {
        g.next = Math.max(0.28, 0.9 - g.t * 0.003);
        const beeChance = Math.min(0.5, 0.18 + g.t * 0.0014);
        const r = Math.random();
        const kind = r < beeChance ? 'bee' : r < beeChance + 0.05 ? 'star' : 'bamboo';
        const x = rand(30, g.W - 30);
        g.items.push({
          kind, x, x0: x, y: 40, phase: rand(0, 6),
          vy: (150 + g.t * 1.6) * rand(0.85, 1.15),
          zig: kind === 'bee' && g.t > 60 ? rand(30, 70) : 0,
        });
      }
      const basket = { x: g.p.x, y: g.p.y - 30 };
      for (const it of g.items) {
        it.y += it.vy * dt;
        if (it.zig) it.x = clamp(it.x0 + Math.sin(g.t * 3 + it.phase) * it.zig, 20, g.W - 20);
        if (Math.abs(it.x - basket.x) < 40 && Math.abs(it.y - basket.y) < 26) {
          if (it.kind === 'bamboo') { it.dead = true; g.add(1); }
          else if (it.kind === 'star') { it.dead = true; g.add(5); }
          else if (g.hit()) it.dead = true;
        }
        if (it.y > g.H + 30) it.dead = true;
      }
      g.items = g.items.filter(it => !it.dead);
    },
    draw(ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, g.H);
      grad.addColorStop(0, '#a5d8ff');
      grad.addColorStop(1, '#e7f5ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, g.W, g.H);
      ctx.fillStyle = '#8ce99a';
      for (let x = 10; x < g.W; x += 46) ctx.fillRect(x, g.H - 260 + (x % 3) * 30, 8, 260);
      ctx.fillStyle = '#69db7c';
      ctx.fillRect(0, g.H - 40, g.W, 40);
      for (const it of g.items)
        emoji(ctx, it.kind === 'bee' ? '🐝' : it.kind === 'star' ? '🌟' : '🎋', it.x, it.y, it.kind === 'bamboo' ? 34 : 32);
      if (!blinking()) {
        emoji(ctx, '🐼', g.p.x, g.p.y + 4, 48);
        emoji(ctx, '🧺', g.p.x, g.p.y - 30, 40);
      }
    },
  },

  restaurant: {
    title: 'Noodle Rush',
    icon: '🍜',
    intro: 'The restaurant is open and the guests are hungry! Look at each order and tap the dishes in the right order before the guest runs out of patience.',
    controls: 'Tap the dishes, or press the number keys 1–6.',
    lives: 3,
    invuln: 0,
    init() {
      newOrder();
    },
    update(dt) {
      const o = g.order;
      o.time -= dt;
      if (o.time <= 0) { g.hit(); if (g.running) newOrder(); return; }
      const picks = [];
      for (const k of g.presses) if (/^[1-6]$/.test(k)) picks.push(Number(k) - 1);
      for (const tap of g.taps) {
        const i = dishButtons().findIndex(b => tap.x > b.x && tap.x < b.x + b.s && tap.y > b.y && tap.y < b.y + b.s);
        if (i >= 0) picks.push(i);
      }
      for (const i of picks) {
        const dishes = dishButtons();
        if (i >= dishes.length) continue;
        if (dishes[i].dish === o.items[o.done]) {
          o.done++;
          tone(520 + o.done * 120, 0, 0.1);
          if (o.done === o.items.length) {
            g.add(o.items.length * 2 + (o.time > o.max / 2 ? 2 : 0));
            newOrder();
            return;
          }
        } else {
          g.hit();
          if (g.running) newOrder();
          return;
        }
      }
    },
    draw(ctx) {
      ctx.fillStyle = '#fff4e6';
      ctx.fillRect(0, 0, g.W, g.H);
      ctx.fillStyle = '#ffe8cc';
      for (let y = 0; y < g.H; y += 40)
        for (let x = (y / 40) % 2 * 40; x < g.W; x += 80) ctx.fillRect(x, y, 40, 40);

      const o = g.order;
      emoji(ctx, o.guest, 70, 140, 64);
      // Speech bubble with the order
      const bx = 120, by = 92, bw = g.W - bx - 16, bh = 96;
      ctx.fillStyle = '#fff';
      roundRect(ctx, bx, by, bw, bh, 18);
      ctx.fill();
      ctx.strokeStyle = '#e8590c';
      ctx.lineWidth = 3;
      ctx.stroke();
      const step = Math.min(64, (bw - 20) / o.items.length);
      o.items.forEach((d, i) => {
        const x = bx + 10 + step * i + step / 2;
        ctx.globalAlpha = i < o.done ? 0.3 : 1;
        emoji(ctx, d, x, by + 42, Math.min(46, step - 8));
        ctx.globalAlpha = 1;
        if (i < o.done) emoji(ctx, '✅', x + 14, by + 64, 18);
        if (i === o.done) { ctx.fillStyle = '#e8590c'; ctx.fillRect(x - 14, by + 76, 28, 4); }
      });
      // Patience bar
      const frac = Math.max(0, o.time / o.max);
      ctx.fillStyle = '#dee2e6';
      roundRect(ctx, bx, by + bh + 10, bw, 12, 6);
      ctx.fill();
      ctx.fillStyle = frac > 0.5 ? '#40c057' : frac > 0.25 ? '#fab005' : '#fa5252';
      roundRect(ctx, bx, by + bh + 10, bw * frac, 12, 6);
      ctx.fill();

      ctx.fillStyle = '#1b2a4a';
      ctx.font = 'bold 18px "Comic Sans MS", "Chalkboard SE", cursive';
      ctx.textAlign = 'center';
      ctx.fillText('Tap the dishes in this order 👆', g.W / 2, by + bh + 52);

      dishButtons().forEach((b, i) => {
        ctx.fillStyle = '#fff';
        roundRect(ctx, b.x, b.y, b.s, b.s, 18);
        ctx.fill();
        ctx.strokeStyle = '#ffa94d';
        ctx.lineWidth = 4;
        ctx.stroke();
        emoji(ctx, b.dish, b.x + b.s / 2, b.y + b.s / 2 + 4, b.s * 0.5);
        ctx.fillStyle = '#adb5bd';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(i + 1, b.x + 10, b.y + 20);
      });
      ctx.lineWidth = 1;
    },
  },

  fountain: {
    title: 'Wishing Fountain',
    icon: '⛲',
    intro: 'Throw coins into the fountain and hit the stars to make a wish! Every coin that misses costs a heart, and never hit the ducks.',
    controls: 'Press Space (or tap the screen) to throw a coin straight up.',
    lives: 5,
    invuln: 0,
    init() {
      g.p = { x: g.W / 2, y: g.H - 80, dir: 1 };
      g.coin = null;
      g.items = [];
      g.nextDuck = 8;
    },
    update(dt) {
      g.p.x += g.p.dir * (120 + g.t * 1.4) * dt;
      if (g.p.x < 40) { g.p.x = 40; g.p.dir = 1; }
      if (g.p.x > g.W - 40) { g.p.x = g.W - 40; g.p.dir = -1; }

      const throwIt = g.taps.length || g.presses.some(k => k === ' ' || k === 'ArrowUp' || k === 'Enter');
      if (throwIt && !g.coin) { g.coin = { x: g.p.x, y: g.p.y - 30 }; tone(990, 0, 0.08); }

      const stars = g.items.filter(it => it.kind === 'star').length;
      if (stars < (g.t < 60 ? 3 : 2)) {
        const fromLeft = Math.random() < 0.5;
        const size = Math.max(30, 50 - g.t * 0.08);
        g.items.push({
          kind: 'star', x: fromLeft ? -30 : g.W + 30, y: rand(120, g.H * 0.55),
          vx: (fromLeft ? 1 : -1) * (60 + g.t * 1.2) * rand(0.8, 1.2), size, r: size * 0.5,
        });
      }
      if (g.t > 15) {
        g.nextDuck -= dt;
        if (g.nextDuck <= 0) {
          g.nextDuck = Math.max(1.2, rand(2.5, 5) - g.t * 0.012);
          const fromLeft = Math.random() < 0.5;
          g.items.push({
            kind: 'duck', x: fromLeft ? -30 : g.W + 30, y: rand(120, g.H * 0.62),
            vx: (fromLeft ? 1 : -1) * (80 + g.t * 1.3) * rand(0.8, 1.2), size: 40, r: 20,
          });
        }
      }
      for (const it of g.items) {
        it.x += it.vx * dt;
        if (it.x < -50 || it.x > g.W + 50) it.dead = true;
      }

      if (g.coin) {
        g.coin.y -= 560 * dt;
        for (const it of g.items) {
          if (it.dead || !g.coin || !hitsCircle(it, g.coin, it.r + 12)) continue;
          it.dead = true;
          if (it.kind === 'star') g.add(it.size < 40 ? 3 : 2);
          else g.hit();
          g.coin = null;
        }
        if (g.coin && g.coin.y < 70) { g.coin = null; g.hit(); }
      }
      g.items = g.items.filter(it => !it.dead);
    },
    draw(ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, g.H);
      grad.addColorStop(0, '#e7f5ff');
      grad.addColorStop(1, '#74c0fc');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, g.W, g.H);
      // Water sparkles
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 14; i++) {
        const x = (i * 97 + g.t * 20) % g.W;
        const y = 140 + (i * 53) % (g.H - 260);
        ctx.fillRect(x, y, 10, 3);
      }
      ctx.fillStyle = '#adb5bd';
      ctx.fillRect(0, g.H - 50, g.W, 50);
      ctx.fillStyle = '#ced4da';
      for (let x = 0; x < g.W; x += 50) ctx.fillRect(x + 2, g.H - 48, 46, 20);
      for (const it of g.items) emoji(ctx, it.kind === 'star' ? '⭐' : '🦆', it.x, it.y, it.size, it.kind === 'duck' && it.vx > 0);
      if (g.coin) emoji(ctx, '🪙', g.coin.x, g.coin.y, 28);
      if (!g.coin) emoji(ctx, '🪙', g.p.x, g.p.y - 30, 26);
      emoji(ctx, '🐼', g.p.x, g.p.y + 4, 46);
    },
  },
};

function laneX(lane) { return g.roadX + g.laneW * (lane + 0.5); }

const DISHES = ['🍜', '🍣', '🥟', '🍙', '🍤', '🍡'];
function dishButtons() {
  const n = Math.min(6, 3 + Math.floor(g.t / 40));
  const cols = 3;
  const s = Math.min(110, (g.W - 32 - (cols - 1) * 14) / cols);
  const rows = Math.ceil(n / cols);
  const top = g.H - 30 - rows * s - (rows - 1) * 14;
  const left = (g.W - (cols * s + (cols - 1) * 14)) / 2;
  return DISHES.slice(0, n).map((dish, i) => ({
    dish, s,
    x: left + (i % cols) * (s + 14),
    y: top + Math.floor(i / cols) * (s + 14),
  }));
}
function newOrder() {
  const dishes = dishButtons().map(b => b.dish);
  const maxLen = Math.min(4, 1 + Math.floor(g.t / 45));
  const len = Math.max(1, maxLen - (Math.random() < 0.4 ? 1 : 0));
  const items = Array.from({ length: len }, () => dishes[Math.floor(Math.random() * dishes.length)]);
  const time = Math.max(2.5, 7 - g.t * 0.02) + len * 1.2;
  g.order = { items, done: 0, time, max: time, guest: GUESTS[Math.floor(Math.random() * GUESTS.length)][0] };
}

// ── Engine ──
function openMini(id, firstTime) {
  const def = MINI_GAMES[id];
  const best = (state.best || {})[id];
  miniEl.classList.remove('hidden');
  showCard(`
    <div class="big-emoji">${def.icon}</div>
    <h2>${def.title}</h2>
    ${firstTime ? '<p><b>Your new extra is built!</b> Time to try it out.</p>' : ''}
    <p>${def.intro}</p>
    <p class="controls">🎮 ${def.controls}</p>
    <p class="small">Every 30 seconds a new round starts and it gets harder. The game ends after 4 minutes at most.
      You earn 🪙 for your points (up to ${MAX_REWARD}).${best ? ` Best score: <b>${best}</b>` : ''}</p>
    <button class="btn" id="btn-mini-go">▶ Start!</button>`);
  $('btn-mini-go').onclick = () => startMini(id);
}

function showCard(html) {
  miniCard.innerHTML = html;
  miniCard.classList.remove('hidden');
}

function startMini(id) {
  const def = MINI_GAMES[id];
  miniCard.classList.add('hidden');
  const rect = miniCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  miniCanvas.width = rect.width * dpr;
  miniCanvas.height = rect.height * dpr;
  mctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  g = {
    id, def, W: rect.width, H: rect.height,
    t: 0, round: 1, banner: 2, score: 0,
    lives: def.lives || 3, maxLives: def.lives || 3, invuln: 0,
    pointer: { x: 0, y: 0, down: false }, taps: [], presses: [],
    running: true, last: performance.now(),
    add(n) { g.score += n; tone(880, 0, 0.08); },
    hit() {
      if (g.invuln > 0 || !g.running) return false;
      g.lives--;
      g.invuln = def.invuln ?? 1.5;
      g.shake = 0.3;
      playWrong();
      if (g.lives <= 0) endMini(false);
      return true;
    },
  };
  def.init();
  requestAnimationFrame(frame);
}

function frame(now) {
  if (!g || !g.running) return;
  const dt = Math.min(0.05, (now - g.last) / 1000);
  g.last = now;
  g.t += dt;
  g.invuln = Math.max(0, g.invuln - dt);
  g.shake = Math.max(0, (g.shake || 0) - dt);
  g.banner = Math.max(0, g.banner - dt);
  const round = Math.min(8, 1 + Math.floor(g.t / ROUND_SECONDS));
  if (round !== g.round) { g.round = round; g.banner = 2; playBell(); }

  const held = (...ks) => ks.some(k => keys[k]);
  g.left = held('ArrowLeft', 'a', 'A');
  g.right = held('ArrowRight', 'd', 'D');
  g.up = held('ArrowUp', 'w', 'W');
  g.down = held('ArrowDown', 's', 'S');
  g.action = held(' ');

  g.def.update(dt);
  g.taps = [];
  g.presses = [];
  if (!g.running) return;
  if (g.t >= GAME_SECONDS) { endMini(true); return; }

  mctx.save();
  if (g.shake) mctx.translate(rand(-6, 6), rand(-6, 6));
  g.def.draw(mctx);
  mctx.restore();
  drawMiniHud();
  requestAnimationFrame(frame);
}

function drawMiniHud() {
  const ctx = mctx;
  ctx.fillStyle = 'rgba(27, 42, 74, 0.8)';
  ctx.fillRect(0, 0, g.W, 48);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px "Comic Sans MS", "Chalkboard SE", cursive';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`⭐ ${g.score}`, 12, 24);
  ctx.textAlign = 'center';
  ctx.fillText('❤️'.repeat(g.lives) + '🤍'.repeat(g.maxLives - g.lives), g.W * 0.4, 24);
  const left = Math.max(0, GAME_SECONDS - g.t);
  ctx.fillText(`R${g.round} ⏱ ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, g.W - 108, 24);
  if (g.banner > 0) {
    ctx.globalAlpha = Math.min(1, g.banner);
    ctx.fillStyle = '#1b2a4a';
    roundRect(ctx, g.W / 2 - 130, g.H / 2 - 40, 260, 80, 20);
    ctx.fill();
    ctx.fillStyle = '#ffd43b';
    ctx.font = 'bold 30px "Comic Sans MS", "Chalkboard SE", cursive';
    ctx.fillText(`Round ${g.round}`, g.W / 2, g.H / 2 - 10);
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Comic Sans MS", "Chalkboard SE", cursive';
    ctx.fillText(g.round === 1 ? 'Get ready!' : 'Faster! 🔥', g.W / 2, g.H / 2 + 20);
    ctx.globalAlpha = 1;
  }
}

function endMini(survived) {
  if (!g || !g.running) return;
  g.running = false;
  const { id, def, score } = g;
  let reward = Math.min(MAX_REWARD, score);
  if (survived) reward += FULL_TIME_BONUS;
  state.coins += reward;
  state.best = state.best || {};
  const newBest = score > (state.best[id] || 0);
  if (newBest) state.best[id] = score;
  save();
  updateHud();
  if (survived) playBuild(); else playWrong();
  showCard(`
    <div class="big-emoji">${survived ? '🏆' : def.icon}</div>
    <h2>${survived ? 'You made it to the end!' : 'Game over!'}</h2>
    <p>You reached <b>round ${g.round}</b> and scored <b>${score}</b> points.${newBest && score ? ' 🎉 New best score!' : ''}</p>
    <p class="reward">+${reward} 🪙${survived ? ` (including a ${FULL_TIME_BONUS} coin bonus)` : ''}</p>
    <button class="btn" id="btn-mini-back">🏨 Back to the hotel</button>`);
  $('btn-mini-back').onclick = closeMini;
}

function closeMini() {
  g = null;
  miniEl.classList.add('hidden');
  miniCard.classList.add('hidden');
  if (!screenShop.classList.contains('hidden')) renderShop();
}

function miniOpen() { return !miniEl.classList.contains('hidden'); }

// ── Input ──
const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
document.addEventListener('keydown', e => {
  if (!miniOpen()) return;
  if (GAME_KEYS.includes(e.key)) e.preventDefault();
  if (!g || !g.running) return;
  if (!e.repeat) g.presses.push(e.key);
  keys[e.key] = true;
});
document.addEventListener('keyup', e => { keys[e.key] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

function pointerPos(e) {
  const r = miniCanvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
miniCanvas.addEventListener('pointerdown', e => {
  if (!g || !g.running) return;
  e.preventDefault();
  const p = pointerPos(e);
  if (p.y < 48) return;   // the score bar
  Object.assign(g.pointer, p, { down: true });
  g.taps.push(p);
});
miniCanvas.addEventListener('pointermove', e => {
  if (g && g.pointer.down) Object.assign(g.pointer, pointerPos(e));
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave'])
  miniCanvas.addEventListener(type, () => { if (g) g.pointer.down = false; });

$('btn-mini-quit').onclick = () => {
  if (g && g.running) endMini(false);
  else closeMini();
};
