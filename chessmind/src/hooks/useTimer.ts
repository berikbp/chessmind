"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Color } from "chess.js";

export interface ParsedTimeControl {
  isTimed: boolean;
  initialSeconds: number;
  incrementSeconds: number;
  label: string;
}

interface UseTimerOptions {
  enabled: boolean;
  initialSeconds: number;
  incrementSeconds: number;
  initialActiveColor?: Color;
  isGameOver: boolean;
  onTimeout: (color: Color) => void;
}

const TIME_CONTROL_PATTERN = /^(\d{1,3})\+(\d{1,2})$/;

export function parseTimeControl(value: string | undefined): ParsedTimeControl {
  if (!value || value === "untimed") {
    return {
      isTimed: false,
      initialSeconds: 0,
      incrementSeconds: 0,
      label: "Untimed",
    };
  }

  const match = TIME_CONTROL_PATTERN.exec(value);
  if (!match) {
    return {
      isTimed: false,
      initialSeconds: 0,
      incrementSeconds: 0,
      label: "Untimed",
    };
  }

  const minutes = Number(match[1]);
  const incrementSeconds = Number(match[2]);

  return {
    isTimed: true,
    initialSeconds: minutes * 60,
    incrementSeconds,
    label: `${minutes}+${incrementSeconds}`,
  };
}

export function useTimer({
  enabled,
  initialSeconds,
  incrementSeconds,
  initialActiveColor = "w",
  isGameOver,
  onTimeout,
}: UseTimerOptions) {
  const [whiteTime, setWhiteTime] = useState(initialSeconds);
  const [blackTime, setBlackTime] = useState(initialSeconds);
  const [activeColor, setActiveColor] = useState<Color>(initialActiveColor);
  const activeColorRef = useRef<Color>(initialActiveColor);
  const onTimeoutRef = useRef(onTimeout);
  const timeoutFiredRef = useRef(false);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    activeColorRef.current = activeColor;
  }, [activeColor]);

  const syncActiveColor = useCallback((color: Color) => {
    activeColorRef.current = color;
    setActiveColor(color);
  }, []);

  const resetTimer = useCallback(
    (nextActiveColor: Color = initialActiveColor) => {
      timeoutFiredRef.current = false;
      activeColorRef.current = nextActiveColor;
      setWhiteTime(initialSeconds);
      setBlackTime(initialSeconds);
      setActiveColor(nextActiveColor);
    },
    [initialActiveColor, initialSeconds],
  );

  const switchTurn = useCallback(
    (nextActiveColor: Color) => {
      const previousActiveColor = activeColorRef.current;

      if (enabled && previousActiveColor !== nextActiveColor && incrementSeconds > 0) {
        if (previousActiveColor === "w") {
          setWhiteTime((seconds) => (seconds > 0 ? seconds + incrementSeconds : seconds));
        } else {
          setBlackTime((seconds) => (seconds > 0 ? seconds + incrementSeconds : seconds));
        }
      }

      syncActiveColor(nextActiveColor);
    },
    [enabled, incrementSeconds, syncActiveColor],
  );

  useEffect(() => {
    if (!enabled || isGameOver || timeoutFiredRef.current) return;

    const intervalId = window.setInterval(() => {
      if (activeColorRef.current === "w") {
        setWhiteTime((seconds) => Math.max(0, seconds - 1));
      } else {
        setBlackTime((seconds) => Math.max(0, seconds - 1));
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [enabled, isGameOver, activeColor]);

  useEffect(() => {
    if (!enabled || isGameOver || timeoutFiredRef.current) return;

    if (whiteTime <= 0) {
      timeoutFiredRef.current = true;
      onTimeoutRef.current("w");
      return;
    }

    if (blackTime <= 0) {
      timeoutFiredRef.current = true;
      onTimeoutRef.current("b");
    }
  }, [blackTime, enabled, isGameOver, whiteTime]);

  return {
    activeColor,
    blackTime,
    resetTimer,
    switchTurn,
    syncActiveColor,
    whiteTime,
  };
}
