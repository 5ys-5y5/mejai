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
  // Canvas element used by MatrixRain for rendering.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Holds the running MatrixRain instance for cleanup and resize updates.
  const matrixInstanceRef = useRef<MatrixRain | null>(null);
  // Hidden span used to read Tailwind-computed color for the head.
  const headColorRef = useRef<HTMLSpanElement>(null);
  // Hidden span used to read Tailwind-computed color for the tail.
  const tailColorRef = useRef<HTMLSpanElement>(null);
  // Offscreen 1x1 canvas to normalize any CSS color (lab/oklch/hex/rgb) into RGB.
  const colorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Convert any CSS color string to RGB by painting a pixel and reading it back.
  const colorToRgb = (color: string) => {
    if (!color) return null;
    if (!colorCanvasRef.current) {
      colorCanvasRef.current = document.createElement("canvas");
    }
    const canvas = colorCanvasRef.current;
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true } as CanvasRenderingContext2DSettings);
    if (!ctx) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return { red: data[0], green: data[1], blue: data[2] };
  };

  // Read computed text color from an element and convert it to RGB.
  const getRgb = (el: HTMLElement | null) => {
    if (!el) return null;
    const computed = getComputedStyle(el).color || "";
    return colorToRgb(computed);
  };

  const samplePixel = (x: number, y: number) => {
    if (!canvasRef.current) return null;
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true } as CanvasRenderingContext2DSettings);
    if (!ctx) return null;
    const data = ctx.getImageData(Math.max(0, x), Math.max(0, y), 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
  };

  const sampleCanvasRegion = (x: number, y: number, size: number) => {
    if (!canvasRef.current) return null;
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true } as CanvasRenderingContext2DSettings);
    if (!ctx) return null;
    const clampedSize = Math.max(1, Math.min(size, 200));
    const image = ctx.getImageData(x, y, clampedSize, clampedSize).data;
    let maxA = 0;
    let maxColor = { r: 0, g: 0, b: 0, a: 0 };
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;
    for (let i = 0; i < image.length; i += 4) {
      const a = image[i + 3];
      if (a > 0) {
        const r = image[i];
        const g = image[i + 1];
        const b = image[i + 2];
        sumR += r;
        sumG += g;
        sumB += b;
        count += 1;
        if (a > maxA) {
          maxA = a;
          maxColor = { r, g, b, a };
        }
      }
    }
    const avgColor = count
      ? { r: Math.round(sumR / count), g: Math.round(sumG / count), b: Math.round(sumB / count) }
      : null;
    return { maxColor, avgColor, count };
  };

  const sampleTextPixel = (text: string, color: { red: number; green: number; blue: number }) => {
    if (!debugCanvasRef.current) {
      debugCanvasRef.current = document.createElement("canvas");
    }
    const canvas = debugCanvasRef.current;
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext("2d", { willReadFrequently: true } as CanvasRenderingContext2DSettings);
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `100 20px "Apple SD Gothic Neo"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgb(${color.red}, ${color.green}, ${color.blue})`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let maxA = 0;
    let maxColor = { r: 0, g: 0, b: 0, a: 0 };
    for (let i = 0; i < image.length; i += 4) {
      const a = image[i + 3];
      if (a > maxA) {
        maxA = a;
        maxColor = { r: image[i], g: image[i + 1], b: image[i + 2], a };
      }
    }
    return maxColor;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // (Re)create MatrixRain with the current Tailwind-derived colors.
    const mountMatrix = () => {
      if (!canvasRef.current) return;
      const tailColor = getRgb(tailColorRef.current);
      const headColor = getRgb(headColorRef.current);
      if (!tailColor || !headColor) return;

      if (matrixInstanceRef.current) {
        matrixInstanceRef.current.destroy();
        matrixInstanceRef.current = null;
      }

      // Initialize MatrixRain with custom "White Edition" parameters
      const matrixRain = new MatrixRain(
        canvasRef.current,
        window.innerWidth,
        window.innerHeight,
        CHAR_LIST,
        tailColor.red,
        tailColor.green,
        tailColor.blue,
        headColor.red,
        headColor.green,
        headColor.blue,
        false, // Random Colors: false
        FLOW_RATE,
        FPS
      );

      matrixInstanceRef.current = matrixRain;
      // Force a synchronous first draw so we can sample actual pixels.
      matrixRain.run();

      // Debug: Sample after the first interval draw has had time to run.
      window.setTimeout(() => {
        const midX = Math.floor(window.innerWidth / 2);
        const midY = Math.floor(window.innerHeight / 2);
        const sampled = samplePixel(midX, midY);
        const regionSample = sampleCanvasRegion(
          Math.max(0, midX - 200),
          Math.max(0, midY - 200),
          400
        );
        const headSample = sampleTextPixel("A", headColor);
        const tailSample = sampleTextPixel("A", tailColor);
        // eslint-disable-next-line no-console
        const samplePayload = {
          canvasMid: sampled,
          canvasRegion: regionSample,
          headSample,
          tailSample,
          headColor,
          tailColor,
        };
        // eslint-disable-next-line no-console
        console.info("[MatrixRain] sample pixel", samplePayload, JSON.stringify(samplePayload));
      }, Math.max(50, Math.floor(1000 / FPS)));
    };

    // Ensure colors are available before mounting; retry until they are.
    const scheduleMount = () => {
      requestAnimationFrame(() => {
        const tailColor = getRgb(tailColorRef.current);
        const headColor = getRgb(headColorRef.current);
        if (!tailColor || !headColor) {
          // Debug: Surface the exact computed/normalized colors when parsing fails.
          const headComputed = headColorRef.current ? getComputedStyle(headColorRef.current).color : "missing";
          const tailComputed = tailColorRef.current ? getComputedStyle(tailColorRef.current).color : "missing";
          const headNormalized = colorToRgb(headComputed) || "unresolved";
          const tailNormalized = colorToRgb(tailComputed) || "unresolved";
          // eslint-disable-next-line no-console
          console.warn("[MatrixRain] color parse pending", {
            headComputed,
            headNormalized,
            tailComputed,
            tailNormalized,
          });
          window.setTimeout(scheduleMount, 50);
          return;
        }
        // eslint-disable-next-line no-console
        const mountPayload = { headColor, tailColor };
        // eslint-disable-next-line no-console
        console.info("[MatrixRain] mount with colors", mountPayload, JSON.stringify(mountPayload));
        mountMatrix();
      });
    };

    scheduleMount();

    // Keep canvas sized to the viewport.
    const handleResize = () => {
      if (matrixInstanceRef.current) {
        matrixInstanceRef.current.setCanvasDimensions(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    // Recompute colors when the OS/browser theme changes.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSchemeChange = () => scheduleMount();
    if (media.addEventListener) {
      media.addEventListener("change", handleSchemeChange);
    } else {
      media.addListener(handleSchemeChange);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (media.removeEventListener) {
        media.removeEventListener("change", handleSchemeChange);
      } else {
        media.removeListener(handleSchemeChange);
      }
      if (matrixInstanceRef.current) {
        matrixInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden">
      <span ref={headColorRef} className="absolute opacity-0 pointer-events-none text-black" aria-hidden="true">
        •
      </span>
      <span ref={tailColorRef} className="absolute opacity-0 pointer-events-none text-black" aria-hidden="true">
        •
      </span>
      <canvas
        ref={canvasRef}
        id="canvas"
        className="block w-full h-full"
      />
    </div>
  );
}
