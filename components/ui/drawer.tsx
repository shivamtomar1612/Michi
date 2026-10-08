"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Drawer({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) { return <DialogPrimitive.Root {...props} />; }
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

export function DrawerContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/55" />
    <DialogPrimitive.Content className={cn("fixed inset-y-0 right-0 z-50 w-[min(88vw,24rem)] overflow-y-auto bg-paper p-7 shadow-2xl focus:outline-none", className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-5 top-5 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion" aria-label="Close menu"><X className="size-5" /></DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}

export const DrawerTitle = DialogPrimitive.Title;
export const DrawerDescription = DialogPrimitive.Description;
