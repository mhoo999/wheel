"use client";

import { useEffect, useRef } from "react";

interface WinnerModalProps {
  winner: string | null;
  onClose: () => void;
}

export default function WinnerModal({ winner, onClose }: WinnerModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!winner) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [winner, onClose]);

  if (!winner) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="relative bg-white rounded-3xl shadow-2xl px-12 py-10 flex flex-col items-center gap-4 animate-winner-pop max-w-sm w-full mx-4">
        {/* Confetti circles */}
        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            className="absolute w-3 h-3 rounded-full opacity-80 animate-confetti"
            style={{
              background: ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#FF922B","#CC5DE8","#20C997","#F06595"][i],
              top: `${10 + Math.random() * 20}%`,
              left: `${5 + i * 12}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}

        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-500 tracking-wide">당첨!</h2>
        <div className="text-4xl font-black text-gray-900 text-center break-all leading-tight">
          {winner}
        </div>
        <p className="text-gray-400 text-sm">축하합니다!</p>
        <button
          onClick={onClose}
          className="mt-2 px-8 py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold rounded-full text-lg shadow-md hover:from-rose-600 hover:to-orange-500 transition-all active:scale-95"
        >
          확인
        </button>
      </div>
    </div>
  );
}
