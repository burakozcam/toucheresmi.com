"use client";
import { useEffect, useRef, useState } from "react";
type Point = { x: number; y: number };
type Tower = { x: number; center: number; gap: number; passed: boolean };
const W = 720, H = 360, CELL = 24, COLS = 30, ROWS = 15;
function logo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = "#4169a9"; ctx.beginPath(); ctx.roundRect(x, y, size, size, [size * .28, size * .28, size * .28, size * .06]); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 64, size / 64); ctx.fillStyle = "#fff";
  ctx.fill(new Path2D("M17 13h9v17l16-17h12L35 31l19 20H42L29 37l-3 3v11h-9z")); ctx.restore();
}
function foodFor(snake: Point[]): Point | null {
  const cells: Point[] = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!snake.some((p) => p.x === x && p.y === y)) cells.push({ x, y });
  return cells.length ? cells[Math.floor(Math.random() * cells.length)] : null;
}
const initial = () => ({ y: H / 2, v: 0, distance: 0, next: 280, towers: [] as Tower[], snake: [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }], dir: { x: 1, y: 0 }, queued: { x: 1, y: 0 }, food: { x: 18, y: 7 } as Point | null, score: 0 });
export default function BreakGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"bird" | "snake">("bird");
  const [status, setStatus] = useState<"ready" | "running" | "paused" | "over" | "won">("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState({ bird: 0, snake: 0 });
  const game = useRef(initial());
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("kurumsal-game-best") ?? "{}"); setBest({ bird: Number(saved.bird) || 0, snake: Number(saved.snake) || 0 }); } catch { /* Optional local records. */ } }, []);
  useEffect(() => { setBest((current) => { const next = { ...current, [mode]: Math.max(current[mode], score) }; try { localStorage.setItem("kurumsal-game-best", JSON.stringify(next)); } catch { /* Gameplay stays available. */ } return next; }); }, [mode, score]);
  function start() { game.current = initial(); setScore(0); setStatus("running"); }
  function direction(x: number, y: number) { const g = game.current; if (g.dir.x !== -x || g.dir.y !== -y) g.queued = { x, y }; }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (status !== "running" || (event.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(event.target.tagName))) return;
      const directions: Record<string, Point> = { ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 } };
      if (event.code === "Space" || directions[event.key] || event.key.toLowerCase() === "p") event.preventDefault();
      if (event.key.toLowerCase() === "p") setStatus("paused");
      else if (mode === "bird" && (event.code === "Space" || event.code === "ArrowUp")) game.current.v = -4.8;
      else if (mode === "snake" && directions[event.key]) direction(directions[event.key].x, directions[event.key].y);
    };
    const hide = () => { if (document.hidden && status === "running") setStatus("paused"); };
    window.addEventListener("keydown", key); document.addEventListener("visibilitychange", hide);
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("visibilitychange", hide); };
  }, [status, mode]);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0, last = 0, accumulator = 0;
    function draw() {
      if (!ctx) return;
      const g = game.current;
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#11223f"); bg.addColorStop(1, "#233f68"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#8bb2ff12"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      if (mode === "bird") {
        g.towers.forEach((tower) => {
          const top = tower.center - tower.gap / 2, bottom = tower.center + tower.gap / 2;
          ctx.fillStyle = "#4169a9"; ctx.fillRect(tower.x, 0, 44, top); ctx.fillRect(tower.x, bottom, 44, H - bottom);
          ctx.fillStyle = "#8bb2ff"; ctx.fillRect(tower.x - 4, top - 10, 52, 10); ctx.fillRect(tower.x - 4, bottom, 52, 10);
        }); logo(ctx, 100, g.y - 16, 32);
      } else {
        g.snake.forEach((p, i) => { if (i === 0) logo(ctx, p.x * CELL + 1, p.y * CELL + 1, CELL - 2); else { ctx.fillStyle = i % 2 ? "#8bb2ff" : "#5c84c1"; ctx.beginPath(); ctx.roundRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4, 6); ctx.fill(); } });
        if (g.food) { ctx.fillStyle = "#e4efff"; ctx.beginPath(); ctx.arc(g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2, 6, 0, Math.PI * 2); ctx.fill(); }
      }
      if (status !== "running") {
        ctx.fillStyle = "#11223fbb"; ctx.fillRect(0, 0, W, H); logo(ctx, W / 2 - 24, 100, 48);
        ctx.fillStyle = "#fff"; ctx.font = "700 23px Manrope, sans-serif"; ctx.textAlign = "center"; ctx.fillText(status === "over" ? "Bir tur daha?" : status === "won" ? "Harika! Alanı tamamladın." : status === "paused" ? "Kısa bir ara" : mode === "bird" ? "K ile uçuşa geç" : "K ile izini takip et", W / 2, 186);
        ctx.font = "14px sans-serif"; ctx.fillStyle = "#b4c9ea"; ctx.fillText(status === "over" || status === "won" ? `Skorun: ${g.score}` : "Aşağıdaki düğmeyle başla veya devam et", W / 2, 220);
      }
    }
    function tick() {
      const g = game.current;
      if (mode === "bird") {
        const speed = 2.8 + Math.min(1.4, g.score * .035); g.v += .23; g.y += g.v; g.distance += speed;
        if (g.distance >= g.next) {
          const previous = g.towers.at(-1)?.center ?? H / 2;
          const center = Math.max(95, Math.min(H - 95, previous + (Math.random() - .5) * 130));
          g.towers.push({ x: W, center, gap: 145 + Math.random() * 25, passed: false }); g.next = g.distance + 240 + Math.random() * 85;
        }
        g.towers.forEach((t) => { t.x -= speed; if (!t.passed && t.x + 48 < 100) { t.passed = true; g.score++; setScore(g.score); } });
        g.towers = g.towers.filter((t) => t.x > -60);
        if (g.y < 16 || g.y > H - 16 || g.towers.some((t) => t.x - 4 < 132 && t.x + 48 > 100 && (g.y - 15 < t.center - t.gap / 2 || g.y + 15 > t.center + t.gap / 2))) { setStatus("over"); return false; }
      } else {
        g.dir = { ...g.queued }; const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
        const eats = Boolean(g.food && head.x === g.food.x && head.y === g.food.y), body = eats ? g.snake : g.snake.slice(0, -1);
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || body.some((p) => p.x === head.x && p.y === head.y)) { setStatus("over"); return false; }
        g.snake.unshift(head);
        if (eats) { g.score += 10; setScore(g.score); g.food = foodFor(g.snake); if (!g.food) { setStatus("won"); return false; } } else g.snake.pop();
      } return true;
    }
    const animate = (time: number) => {
      accumulator += last ? Math.min(time - last, 100) : 0; last = time;
      const step = mode === "bird" ? 1000 / 60 : Math.max(75, 150 - game.current.score / 5);
      while (status === "running" && accumulator >= step) { accumulator -= step; if (!tick()) { draw(); return; } }
      draw(); if (status === "running") frame = requestAnimationFrame(animate);
    };
    draw(); if (status === "running") frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [mode, status]);
  return <section className="studio-card game-studio"><div className="game-heading"><div><p className="hero-tag">KISA BİR MOLA</p><h2>Küçük bir oyun. Taze bir zihin.</h2></div><div className="game-tabs" role="group" aria-label="Oyun seçimi">{(["bird", "snake"] as const).map((m) => <button className={mode === m ? "active" : ""} aria-pressed={mode === m} key={m} onClick={() => { game.current = initial(); setStatus("ready"); setScore(0); setMode(m); }}>{m === "bird" ? "Kuş uçuşu" : "Yılan"}</button>)}</div></div><div className="game-scores"><span>Skor <b>{score}</b></span><span>En iyi <b>{best[mode]}</b></span><span className="badge">Kurumsal Sınav Arcade</span></div><canvas ref={canvasRef} width={W} height={H} className="brand-game-canvas" aria-label={mode === "bird" ? "K logosunu rastgele kulelerin arasından uçurun" : "K başlıklı yılanı yönlendirin"} onPointerDown={() => { if (status === "running" && mode === "bird") game.current.v = -4.8; }} /><div className="game-controls"><p>{mode === "bird" ? "Boşluk / ↑ veya oyun alanına dokun: yüksel. Rastgele kulelerin arasından geç." : "Yön tuşları / WASD veya aşağıdaki düğmeler: yön değiştir. Duvarlardan ve kendinden kaçın."} P: duraklat.</p><div className="studio-actions">{status === "running" ? <button className="button button-quiet" onClick={() => setStatus("paused")}>Duraklat</button> : status === "paused" ? <button className="button button-navy" onClick={() => setStatus("running")}>Devam et</button> : <button className="button button-navy" onClick={start}>{status === "ready" ? "Oyuna başla" : "Yeniden oyna"}</button>}</div></div>{mode === "snake" && <div className="direction-pad" aria-label="Yılan yön düğmeleri">{[[0, -1, "↑", "Yukarı"], [-1, 0, "←", "Sola"], [0, 1, "↓", "Aşağı"], [1, 0, "→", "Sağa"]].map(([x, y, label, name]) => <button key={String(name)} className="button button-quiet" aria-label={String(name)} disabled={status !== "running"} onClick={() => direction(Number(x), Number(y))}>{label}</button>)}</div>}</section>;
}
