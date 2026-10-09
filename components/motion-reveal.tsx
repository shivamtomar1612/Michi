import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MotionReveal({ children, className, delay = 0, ...props }: {
  children: ReactNode;
  className?: string;
  delay?: number;
} & HTMLAttributes<HTMLDivElement>) {
  void delay;
  return <div className={cn("motion-reveal", className)} {...props}>{children}</div>;
}
