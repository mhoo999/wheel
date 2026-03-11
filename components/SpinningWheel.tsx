"use client";

import { useRef, useEffect, useCallback, useState } from "react";

const COLORS = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF922B",
  "#CC5DE8", "#20C997", "#F06595", "#74C0FC", "#A9E34B",
  "#FF8787", "#FFE066", "#8CE99A", "#74C0FC", "#FFA94D",
  "#DA77F2", "#63E6BE", "#F783AC", "#4DABF7", "#C0EB75",
];

interface SpinningWheelProps {
  names: string[];
  onWinner: (name: string) => void;
}

// ─── Drama script ───────────────────────────────────────────────────────────
// Each event runs in sequence. velocity is in rad/s (negative = clockwise).
type DramaStep =
  | { kind: "accelerate"; to: number; rate: number }          // ramp up speed
  | { kind: "cruise"; speed: number; duration: number }       // hold speed
  | { kind: "fake_stop"; duration: number; minSpeed: number } // slow to almost-stop
  | { kind: "hold_breath"; duration: number }                  // barely moving, hold
  | { kind: "reaccel"; to: number; duration: number }         // burst back to life
  | { kind: "reverse"; to: number; duration: number }         // direction flip
  | { kind: "final_crawl" };                                  // slow creep to 0

interface AnimState {
  script: DramaStep[];
  step: number;
  stepTime: number;
  stepStartVel: number;
}

