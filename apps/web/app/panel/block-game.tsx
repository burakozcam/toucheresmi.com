"use client";
import { useEffect, useRef, useState } from "react";
import { canPlace, emptyBoard, newPiece, rotateBlock, settleBlock } from "../../lib/blocks";
import { useGameSound } from "../../lib/game-sound";
const colors = ["#14243e", "#22d3ee", "#facc15", "#c084fc", "#fb923c", "#4ade80", "#fb7185", "#60a5fa"];
const initial = () => ({ board: emptyBoard(), piece: newPiece(), next: newPiece(), score: 0, lines: 0 });
export default function BlockGame() {
  const game = useRef(initial()), canvas = useRef<HTMLCanvasElement>(null), nextCanvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("ready"), [revision, setRevision] = useState(0);
  const sound = useGameSound();
  const level = Math.floor(game.current.lines / 10) + 1;
  function redraw() { setRevision((r) => r + 1); }
  function start() { sound.unlock(); game.current = initial(); setStatus("running"); redraw(); }
  function move(action: string) {
    if (status !== "running") return;
    const g = game.current; let p = { ...g.piece };
    if (action === "rotate") {
      p.shape = rotateBlock(p.shape);
      for (const offset of [0, -1, 1, -2, 2]) { const candidate = { ...p, x: p.x + offset }; if (canPlace(g.board, candidate)) { g.piece = candidate; redraw(); return; } }
      return;
    }
    if (action === "left") p.x--; else if (action === "right") p.x++; else if (action === "down") p.y++;
    else if (action === "drop") { while (canPlace(g.board, { ...p, y: p.y + 1 })) { p.y++; g.score += 2; } }
    if (action !== "drop" && canPlace(g.board, p)) { g.piece = p; redraw(); return; }
    if (action === "left" || action === "right") return;
    const result = settleBlock(g.board, action === "drop" ? p : g.piece);
    g.board = result.board; g.lines += result.cleared; g.score += [0,100,300,500,800][result.cleared] * level;
    sound.play(result.cleared ? "line" : "lock");
    g.piece = g.next; g.next = newPiece();
    if (!canPlace(g.board, g.piece)) { setStatus("over"); sound.play("death"); }
    redraw();
  }
  const moveRef = useRef(move); moveRef.current = move;
  useEffect(() => { if (status !== "running") return; const timer = setInterval(() => moveRef.current("down"), Math.max(90, 800 - (level - 1) * 65)); return () => clearInterval(timer); }, [status, level]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (status !== "running" || e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; const actions: Record<string,string> = { ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down", ArrowUp: "rotate", Space: "drop" }; if (actions[e.code]) { e.preventDefault(); moveRef.current(actions[e.code]); } if (e.code === "KeyP") { e.preventDefault(); setStatus("paused"); } };
    const hide = () => { if (document.hidden) setStatus((s) => s === "running" ? "paused" : s); };
    window.addEventListener("keydown", key); document.addEventListener("visibilitychange", hide); return () => { window.removeEventListener("keydown", key); document.removeEventListener("visibilitychange", hide); };
  }, [status]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"), next = nextCanvas.current?.getContext("2d"); if (!ctx || !next) return;
    const cell = (context: CanvasRenderingContext2D, x: number, y: number, color: number) => { context.fillStyle = colors[color]; context.fillRect(x * 24 + 1, y * 24 + 1, 22, 22); };
    ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, 240, 480);
    game.current.board.forEach((r, y) => r.forEach((v, x) => cell(ctx, x, y, v)));
    const p = game.current.piece; p.shape.forEach((r,y) => r.forEach((v,x) => { if (v) cell(ctx, p.x + x, p.y + y, p.color); }));
    next.clearRect(0, 0, 120, 96); game.current.next.shape.forEach((r,y) => r.forEach((v,x) => { if (v) cell(next, x, y, game.current.next.color); }));
    if (status !== "running") { ctx.fillStyle = "#11223fbb"; ctx.fillRect(0, 0, 240, 480); ctx.fillStyle = "white"; ctx.font = "18px sans-serif"; ctx.textAlign = "center"; ctx.fillText(status === "over" ? "Oyun bitti" : status === "paused" ? "Duraklatıldı" : "Blok zamanı", 120, 230); }
  }, [revision, status]);
  return <section className="studio-card game-studio"><h2>Blok Zamanı</h2><div className="game-scores"><span>Skor <b>{game.current.score}</b></span><span>Seviye <b>{level}</b></span><span>Satır <b>{game.current.lines}</b></span></div><div className="blocks-layout"><canvas ref={canvas} width={240} height={480} className="blocks-canvas" aria-label="Blok oyunu alanı" /><aside><p>Sonraki parça</p><canvas ref={nextCanvas} width={120} height={96} aria-label="Sonraki parça" /><p>← → taşı · ↑ döndür<br/>↓ indir · Boşluk hızlı düşür<br/>P duraklat</p></aside></div><div className="studio-actions"><button className="button button-navy" onClick={start}>{status === "ready" ? "Başlat" : "Yeniden başlat"}</button>{status === "running" || status === "paused" ? <button className="button button-quiet" onClick={() => { sound.unlock(); setStatus(status === "running" ? "paused" : "running"); }}>{status === "running" ? "Duraklat" : "Devam et"}</button> : null}<button className="button button-quiet" aria-pressed={sound.enabled} onClick={() => { sound.unlock(); sound.toggle(); }}>Ses: {sound.enabled ? "Açık" : "Kapalı"}</button></div><div className="direction-pad" style={{ touchAction: "none" }}>{[["left","←"],["rotate","Döndür ↻"],["right","→"],["down","↓"],["drop","Hızlı düşür"]].map(([action,label]) => <button key={action} className="button button-quiet" disabled={status !== "running"} onClick={(e) => { if (e.detail === 0) { sound.unlock(); move(action); } }} onPointerDown={(e) => { e.preventDefault(); sound.unlock(); move(action); }}>{label}</button>)}</div></section>;
}
