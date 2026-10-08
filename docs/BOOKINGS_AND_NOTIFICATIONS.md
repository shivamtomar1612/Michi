# Booking and Notification System (Phase 11)

## Booking lifecycle

Traveler booking requests are authenticated and submitted to `POST /api/bookings`. The route validates the slot ID, guest count, acknowledgment, and bounded cultural requirement fields with Zod; the database independently verifies that the current user is a traveler.

The `request_experience_booking` PostgreSQL function locks the selected slot with `FOR UPDATE`, then checks that the experience is published, verified, active, hosted by a verified operator, and the future slot is open with enough remaining capacity. The same transaction stores the booking, reserves capacity, records a private booking reference, snapshots the rules that were acknowledged, and copies the experience title and slot times into the booking for durable history. It does not accept a traveler ID from the browser.

Capacity stays reserved for pending and confirmed requests. Traveler cancellation and host cancellation/decline lock the booking and slot, transition only pending or confirmed records, and release that booking's guests exactly once. A full slot reopens only when it still has time and was not closed/cancelled. Past bookings cannot be cancelled online. Hosts can mark a confirmed booking completed only once its visit has started. No payment or refund provider is connected; displayed JPY values are booking totals, not charges or settlement claims.

Host actions remain ownership-checked in server code and PostgreSQL. The traveler booking list is private under existing RLS. Host booking pages omit traveler identity and show only the cultural requirements a traveler explicitly chose to share for the booking.

## In-app notifications

Database triggers create notifications in the same transaction as:

- a new booking request for the host;
- booking confirmation for the traveler;
- traveler cancellation for the host;
- host cancellation or decline for the traveler;
- material experience edits for travelers with upcoming active bookings;
- slot closure or schedule changes for travelers with active bookings.

The workspace notification center shows unread counts, lists recent events, marks one/all read under owner-only RLS, and subscribes to Realtime. It also refreshes periodically while mounted, so notifications still load when Realtime is unavailable. The `notifications` table was added to the `supabase_realtime` publication when that publication existed.

## Cultural preparation reminders

`GET /api/cron/booking-reminders` is a Vercel Cron route. It queues a deduplicated in-app reminder for confirmed bookings starting within the next 48 hours. Its RPC is executable only by `service_role` and checks the JWT role claim; the route additionally requires `Authorization: Bearer $CRON_SECRET`. It sends no email.

For local or hosted scheduling, configure the existing server-only `SUPABASE_SERVICE_ROLE_KEY` and a strong `CRON_SECRET`; Vercel Cron supplies the authorization header. Neither value is exposed to the browser. See `.env.example` for the variable names.

## Hosted migration and verification

Applied to the connected MICHI project (`sjfcwmaceduwdhpdccyh`):

- `20261008161211_phase11_booking_notifications`
- `20261008161515_phase11_booking_rpc_hardening`
- `20261008162058_phase11_booking_snapshots`

The migrations add a structured cultural-requirements JSON field and indexes, booking/slot/experience notification triggers, transactional cancel and completion RPCs, and a service-role-only reminder RPC. Public booking RPCs are invoker wrappers; their row-locking implementations live in the non-exposed `private` schema with explicit role and ownership checks. The request function preserves the row-lock strategy and extends its acknowledgment snapshot. A before-insert trigger records experience title and slot times from the database on each booking, preserving the booking's original context if the listing later changes.

The live project reports all Phase 11 RPCs and triggers present, the booking request function contains `FOR UPDATE`, the reminder function is denied to `anon` and `authenticated` and granted to `service_role`, and notifications are in the Realtime publication. There are currently zero hosted bookings and notifications. No test travelers, hosts, bookings, or slots were created.

Automated unit tests validate request constraints and assert that booking/cancellation functions lock the affected slot/booking and change capacity in the database function. A real concurrent booking run against the hosted database was not performed: no verified host/slot inventory exists, and Docker is unavailable for an isolated local Supabase integration database. The database row lock remains the concurrency control; the live function definition was inspected after migration.
