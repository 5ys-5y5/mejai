"use client";

import { useEffect, useRef } from "react";
import { MatrixRain } from "@/components/landing/matrixRain";

const CHAR_LIST = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "+",
  "-",
  "*",
  "=",
  "<",
  ">",
  ":",
  ".",
];

const FLOW_RATE = 1;
const FPS = 15;

const LIGHT_PALETTE = {
  head: { red: 0, green: 0, blue: 0 },
  tail: { red: 0, green: 0, blue: 0 },
};

const DARK_PALETTE = {
  head: { red: 245, green: 245, blue: 245 },
  tail: { red: 210, green: 210, blue: 210 },
};

function getPalette(isDark: boolean) {
  return isDark ? DARK_PALETTE : LIGHT_PALETTE;
}

export function MatrixRainBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<MatrixRain | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const palette = getPalette(media.matches);

    instanceRef.current = new MatrixRain(
      canvasRef.current,
      window.innerWidth,
      window.innerHeight,
      CHAR_LIST,
      palette.tail.red,
      palette.tail.green,
      palette.tail.blue,
      palette.head.red,
      palette.head.green,
      palette.head.blue,
      false,
      FLOW_RATE,
      FPS,
    );

    const onResize = () => {
      instanceRef.current?.setCanvasDimensions(window.innerWidth, window.innerHeight);
    };

    const onMediaChange = (event: MediaQueryListEvent) => {
      const nextPalette = getPalette(event.matches);
      instanceRef.current?.setColors(nextPalette.head, nextPalette.tail);
    };

    window.addEventListener("resize", onResize);
    if (media.addEventListener) {
      media.addEventListener("change", onMediaChange);
    } else {
      media.addListener(onMediaChange);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      if (media.removeEventListener) {
        media.removeEventListener("change", onMediaChange);
      } else {
        media.removeListener(onMediaChange);
      }
      instanceRef.current?.destroy();
    };
  }, []);

  return <canvas ref={canvasRef} className="block h-full w-full bg-transparent" />;
}
