# MICHI Maps and Geospatial Integration

## What is integrated

- The Google Maps JavaScript API is loaded only after a visitor selects **Show map**. Destination, official-place, linked external-experience, and saved-itinerary markers use checked catalogue coordinates. A list remains available when maps are disabled or fail.
- Marker colors represent the Destination Health status supplied by the health service: green for Healthy/Good, amber for Moderate Pressure, red for High/Critical Pressure, and gray when health is unavailable. A color never implies evidence that the health service did not return.
- Itinerary directions open a Google Maps directions URL. MICHI does not calculate or state road/transit route distance or travel time. It can show approximate straight-line distance between consecutive mapped stops, clearly labeled as not a road or transit distance.
- Host-provided coordinates are shown only in the host workspace or on the signed-in traveler’s own saved itinerary, labeled as host-provided. Public external listings use official checked place coordinates only.

## Google Cloud configuration

Required API: **Maps JavaScript API**. The browser key belongs in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; browser map keys are visible to visitors by design. Restrict it in Google Cloud to the exact development and production HTTP referrers and to the Maps JavaScript API. Apply appropriate quotas and billing alerts. `NEXT_PUBLIC_GOOGLE_MAP_ID` is optional; the map uses Google's demo map ID when unset.

MICHI does not call the Geocoding API, Places API, Routes API, or Distance Matrix API. It does not geocode catalogue names. Google Maps URLs handle traveler-requested directions after leaving MICHI; MICHI does not make a route API request or claim a travel-time estimate. This keeps map usage opt-in and limits direct API usage.

## Local verification

The local discovery page loaded Google map tiles and attribution with the configured browser key, confirming that the Maps JavaScript API accepted the key for this local origin at test time. This does not verify the production referrer allowlist, quota, or billing setup. The hosted public catalogue currently has no verified destination or place coordinates, so the map correctly displays no markers while keeping the sourced list available.

## Coordinates and PostGIS

Coordinates are displayed only when the source record has valid latitude/longitude and a verification timestamp, and is not past its configured re-verification date. Missing or stale coordinates stay in the list without a marker. No coordinates are inferred from names or generated for the map.

PostGIS is not required for this phase's current catalogue size and UI needs. Basic distance labeling uses a deterministic Haversine calculation in the application and is explicitly a straight-line approximation. Add PostGIS when server-side radius search, spatial joins, or larger-scale geographic queries become product requirements; that change should use a reviewed additive migration and verified coordinates.

## Key hygiene

The browser key is not a secret because Google Maps JavaScript must receive it. Keep the local value in ignored `.env.local`, never commit it, and use a separately restricted production key. A key pasted into a chat or otherwise shared should be rotated before production. No server-side Maps credential is used.
