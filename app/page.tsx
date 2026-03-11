"use client";

import { useState, useCallback, useMemo } from "react";
import SpinningWheel from "@/components/SpinningWheel";
import WinnerModal from "@/components/WinnerModal";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Home() {
  const [inputText, setInputText] = useState("철수, 영희, 민준, 지수, 태양");
  const [multiplier, setMultiplier] = useState(1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const baseNames = useMemo(() => {
    return inputText
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
  }, [inputText]);

  const names = useMemo(() => {
    let result = [...baseNames];
    for (let i = 1; i < multiplier; i++) {
      result = [...result, ...baseNames];
    }
    if (isShuffled) {
      // Use shuffleSeed as a dependency trigger
      void shuffleSeed;
      result = shuffle(result);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseNames, multiplier, isShuffled, shuffleSeed]);

  const handleShuffle = useCallback(() => {
    if (!isShuffled) {
      setIsShuffled(true);
      setShuffleSeed((s) => s + 1);
    } else {
      // Re-shuffle
      setShuffleSeed((s) => s + 1);
    }
  }, [isShuffled]);

  const handleShuffleToggle = useCallback(() => {
    setIsShuffled((v) => !v);
    setShuffleSeed((s) => s + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col items-center py-6 px-4">
      <h1 className="text-3xl font-black text-gray-800 mb-0.5 tracking-tight">🎡 돌림판</h1>
      <p className="text-gray-400 text-sm mb-4">행운의 주인공은 누구?</p>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center">
        {/* Wheel — takes available space */}
        <div className="flex-1 flex flex-col items-center min-w-0">
          <SpinningWheel names={names} onWinner={setWinner} />
        </div>

        {/* Controls — fixed width sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
          {/* Name input */}
          <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
              이름 입력
            </label>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setMultiplier(1);
              }}
              rows={5}
              placeholder="이름을 쉼표(,)로 구분해서 입력하세요&#10;예: 철수, 영희, 민준"
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {baseNames.length}명 입력됨 → 총 {names.length}칸
              </span>
              <button
                onClick={() => {
                  setInputText("");
                  setMultiplier(1);
                }}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                초기화
              </button>
            </div>
          </div>

          {/* Multiplier */}
          <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
              칸 늘리기
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-150
                    ${multiplier === m
                      ? "bg-purple-500 text-white shadow-md scale-105"
                      : "bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-600"
                    }`}
                >
                  {m === 1 ? "기본" : `x${m}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              이름을 반복해서 칸을 늘립니다 (당첨 확률 동일)
            </p>
          </div>

          {/* Shuffle */}
          <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
              순서 섞기
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleShuffleToggle}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150
                  ${isShuffled
                    ? "bg-orange-400 text-white shadow-md"
                    : "bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-500"
                  }`}
              >
                {isShuffled ? "🔀 섞기 ON" : "🔀 섞기 OFF"}
              </button>
              {isShuffled && (
                <button
                  onClick={handleShuffle}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-orange-100 text-orange-600 hover:bg-orange-200 transition-all"
                >
                  다시 섞기
                </button>
              )}
            </div>
          </div>

          {/* Name list preview */}
          {names.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                현재 칸 목록
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {names.map((name, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                    style={{ background: `hsl(${(i * 37) % 360}, 65%, 55%)` }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <WinnerModal winner={winner} onClose={() => setWinner(null)} />
    </div>
  );
}
