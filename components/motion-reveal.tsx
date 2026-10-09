"use client";

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MotionReveal({ children, className, delay = 0, ...props }: {
  children: ReactNode;
  className?: string;
  delay?: number;
} & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setRevealed(true);
      return;
    }
    setMotionReady(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -32px 0px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} data-motion-ready={motionReady || undefined} data-revealed={revealed} className={cn("motion-reveal", className)} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties} {...props}>{children}</div>;
}
