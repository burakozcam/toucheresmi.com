"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Obstacle = { x: number; width: number; height: number };

export default function BreakGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({ playerY: 0, velocity: 0, obstacles: [] as Obstacle[], frame: 0, score: 0, jumped: false });
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const jump = useCallback(() => {
    if (!running) return;
    const game = gameRef.current;
    if (game.playerY === 0) {
      game.velocity = -12;
      game.jumped = true;
    }
  }, [running]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const width = canvas.width;
    const ground = canvas.height - 34;
    let frameId = 0;
    let lastScore = 0;

    const drawBird = (x: number, y: number, frame: number) => {
      context.save();
      context.translate(x, y);
      context.fillStyle = "#f5a640";
      context.beginPath();
      context.moveTo(-15, 0);
      context.lineTo(-29, -7);
      context.lineTo(-24, 5);
      context.closePath();
      context.fill();
      context.fillStyle = "#fff8e9";
      context.beginPath();
      context.ellipse(0, 0, 19, 14, -.12, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#f1c96a";
      context.save();
      context.translate(-3, 3);
      context.rotate(Math.sin(frame / 5) * .5);
      context.beginPath();
      context.ellipse(-3, 1, 10, 5, -.2, 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.fillStyle = "#f5a640";
      context.beginPath();
      context.moveTo(15, -3);
      context.lineTo(27, 1);
      context.lineTo(15, 5);
      context.closePath();
      context.fill();
      context.fillStyle = "#20334c";
      context.beginPath();
      context.arc(9, -6, 2, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#c87939";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-5, 12);
      context.lineTo(-5, 16);
      context.moveTo(5, 12);
      context.lineTo(5, 16);
      context.stroke();
      context.restore();
    };

    const drawScene = (frame: number, playerY = 0) => {
      const sky = context.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, "#8bd5f1");
      sky.addColorStop(.7, "#d4f1fb");
      sky.addColorStop(.701, "#d9efbf");
      sky.addColorStop(1, "#9acb78");
      context.fillStyle = sky;
      context.fillRect(0, 0, width, canvas.height);
      context.fillStyle = "#fff2bd";
      context.beginPath();
      context.arc(610, 48, 23, 0, Math.PI * 2);
      context.fill();

      for (let index = 0; index < 4; index += 1) {
        const cloudX = (index * 205 + 65 - frame * (.18 + index * .025) % (width + 90) + width + 90) % (width + 90) - 45;
        const cloudY = 39 + (index % 2) * 29;
        context.fillStyle = "#ffffffb8";
        context.beginPath();
        context.ellipse(cloudX, cloudY, 27, 8, 0, 0, Math.PI * 2);
        context.ellipse(cloudX - 13, cloudY + 1, 12, 7, 0, 0, Math.PI * 2);
        context.ellipse(cloudX + 11, cloudY - 5, 13, 10, 0, 0, Math.PI * 2);
        context.fill();
      }

      context.fillStyle = "#a9d8bd";
      context.beginPath();
      context.moveTo(0, ground - 27);
      context.quadraticCurveTo(150, ground - 72, 300, ground - 26);
      context.quadraticCurveTo(510, ground - 83, width, ground - 28);
      context.lineTo(width, ground);
      context.lineTo(0, ground);
      context.fill();
      context.fillStyle = "#80bd75";
      context.fillRect(0, ground, width, canvas.height - ground);
      context.fillStyle = "#e9f5d2";
      context.fillRect(0, ground, width, 3);
      context.fillStyle = "#719f5f";
      for (let index = 0; index < 23; index += 1) {
        const grassX = (index * 43 - frame * 2.4 % (width + 20) + width + 20) % (width + 20);
        context.fillRect(grassX, ground + 11 + (index % 3) * 4, 12, 2);
      }
      drawBird(72, ground - 20 + playerY, frame);
    };

    if (!running) {
      drawScene(0);
      return;
    }

    const draw = () => {
      const game = gameRef.current;
      game.frame += 1;
      game.velocity += 0.58;
      game.playerY = Math.min(0, game.playerY + game.velocity);
      if (game.playerY === 0) game.velocity = 0;

      if (game.frame % 92 === 0) game.obstacles.push({ x: width, width: 20, height: 29 });
      const speed = 4 + Math.min(3, game.score / 350);
      game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + obstacle.width > 0);
      drawScene(game.frame, game.playerY);
      let collided = false;
      game.obstacles.forEach((obstacle) => {
        obstacle.x -= speed;
        const trunkY = ground - obstacle.height;
        context.fillStyle = "#357b58";
        context.fillRect(obstacle.x + 7, trunkY, 8, obstacle.height);
        context.fillRect(obstacle.x, trunkY + 8, 11, 6);
        context.fillRect(obstacle.x + 12, trunkY + 15, 8, 6);
        context.fillStyle = "#65ad70";
        context.fillRect(obstacle.x + 9, trunkY + 2, 3, obstacle.height - 3);
        if (obstacle.x < 90 && obstacle.x + obstacle.width > 48 && game.playerY > -obstacle.height + 8) collided = true;
      });

      if (collided) {
        setGameOver(true);
        setRunning(false);
        return;
      }

      if (game.jumped && game.playerY === 0) {
        game.score += 1;
        game.jumped = false;
      } else if (game.frame % 5 === 0) {
        game.score += 1;
      }
      if (game.score !== lastScore && game.frame % 8 === 0) {
        lastScore = game.score;
        setScore(game.score);
      }
      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frameId);
  }, [running]);

  function start() {
    gameRef.current = { playerY: 0, velocity: 0, obstacles: [], frame: 0, score: 0, jumped: false };
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }

  return (
    <section className="break-card">
      <div className="break-heading"><span className="break-icon">☕</span><div><p className="hero-tag">KISA BİR MOLA</p><h2>Kuşunla engelleri aş</h2></div></div>
      <p className="break-description">Minik kuşu engellerin üzerinden uçur. Zıplamak için <kbd>Boşluk</kbd>, <kbd>↑</kbd> veya oyun alanına tıkla.</p>
      <div className="game-stage" onClick={jump} role="button" tabIndex={0} aria-label="Kuş oyunu. Zıplamak için boşluk tuşuna bas.">
        <canvas ref={canvasRef} width={720} height={220} />
        {!running && <div className="game-overlay"><span className="game-mascot" aria-hidden="true">🐦</span><strong>{gameOver ? "Oyun bitti" : "Hazır olduğunda başla"}</strong><span>{gameOver ? `Skorun: ${score}` : "Kısa bir mola ver, reflekslerini dene."}</span><button className="button button-navy" onClick={(event) => { event.stopPropagation(); start(); }}>{gameOver ? "Tekrar oyna" : "Oyuna başla"}</button></div>}
      </div>
      <div className="game-footer"><span>Skor <strong>{score}</strong></span><span>Oyun yalnızca bu bölüm açıkken çalışır.</span></div>
    </section>
  );
}
