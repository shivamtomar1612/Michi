"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function TravelerBookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function cancel() {
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The booking could not be cancelled.");
      setMessage("Booking cancelled. Reserved capacity has been released.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The booking could not be cancelled.");
    } finally { setPending(false); }
  }
  return <div className="mt-2 text-right"><button type="button" onClick={() => void cancel()} disabled={pending} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-vermilion underline underline-offset-4 disabled:opacity-50"><X className="size-3.5" />{pending ? "Cancelling…" : "Cancel booking"}</button>{message ? <p role="status" className="mt-1 max-w-xs text-xs text-ink/60">{message}</p> : null}</div>;
}
