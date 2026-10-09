"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, MapPin, Route } from "lucide-react";
import { googleDirectionsUrl, healthMarkerColor, isValidCoordinates } from "@/features/maps/geospatial";
import type { MapFallbackItem, MapPoint } from "@/features/maps/types";
import { useTranslations } from "next-intl";

type LatLng = { lat: number; lng: number };
type MapInstance = {
  fitBounds(bounds: Bounds): void;
  setCenter(center: LatLng): void;
  addListener(name: string, handler: () => void): { remove(): void };
};
type Bounds = { extend(position: LatLng): void };
type AdvancedMarker = {
  map: MapInstance | null;
  addEventListener(name: string, handler: () => void): void;
  removeEventListener(name: string, handler: () => void): void;
};
type GoogleMapsWindow = Window & {
  google?: { maps?: { importLibrary(name: "core" | "maps" | "marker"): Promise<unknown> } };
  gm_authFailure?: () => void;
  __michiMapsReady?: () => void;
};
type GoogleMapsApi = { importLibrary(name: "core" | "maps" | "marker"): Promise<unknown> };
type MapsLibrary = { Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance; LatLngBounds: new () => Bounds };
type MarkerLibrary = { AdvancedMarkerElement: new (options: { map: MapInstance; position: LatLng; title: string; content: HTMLElement; gmpClickable: boolean }) => AdvancedMarker };

let mapsPromise: Promise<GoogleMapsApi> | undefined;

