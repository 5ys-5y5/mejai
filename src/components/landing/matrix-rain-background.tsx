"use client";

import { useEffect, useRef } from "react";
import { MatrixRain } from "@/components/landing/matrixRain";

// --- Configuration ---
const CHAR_LIST = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "+", "-", "*", "=", "<", ">", ":", "."
  // "ﾊ", "ﾐ", "ﾋ", "ｰ", "ｳ", "ｼ", "ﾅ", "ﾓ", "ﾆ", "ｻ", "ﾜ", "ﾂ", "ｵ", "ﾘ", "ｱ", "ﾎ", "ﾃ", "ﾏ", "ｹ", "ﾒ", "ｴ", "ｶ", "ｷ", "ﾑ", "ﾕ", "ﾗ", "ｾ", "ﾈ", "ｽ", "ﾀ", "ﾇ", "ﾍ"
];

// 밀도 (한 번에 생성되는 줄기의 수) - 숫자가 클수록 화면에 글자가 꽉 찹니다.
// Density: Higher number = more rain drops appearing at once.
const FLOW_RATE = 1;

// 속도 (초당 프레임 수) - 숫자가 클수록 빠릅니다.
// Speed: Frames per second.
const FPS = 15;

export function MatrixRainBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matrixInstanceRef = useRef<MatrixRain | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize MatrixRain with custom "White Edition" parameters
    const matrixRain = new MatrixRain(
      canvasRef.current,
      window.innerWidth,
      window.innerHeight,
      CHAR_LIST,
      0,   // Red: 0 (Black text target)
      0,   // Green: 0
      0,   // Blue: 0
      false, // Random Colors: false
      FLOW_RATE,
      FPS
    );

    matrixInstanceRef.current = matrixRain;

    const handleResize = () => {
      if (matrixInstanceRef.current) {
        matrixInstanceRef.current.setCanvasDimensions(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (matrixInstanceRef.current) {
        matrixInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden">
      <canvas
        ref={canvasRef}
        id="canvas"
        className="block w-full h-full"
      />
    </div>
  );
}
