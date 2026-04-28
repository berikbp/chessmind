"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:")
      )
        return;

      if (intervalRef.current) clearInterval(intervalRef.current);
      setVisible(true);
      setProgress(10);
      intervalRef.current = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 12, 85));
      }, 250);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);
    const t = setTimeout(() => setVisible(false), 350);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nav-progress"
          className="fixed left-0 top-0 z-[9999] h-[2px] bg-[var(--chess-gold)]"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          exit={{ opacity: 0 }}
          transition={{ ease: "easeOut", duration: 0.2 }}
        />
      )}
    </AnimatePresence>
  );
}