function buildScript(): DramaStep[] {
  const maxSpeed = 22 + Math.random() * 10; // rad/s
  const script: DramaStep[] = [];

  // 1. Accelerate
  script.push({ kind: "accelerate", to: -maxSpeed, rate: maxSpeed * 2.5 });

  // 2. Initial cruise
  script.push({ kind: "cruise", speed: -maxSpeed, duration: 0.6 + Math.random() * 0.8 });

  // Decide how many fake stops (1 or 2, weighted)
  const fakeStops = Math.random() < 0.45 ? 2 : 1;

  for (let i = 0; i < fakeStops; i++) {
    const minSpeed = 0.15 + Math.random() * 0.25; // rad/s — almost but not quite stopped

    // 3. Fake slow-down
    script.push({ kind: "fake_stop", duration: 1.4 + Math.random() * 1.2, minSpeed });

    // 4. Hold breath (linger at near-zero for max tension)
    script.push({ kind: "hold_breath", duration: 0.3 + Math.random() * 0.5 });

    // 5. Burst back
    const reaccelTarget = -(maxSpeed * (0.35 - i * 0.1) + Math.random() * 4);
    script.push({ kind: "reaccel", to: reaccelTarget, duration: 0.25 + Math.random() * 0.2 });

    // Maybe add a reverse on first fake stop
    if (i === 0 && Math.random() < 0.6) {
      script.push({ kind: "reverse", to: Math.abs(reaccelTarget) * 0.25, duration: 0.25 + Math.random() * 0.2 });
      script.push({ kind: "reaccel", to: reaccelTarget * 0.7, duration: 0.2 });
    }

    if (i < fakeStops - 1) {
      script.push({ kind: "cruise", speed: reaccelTarget, duration: 0.3 + Math.random() * 0.4 });
    }
  }

  // 6. Final slow crawl to stop
  script.push({ kind: "final_crawl" });

  return script;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SpinningWheel({ names, onWinner }: SpinningWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const velRef = useRef(0); // rad/s
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number | null>(null);
  const animStateRef = useRef<AnimState | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);

  const segmentAngle = names.length > 0 ? (2 * Math.PI) / names.length : 2 * Math.PI;

  // ─── Draw ────────────────────────────────────────────────────────────────
  const drawWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 8;

    ctx.clearRect(0, 0, size, size);

    // Drop shadow behind wheel
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();

    if (names.length === 0) {
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#9ca3af";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("이름을 입력하세요", cx, cy);
      return;
    }

    names.forEach((name, i) => {
      const startAngle = angle + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;
      const color = COLORS[i % COLORS.length];

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const maxTextWidth = radius * 0.72;
      const fontSize = Math.max(10, Math.min(20, (radius * 0.35) / Math.max(name.length * 0.6, 1)));
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 4;

      let displayName = name;
      while (ctx.measureText(displayName).width > maxTextWidth && displayName.length > 2) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== name) displayName += "..";
      ctx.fillText(displayName, radius - 12, 0);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
    ctx.fillStyle = "#374151";
    ctx.fill();

    // Pointer (top, red triangle)
    const pSize = 20;
    ctx.save();
    ctx.translate(cx, 5);
    ctx.beginPath();
    ctx.moveTo(0, pSize);
    ctx.lineTo(-pSize / 2, 0);
    ctx.lineTo(pSize / 2, 0);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }, [names, segmentAngle]);

  useEffect(() => {
    drawWheel(angleRef.current);
  }, [drawWheel]);

  // ─── Winner calc ─────────────────────────────────────────────────────────
  const getWinnerIndex = useCallback((angle: number) => {
    const normalized = ((-angle - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return Math.floor(normalized / segmentAngle) % names.length;
  }, [segmentAngle, names.length]);

  // ─── Animation loop ───────────────────────────────────────────────────────
  const animate = useCallback((timestamp: number) => {
    const state = animStateRef.current;
    if (!state) return;

    if (lastTsRef.current === null) lastTsRef.current = timestamp;
    const dt = Math.min((timestamp - lastTsRef.current) / 1000, 0.05);
    lastTsRef.current = timestamp;
    state.stepTime += dt;

    const step = state.script[state.step];
    let advance = false;

    if (step.kind === "accelerate") {
      const dir = step.to < 0 ? -1 : 1;
      velRef.current += dir * step.rate * dt;
      if (dir < 0 ? velRef.current <= step.to : velRef.current >= step.to) {
        velRef.current = step.to;
        advance = true;
      }

    } else if (step.kind === "cruise") {
      velRef.current = step.speed + Math.sin(state.stepTime * 7) * 0.3; // tiny wobble
      if (state.stepTime >= step.duration) advance = true;

    } else if (step.kind === "fake_stop") {
      // Exponential decay toward minSpeed (with same sign as current vel)
      const sign = velRef.current < 0 ? -1 : 1;
      const target = -sign * step.minSpeed;
      velRef.current += (target - velRef.current) * dt * (3.5 / step.duration * 2);
      if (Math.abs(Math.abs(velRef.current) - step.minSpeed) < 0.05) {
        velRef.current = target;
        advance = true;
      }
      if (state.stepTime > step.duration * 1.5) advance = true; // safety

    } else if (step.kind === "hold_breath") {
      // Barely moving — add micro-jitter for tension
      const jitter = Math.sin(state.stepTime * 20) * 0.04;
      velRef.current += jitter * dt;
      if (state.stepTime >= step.duration) advance = true;

    } else if (step.kind === "reaccel") {
      velRef.current += (step.to - velRef.current) * (dt * 12 / step.duration);
      if (Math.abs(velRef.current - step.to) < 0.3) {
        velRef.current = step.to;
        advance = true;
      }
      if (state.stepTime > step.duration * 2) advance = true;

    } else if (step.kind === "reverse") {
      const target = step.to; // positive = counter-clockwise
      velRef.current += (target - velRef.current) * dt * 10;
      if (state.stepTime >= step.duration) advance = true;

    } else if (step.kind === "final_crawl") {
      // Very slow exponential decay — the agonizing creep
      const tau = 4.5; // seconds — longer = more creep
      velRef.current *= Math.exp(-dt / tau);

      if (Math.abs(velRef.current) < 0.015) {
        velRef.current = 0;
        angleRef.current += 0;
        drawWheel(angleRef.current);
        const winnerIdx = getWinnerIndex(angleRef.current);
        setIsSpinning(false);
        animStateRef.current = null;
        onWinner(names[winnerIdx]);
        return;
      }
    }

    if (advance && step.kind !== "final_crawl") {
      state.step++;
      state.stepTime = 0;
      state.stepStartVel = velRef.current;
      if (state.step >= state.script.length) {
        // Safety: jump to done
        setIsSpinning(false);
        animStateRef.current = null;
        onWinner(names[getWinnerIndex(angleRef.current)]);
        return;
      }
    }

    angleRef.current += velRef.current * dt;
    drawWheel(angleRef.current);
    rafRef.current = requestAnimationFrame(animate);
  }, [drawWheel, getWinnerIndex, names, onWinner]);

  // ─── Spin trigger ─────────────────────────────────────────────────────────
  const spin = useCallback(() => {
    if (isSpinning || names.length === 0) return;
    setIsSpinning(true);
    velRef.current = 0;
    lastTsRef.current = null;
    const script = buildScript();
    animStateRef.current = { script, step: 0, stepTime: 0, stepStartVel: 0 };
    rafRef.current = requestAnimationFrame(animate);
  }, [isSpinning, names, animate]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={460}
        height={460}
        className="max-w-full"
        style={{ maxWidth: "min(460px, 90vw)", height: "auto" }}
      />
      <button
        onClick={spin}
        disabled={isSpinning || names.length === 0}
        className="mt-6 px-10 py-4 text-xl font-bold text-white rounded-full shadow-lg transition-all duration-200
          bg-gradient-to-r from-rose-500 to-orange-400
          hover:from-rose-600 hover:to-orange-500
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isSpinning ? "두근두근..." : "SPIN!"}
      </button>
    </div>
  );
}
