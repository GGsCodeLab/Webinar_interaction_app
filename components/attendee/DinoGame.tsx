"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 310;
const GROUND_Y = 255;
const DINO_X = 80;
const DINO_W = 38;
const DINO_H = 50;        // top of head → bottom of torso (legs hang below)
const GRAVITY = 0.72;
const JUMP_FORCE = -15;
const CACTUS_W = 22;
const CACTUS_MIN_H = 38;
const CACTUS_MAX_H = 68;
const HIT_INSET = 8;      // smaller hitbox than sprite — feels fair

type Cactus = { x: number; w: number; h: number };
type Props = { onScore: (score: number) => void; highScore: { name: string; score: number } | null };

// ── Bearded man character ─────────────────────────────────────────────────────
function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  alive: boolean
) {
  const skin       = alive ? "#f4c27f" : "#c9956a";
  const hairColor  = "#0a0a0a";
  const beardColor = "#0a0a0a";
  const shirtColor = alive ? "#fafafa" : "#e5e5e5";
  const pantsColor = "#a67c52";
  const shoeColor  = "#0f172a";
  const glassColor = "#1e293b";
  const glassShine = "#94a3b8";

  const phase = frame % 20;

  // ── Arms (behind body) ──────────────────────────────────────────────────
  const armSwingL = phase < 10 ? 5 : -2;
  const armSwingR = phase < 10 ? -2 : 5;
  ctx.fillStyle = shirtColor;
  ctx.fillRect(x,      y + 23 + armSwingL, 7, 13); // left arm
  ctx.fillRect(x + 31, y + 23 + armSwingR, 7, 13); // right arm
  ctx.fillStyle = skin;
  ctx.fillRect(x,      y + 34 + armSwingL, 7, 6);  // left hand
  ctx.fillRect(x + 31, y + 34 + armSwingR, 7, 6);  // right hand

  // ── Torso / shirt ───────────────────────────────────────────────────────
  ctx.fillStyle = shirtColor;
  ctx.fillRect(x + 6, y + 22, 26, 20); // shirt body

  // ── Pants ───────────────────────────────────────────────────────────────
  ctx.fillStyle = pantsColor;
  ctx.fillRect(x + 8, y + 41, 22, 9);

  // ── Legs (animated) ─────────────────────────────────────────────────────
  const legFwd  = phase < 10 ? 15 : 9;
  const legBack = phase < 10 ? 9  : 15;
  ctx.fillStyle = pantsColor;
  ctx.fillRect(x + 9,  y + DINO_H, 10, legFwd);  // left leg
  ctx.fillRect(x + 21, y + DINO_H, 10, legBack); // right leg

  // Shoes
  ctx.fillStyle = shoeColor;
  ctx.fillRect(x + 6,  y + DINO_H + legFwd,  16, 5); // left shoe
  ctx.fillRect(x + 18, y + DINO_H + legBack, 16, 5); // right shoe

  // ── Face / head ─────────────────────────────────────────────────────────
  ctx.fillStyle = skin;
  ctx.fillRect(x + 9, y + 5, 20, 19); // face

  // ── Hair ────────────────────────────────────────────────────────────────
  ctx.fillStyle = hairColor;
  ctx.fillRect(x + 7,  y,     24, 9); // top hair
  ctx.fillRect(x + 5,  y + 4, 5,  9); // left sideburn
  ctx.fillRect(x + 28, y + 4, 5,  7); // right sideburn

  // ── Beard ────────────────────────────────────────────────────────────────
  ctx.fillStyle = beardColor;
  ctx.fillRect(x + 6,  y + 18, 26, 7); // upper beard (wide)
  ctx.fillRect(x + 8,  y + 25, 22, 6); // mid beard
  ctx.fillRect(x + 11, y + 31, 16, 4); // lower taper
  ctx.fillRect(x + 14, y + 35, 10, 3); // chin tip

  // ── Eyebrows ─────────────────────────────────────────────────────────────
  ctx.fillStyle = hairColor;
  ctx.fillRect(x + 10, y + 7, 5, 2);  // left eyebrow
  ctx.fillRect(x + 22, y + 7, 5, 2);  // right eyebrow

  // ── Eyes (two) ──────────────────────────────────────────────────────────
  if (alive) {
    // Left eye
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 10, y + 9, 6, 5);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + 12, y + 10, 2, 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 12, y + 10, 1, 1);
    // Right eye
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 22, y + 9, 6, 5);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + 24, y + 10, 2, 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 24, y + 10, 1, 1);
  } else {
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(x + 11, y + 9,  2, 2);
    ctx.fillRect(x + 14, y + 9,  2, 2);
    ctx.fillRect(x + 12, y + 11, 2, 2);
    ctx.fillRect(x + 11, y + 13, 2, 2);
    ctx.fillRect(x + 14, y + 13, 2, 2);
    ctx.fillRect(x + 23, y + 9,  2, 2);
    ctx.fillRect(x + 26, y + 9,  2, 2);
    ctx.fillRect(x + 24, y + 11, 2, 2);
    ctx.fillRect(x + 23, y + 13, 2, 2);
    ctx.fillRect(x + 26, y + 13, 2, 2);
  }

  // ── Glasses (each lens over one eye) ─────────────────────────────────────
  ctx.strokeStyle = glassColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 8,  y + 8, 10, 8);   // left lens over left eye
  ctx.strokeRect(x + 22, y + 8, 10, 8);   // right lens over right eye
  ctx.fillStyle = glassColor;
  ctx.fillRect(x + 17, y + 11, 5, 2);     // bridge
  ctx.fillRect(x + 7,  y + 11, 2, 2);     // left temple
  ctx.fillRect(x + 31, y + 11, 2, 2);     // right temple
  ctx.fillStyle = glassShine;
  ctx.fillRect(x + 10, y + 9, 2, 2);      // left lens shine
  ctx.fillRect(x + 24, y + 9, 2, 2);      // right lens shine

  // ── Nose ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#d4956a";
  ctx.fillRect(x + 22, y + 15, 3, 3);
}

