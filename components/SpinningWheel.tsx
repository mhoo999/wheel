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

type SpinPhase = "idle" | "accelerate" | "cruise" | "reverse" | "decelerate" | "done";

export default function SpinningWheel({ names, onWinner }: SpinningWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const angularVelocityRef = useRef(0);
  const phaseRef = useRef<SpinPhase>("idle");
  const phaseTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const reversedRef = useRef(false);
  const lastTimestampRef = useRef<number | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);

  const segmentAngle = names.length > 0 ? (2 * Math.PI) / names.length : 2 * Math.PI;

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

    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 20;
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

    // Draw segments
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
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const maxWidth = radius * 0.75;
      const fontSize = Math.max(10, Math.min(20, (radius * 0.35) / Math.max(name.length * 0.6, 1)));
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;

      // Truncate if needed
      let displayName = name;
      while (ctx.measureText(displayName).width > maxWidth && displayName.length > 2) {
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

    // Pointer (top)
    const pSize = 18;
    ctx.save();
    ctx.translate(cx, 6);
    ctx.beginPath();
    ctx.moveTo(0, pSize);
    ctx.lineTo(-pSize / 2, 0);
    ctx.lineTo(pSize / 2, 0);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }, [names, segmentAngle]);

  useEffect(() => {
    drawWheel(angleRef.current);
  }, [drawWheel]);

  const getWinnerIndex = useCallback((angle: number) => {
    // Pointer is at top (−π/2). Find which segment is under it.
    const normalizedAngle = ((-angle - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return Math.floor(normalizedAngle / segmentAngle) % names.length;
  }, [segmentAngle, names.length]);

  const spin = useCallback(() => {
    if (isSpinning || names.length === 0) return;
    setIsSpinning(true);
    phaseRef.current = "accelerate";
    phaseTimeRef.current = 0;
    reversedRef.current = false;
    lastTimestampRef.current = null;

    // Target: random full rotations between 5-10 + random offset
    const targetRotations = 6 + Math.random() * 5;
    const targetAngle = angleRef.current - targetRotations * 2 * Math.PI;
    const maxSpeed = 25 + Math.random() * 15; // radians/sec

    // Phases: accelerate → cruise → (maybe reverse) → decelerate → done
    const cruiseDuration = 0.8 + Math.random() * 0.8; // seconds
    const doReverse = Math.random() < 0.75; // 75% chance of reverse
    const reverseDuration = 0.3 + Math.random() * 0.4;

    const phaseData = {
      targetAngle,
      maxSpeed,
      cruiseDuration,
      doReverse,
      reverseDuration,
    };

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) lastTimestampRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimestampRef.current) / 1000, 0.05);
      lastTimestampRef.current = timestamp;
      phaseTimeRef.current += dt;

      const phase = phaseRef.current;

      if (phase === "accelerate") {
        angularVelocityRef.current -= phaseData.maxSpeed * dt * 2.5;
        if (angularVelocityRef.current < -phaseData.maxSpeed) {
          angularVelocityRef.current = -phaseData.maxSpeed;
          phaseRef.current = "cruise";
          phaseTimeRef.current = 0;
        }
      } else if (phase === "cruise") {
        // Slight wobble
        const wobble = Math.sin(phaseTimeRef.current * 8) * 0.5;
        angularVelocityRef.current = -phaseData.maxSpeed + wobble;
        if (phaseTimeRef.current >= phaseData.cruiseDuration) {
          if (phaseData.doReverse && !reversedRef.current) {
            phaseRef.current = "reverse";
          } else {
            phaseRef.current = "decelerate";
          }
          phaseTimeRef.current = 0;
        }
      } else if (phase === "reverse") {
        // Sudden reverse!
        angularVelocityRef.current += phaseData.maxSpeed * dt * 8;
        if (angularVelocityRef.current > phaseData.maxSpeed * 0.3) {
          angularVelocityRef.current = phaseData.maxSpeed * 0.3;
        }
        if (phaseTimeRef.current >= phaseData.reverseDuration) {
          reversedRef.current = true;
          phaseRef.current = "decelerate";
          phaseTimeRef.current = 0;
        }
      } else if (phase === "decelerate") {
        const decayFactor = Math.exp(-dt * 2.2);
        angularVelocityRef.current *= decayFactor;
        if (Math.abs(angularVelocityRef.current) < 0.05) {
          angularVelocityRef.current = 0;
          phaseRef.current = "done";
        }
      } else if (phase === "done") {
        const winnerIdx = getWinnerIndex(angleRef.current);
        setIsSpinning(false);
        onWinner(names[winnerIdx]);
        return;
      }

      angleRef.current += angularVelocityRef.current * dt;
      drawWheel(angleRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [isSpinning, names, drawWheel, getWinnerIndex, onWinner]);

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
        {isSpinning ? "돌아가는 중..." : "SPIN!"}
      </button>
    </div>
  );
}