function loadMaps(apiKey: string) {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const mapWindow = window as GoogleMapsWindow;
    if (mapWindow.google?.maps?.importLibrary) {
      resolve(mapWindow.google.maps as GoogleMapsApi);
      return;
    }
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => reject(new Error("Google Maps did not respond in time.")), 18_000);
    const previousAuthFailure = mapWindow.gm_authFailure;
    mapWindow.gm_authFailure = () => {
      previousAuthFailure?.();
      window.clearTimeout(timeout);
      reject(new Error("Google Maps rejected this key or project configuration."));
    };
    mapWindow.__michiMapsReady = () => {
      window.clearTimeout(timeout);
      if (mapWindow.google?.maps?.importLibrary) resolve(mapWindow.google.maps as GoogleMapsApi);
      else reject(new Error("Google Maps loaded without its map library."));
    };
    script.id = "michi-google-maps-js";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&libraries=marker&callback=__michiMapsReady`;
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Google Maps could not be loaded."));
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    mapsPromise = undefined;
    throw error;
  });
  return mapsPromise;
}

function pinElement(point: MapPoint) {
  const element = document.createElement("div");
  element.className = "michi-map-pin";
  element.style.setProperty("--map-pin-color", healthMarkerColor(point.healthStatus));
  element.textContent = point.sequence ? String(point.sequence) : point.kind === "experience" || point.kind === "meeting-point" ? "E" : point.kind === "place" ? "P" : point.kind === "alternative" ? "A" : "D";
  return element;
}

export function MapExplorer({
  title,
  description,
  points,
  fallbackItems = [],
  listTitle,
  directions = false,
}: {
  title: string;
  description: string;
  points: MapPoint[];
  fallbackItems?: MapFallbackItem[];
  listTitle?: string;
  directions?: boolean;
}) {
  const t = useTranslations("Maps");
  const hostRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapRevision, setMapRevision] = useState(0);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const validPoints = useMemo(() => points.filter(isValidCoordinates), [points]);
  const selected = validPoints.find((point) => point.id === selectedId) ?? null;
  const routeUrl = directions ? googleDirectionsUrl(validPoints) : null;
  const healthLabels: Record<string, string> = {
    healthy: t("healthy"), good: t("good"), moderate_pressure: t("moderateStatus"),
    high_pressure: t("highStatus"), critical_pressure: t("criticalStatus"), unavailable: t("healthUnavailable"),
  };

  useEffect(() => {
    if (!open || !hostRef.current || !apiKey) return;
    let active = true;
    let tilesListener: { remove(): void } | undefined;
    let tilesTimeout: number | undefined;
    let map: MapInstance | undefined;
    const markers: AdvancedMarker[] = [];
    const markerHandlers: Array<() => void> = [];
    setStatus("loading");
    void (async () => {
      try {
        const maps = await loadMaps(apiKey);
        const [coreModule, mapsModule, markerModule] = await Promise.all([maps.importLibrary("core"), maps.importLibrary("maps"), maps.importLibrary("marker")]);
        if (!active || !hostRef.current) return;
        const { Map: GoogleMap } = mapsModule as MapsLibrary;
        const { LatLngBounds } = coreModule as { LatLngBounds: new () => Bounds };
        const { AdvancedMarkerElement } = markerModule as MarkerLibrary;
        const center = validPoints.length
          ? { lat: validPoints[0].latitude, lng: validPoints[0].longitude }
          : { lat: 36.2, lng: 138.25 };
        map = new GoogleMap(hostRef.current, {
          center,
          zoom: validPoints.length > 1 ? 5 : validPoints.length === 1 ? 11 : 4,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID",
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });
        const bounds = new LatLngBounds();
        for (const point of validPoints) {
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: point.latitude, lng: point.longitude },
            title: `${point.name}${point.healthStatus ? ` · ${point.healthStatus}` : ""}`,
            content: pinElement(point),
            gmpClickable: true,
          });
          const handler = () => {
            setSelectedId(point.id);
            map?.setCenter({ lat: point.latitude, lng: point.longitude });
          };
          marker.addEventListener("gmp-click", handler);
          markers.push(marker);
          markerHandlers.push(handler);
          bounds.extend({ lat: point.latitude, lng: point.longitude });
        }
        if (validPoints.length > 1) map.fitBounds(bounds);
        tilesListener = map.addListener("tilesloaded", () => {
          if (active) setStatus("ready");
        });
        tilesTimeout = window.setTimeout(() => {
          if (active && status !== "ready") setStatus((current) => current === "loading" ? "error" : current);
        }, 18_000);
      } catch (cause) {
        if (!active) return;
        void cause;
        setStatus("error");
      }
    })();
    return () => {
      active = false;
      if (tilesTimeout) window.clearTimeout(tilesTimeout);
      tilesListener?.remove();
      markers.forEach((marker, index) => {
        marker.removeEventListener("gmp-click", markerHandlers[index]);
        marker.map = null;
      });
    };
  }, [apiKey, mapRevision, open, validPoints]);

  return <section className="border-y border-ink/15 py-7" aria-labelledby="map-explorer-title">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">{t("eyebrow")}</p><h2 id="map-explorer-title" className="mt-2 font-serif text-2xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{description}</p></div>
      {apiKey ? <button type="button" onClick={() => { if (!open) { setOpen(true); setStatus("loading"); } else if (status === "error") setMapRevision((value) => value + 1); else setOpen(false); }} className="min-h-11 border border-ink/25 px-4 text-sm font-semibold text-ink hover:border-vermilion focus-visible:ring-2 focus-visible:ring-vermilion">{open ? status === "error" ? t("retry") : t("hide") : t("show")}</button> : <p role="status" className="text-sm text-ink/60">{t("notConfigured")}</p>}
    </div>
    {open ? <div className="mt-5">
      <div ref={hostRef} role="application" aria-label={t("accessibleMap")} aria-busy={status === "loading"} className="h-[22rem] border border-ink/15 bg-[#e9e5dc] sm:h-[28rem]" />
      {status === "loading" ? <p role="status" className="mt-2 text-xs text-ink/60">{t("loading")}</p> : null}
      {status === "ready" && validPoints.length === 0 ? <p role="status" className="mt-2 border-l-2 border-ink/30 bg-paper-deep p-3 text-xs leading-5 text-ink/70">{t("empty")}</p> : null}
      {status === "ready" && validPoints.length > 0 ? <p className="mt-2 text-xs text-ink/55">{t("locationsCount", { count: validPoints.length })}</p> : null}
      {status === "error" ? <div role="alert" className="mt-2 border-l-2 border-vermilion bg-[#fbf1ed] p-3 text-sm text-ink/80">{t("error")}</div> : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink/65" aria-label={t("legend")}>
        {[{ label: t("healthy"), color: "#536b5c" }, { label: t("moderate"), color: "#a67d2d" }, { label: t("high"), color: "#963b2b" }, { label: t("healthUnavailable"), color: "#59636a" }].map((item) => <span key={item.label} className="inline-flex items-center gap-2"><i aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}
      </div>
      {routeUrl ? <div className="mt-4 border-t border-ink/10 pt-3"><a href={routeUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-vermilion underline underline-offset-2"><Route className="size-4" aria-hidden="true" />{t("directions")}<ArrowUpRight className="size-4" aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span></a><p className="mt-1 text-xs leading-5 text-ink/55">{t("directionsDisclosure")}</p></div> : null}
    </div> : null}
    {selected ? <aside className="mt-4 border-l-2 border-vermilion bg-white p-4" aria-live="polite"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{selected.kind.replaceAll("-", " ")}</p><h3 className="mt-1 font-serif text-xl">{selected.name}</h3>{selected.destinationName ? <p className="mt-1 text-xs text-ink/60">{selected.destinationName}</p> : null}</div><button type="button" onClick={() => setSelectedId(null)} className="min-h-11 px-2 text-xs font-semibold underline">{t("closeDetails")}</button></div>
      <p className="mt-3 text-sm text-ink/70">{t("health", { status: selected.healthStatus ? healthLabels[selected.healthStatus.toLowerCase().replaceAll(" ", "_")] ?? selected.healthStatus : t("healthUnavailable") })}{selected.healthScore !== undefined && selected.healthScore !== null ? ` · ${selected.healthScore}/100` : ""}</p>
      {selected.straightLineDistanceFromPreviousKm !== undefined ? <p className="mt-1 text-xs text-ink/55">About {selected.straightLineDistanceFromPreviousKm} km in a straight line from the previous saved stop. This is not road or transit distance.</p> : null}
      <p className="mt-2 text-sm leading-6 text-ink/70"><strong>{t("whyShown")}</strong> {selected.whyShown}</p>
      {selected.experienceTitles?.length ? <div className="mt-3"><p className="text-xs font-semibold">{t("experiences")}</p><ul className="mt-1 list-inside list-disc text-sm text-ink/70">{selected.experienceTitles.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      {selected.href ? <Link href={selected.href} className="mt-4 inline-flex min-h-11 items-center gap-2 bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90">{t("explore")} <MapPin className="size-4" aria-hidden="true" /></Link> : null}
    </aside> : null}
    <div className="mt-6 border-t border-ink/10 pt-4"><h3 className="text-sm font-semibold">{listTitle ?? t("defaultListTitle")}</h3>
      {fallbackItems.length ? <ul className="mt-2 divide-y divide-ink/10">{fallbackItems.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-medium">{item.href ? <Link className="underline decoration-ink/25 underline-offset-4 hover:text-vermilion" href={item.href}>{item.name}</Link> : item.name}<span className="ml-2 text-xs font-normal text-ink/55">{item.locationLabel ?? (item.locationAvailable ? t("coordinateVerified") : t("locationUnverified"))}</span><span className="mt-1 block text-xs font-normal text-ink/60">{item.description}</span></span>{!item.locationAvailable ? <span className="text-xs text-ink/55">{t("noMarker")}</span> : null}</li>)}</ul> : <p className="mt-2 text-sm text-ink/60">{t("noLocations")}</p>}
    </div>
  </section>;
}
