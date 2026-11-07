"use client";
import { useEffect, useRef, useState } from "react";
export function useGameSound() {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true), context = useRef<AudioContext | null>(null);
  useEffect(() => { try { const value = localStorage.getItem("kurumsal-game-sound") !== "off"; enabledRef.current = value; setEnabled(value); } catch {} return () => { void context.current?.close(); }; }, []);
  function toggle() { const next = !enabledRef.current; enabledRef.current = next; setEnabled(next); try { localStorage.setItem("kurumsal-game-sound", next ? "on" : "off"); } catch {} }
  function unlock() { try { context.current ??= new AudioContext(); void context.current.resume(); } catch {} }
  function play(kind: "jump" | "eat" | "death" | "line" | "lock") {
    if (!enabledRef.current || !context.current || context.current.state !== "running") return;
    const ctx = context.current, oscillator = ctx.createOscillator(), gain = ctx.createGain();
    const frequency = { jump: 550, eat: 750, death: 130, line: 1000, lock: 260 }[kind];
    const duration = kind === "death" ? .3 : .09;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(kind === "death" ? 45 : frequency * 1.3, ctx.currentTime + duration);
    gain.gain.setValueAtTime(.035, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  return { enabled, toggle, unlock, play };
}
