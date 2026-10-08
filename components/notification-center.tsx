"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notification = { id: string; type: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string };
const fallbackLink = "/traveler/bookings";
function safeLink(value: string | null) { return value && value.startsWith("/") && !value.startsWith("//") ? value : fallbackLink; }

export function NotificationCenter() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error: queryError } = await supabase.from("notifications")
      .select("id,type,title,body,link,read_at,created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(30);
    if (queryError) { setError(true); setLoading(false); return; }
    setItems(data ?? []); setError(false); setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => { if (active && data.user) setUserId(data.user.id); else if (active) setLoading(false); });
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
    const channel = supabase.channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void refresh())
      .subscribe();
    const fallback = window.setInterval(() => void refresh(), 60_000);
    return () => { window.clearInterval(fallback); void supabase.removeChannel(channel); };
  }, [refresh, supabase, userId]);

  async function markRead(id: string) {
    if (!userId) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: readAt } : item));
    const { error: updateError } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", id).eq("user_id", userId).is("read_at", null);
    if (updateError) { setError(true); void refresh(); }
  }

  async function markAllRead() {
    if (!userId) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => item.read_at ? item : { ...item, read_at: readAt }));
    const { error: updateError } = await supabase.from("notifications").update({ read_at: readAt }).eq("user_id", userId).is("read_at", null);
    if (updateError) { setError(true); void refresh(); }
  }

  const unread = items.filter((item) => !item.read_at).length;
  return <div className="relative">
    <button type="button" onClick={() => { setOpen((current) => !current); if (!open) void refresh(); }} aria-expanded={open} aria-controls="notification-panel" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative inline-flex size-10 items-center justify-center border border-ink/15 hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-vermilion">
      <Bell className="size-4" aria-hidden="true" />{unread ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-vermilion px-1 text-center text-[10px] font-bold leading-5 text-white">{unread > 99 ? "99+" : unread}</span> : null}
    </button>
    {open ? <section id="notification-panel" aria-label="Notifications" className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] border border-ink/15 bg-paper shadow-xl">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3"><div><h2 className="font-serif text-lg">Notifications</h2><p className="text-xs text-ink/55">Booking and preparation updates</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => void markAllRead()} disabled={!unread} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-ink/65 disabled:opacity-40"><CheckCheck className="size-3.5" />Read all</button><button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="inline-flex size-9 items-center justify-center"><X className="size-4" /></button></div></div>
      <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
        {loading ? <p className="p-5 text-sm text-ink/60">Loading notifications…</p> : error ? <p role="alert" className="p-5 text-sm text-vermilion">Notifications could not be loaded. Reopen this panel to retry.</p> : items.length ? <ul className="divide-y divide-ink/10">{items.map((item) => <li key={item.id} className={item.read_at ? "" : "bg-vermilion/[0.04]"}>
          <Link href={safeLink(item.link)} onClick={() => { if (!item.read_at) void markRead(item.id); setOpen(false); }} className="block px-4 py-3 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-vermilion"><span className="flex items-start justify-between gap-3"><span className="font-semibold text-sm">{item.title}</span>{!item.read_at ? <span aria-label="Unread" className="mt-1 size-2 shrink-0 rounded-full bg-vermilion" /> : null}</span><span className="mt-1 block text-xs leading-5 text-ink/65">{item.body}</span><time className="mt-2 block text-[10px] text-ink/45" dateTime={item.created_at}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time></Link>
        </li>)}</ul> : <p className="p-5 text-sm text-ink/60">You’re all caught up. Booking updates and preparation notes will appear here.</p>}
      </div>
    </section> : null}
  </div>;
}