function drawCactus(ctx: CanvasRenderingContext2D, c: Cactus) {
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(c.x, GROUND_Y - c.h, c.w, c.h);           // trunk
  ctx.fillRect(c.x - 10, GROUND_Y - c.h + 12, 10, 12);   // left arm
  ctx.fillRect(c.x - 10, GROUND_Y - c.h + 6, 7, 7);      // left arm top
  ctx.fillRect(c.x + c.w, GROUND_Y - c.h + 12, 10, 12);  // right arm
  ctx.fillRect(c.x + c.w + 3, GROUND_Y - c.h + 6, 7, 7); // right arm top
}

export function DinoGame({ onScore, highScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef({
    dinoY:    GROUND_Y - DINO_H,
    velY:     0,
    isJumping: false,
    cacti:    [] as Cactus[],
    score:    0,
    speed:    4,
    frameCount: 0,
    alive:    false,
    started:  false,
    legFrame: 0,
  });
  const rafRef = useRef<number | null>(null);
  const lastMilestoneRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);

  function playMilestoneBeep() {
    try {
      const audio = typeof window !== "undefined" ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext : null;
      if (!audio) return;
      const ctx = new audio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (_) {}
  }

  function jump() {
    const s = stateRef.current;
    if (!s.started) { s.started = true; s.alive = true; }
    if (!s.isJumping && s.alive) { s.velY = JUMP_FORCE; s.isJumping = true; }
  }

  function reset() {
    const s = stateRef.current;
    s.dinoY = GROUND_Y - DINO_H;
    s.velY = 0;
    s.isJumping = false;
    s.cacti = [];
    s.score = 0;
    s.speed = 4;
    s.frameCount = 0;
    s.alive = true;
    s.started = true;
    s.legFrame = 0;
    lastMilestoneRef.current = 0;
    setDisplayScore(0);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        const s = stateRef.current;
        if (s.started && !s.alive) { reset(); return; }
        jump();
      }
    }
    function handleClick() {
      const s = stateRef.current;
      if (s.started && !s.alive) { reset(); return; }
      jump();
    }

    window.addEventListener("keydown", handleKey);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); handleClick(); }, { passive: false });

    function loop() {
      const s = stateRef.current;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ground
      ctx.fillStyle = "#d1d5db";
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);

      if (!s.started) {
        drawCharacter(ctx, DINO_X, GROUND_Y - DINO_H, 0, true);
        ctx.fillStyle = "#6b7280";
        ctx.font = "18px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Press SPACE or tap to start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
        ctx.textAlign = "left";
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (!s.alive) {
        s.cacti.forEach((c) => drawCactus(ctx, c));
        drawCharacter(ctx, DINO_X, s.dinoY, s.legFrame, false);
        ctx.fillStyle = "#1f2937";
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, 70);
        ctx.font = "15px monospace";
        ctx.fillStyle = "#6b7280";
        ctx.fillText(`Score: ${Math.floor(s.score)}`, CANVAS_WIDTH / 2, 98);
        ctx.fillText("Press SPACE or tap to restart", CANVAS_WIDTH / 2, 122);
        ctx.textAlign = "left";
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── Physics ──────────────────────────────────────────────────────────
      s.frameCount++;
      s.legFrame++;
      s.score += 0.1;

      // Every 20 points play a short beep
      const scoreFloor = Math.floor(s.score);
      const nextMilestone = lastMilestoneRef.current + 20;
      if (scoreFloor >= nextMilestone && nextMilestone > 0) {
        lastMilestoneRef.current = nextMilestone;
        playMilestoneBeep();
      }

      // Speed increases by 1.2 every 100 points
      s.speed = 4 + Math.floor(s.score / 100) * 1.2;

      s.velY += GRAVITY;
      s.dinoY += s.velY;
      if (s.dinoY >= GROUND_Y - DINO_H) {
        s.dinoY = GROUND_Y - DINO_H;
        s.velY = 0;
        s.isJumping = false;
      }

      // ── Spawn cacti ────────────────────────────────────────────────────
      const spawnInterval = Math.max(38, Math.floor(88 - s.speed * 3.5));
      if (s.cacti.length === 0 || s.frameCount % spawnInterval === 0) {
        const h = CACTUS_MIN_H + Math.random() * (CACTUS_MAX_H - CACTUS_MIN_H);
        const last = s.cacti[s.cacti.length - 1];
        if (!last || last.x < CANVAS_WIDTH - 260) {
          s.cacti.push({ x: CANVAS_WIDTH + 10, w: CACTUS_W, h });
        }
      }

      s.cacti = s.cacti
        .map((c) => ({ ...c, x: c.x - s.speed }))
        .filter((c) => c.x + c.w + 12 > 0);

      // ── Collision (inset hitbox) ──────────────────────────────────────
      const dinoLeft   = DINO_X + HIT_INSET;
      const dinoRight  = DINO_X + DINO_W - HIT_INSET;
      const dinoTop    = s.dinoY + HIT_INSET;
      const dinoBottom = s.dinoY + DINO_H - HIT_INSET;

      for (const c of s.cacti) {
        const cLeft  = c.x + 3;
        const cRight = c.x + c.w - 3;
        const cTop   = GROUND_Y - c.h;

        if (dinoRight > cLeft && dinoLeft < cRight && dinoBottom > cTop && dinoTop < GROUND_Y) {
          s.alive = false;
          onScore(Math.floor(s.score));
          break;
        }
      }

      setDisplayScore(Math.floor(s.score));

      // ── Draw ─────────────────────────────────────────────────────────
      s.cacti.forEach((c) => drawCactus(ctx, c));
      drawCharacter(ctx, DINO_X, s.dinoY, s.legFrame, true);

      // Score display
      ctx.fillStyle = "#9ca3af";
      ctx.font = "15px monospace";
      ctx.textAlign = "right";
      ctx.fillText(Math.floor(s.score).toString().padStart(5, "0"), CANVAS_WIDTH - 12, 22);
      // Speed tier label
      const tier = Math.floor(s.score / 100);
      if (tier > 0) {
        ctx.fillStyle = "#6b7280";
        ctx.font = "12px monospace";
        ctx.fillText(`Lvl ${tier + 1}`, CANVAS_WIDTH - 12, 40);
      }
      ctx.textAlign = "left";

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("click", handleClick);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="max-w-full cursor-pointer rounded-lg border bg-white"
        style={{ maxWidth: "min(800px, 95vw)" }}
      />
      {highScore && (
        <p className="text-sm text-muted-foreground">
          🏆 High Score:{" "}
          <span className="font-semibold text-foreground">
            {highScore.name} — {highScore.score.toLocaleString()}
          </span>
        </p>
      )}
    </div>
  );
}
