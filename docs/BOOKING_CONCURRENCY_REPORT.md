# Booking Concurrency Report — Phase 16

## Database implementation reviewed

The booking RPC validates the authenticated traveler role, guest bounds, rule acknowledgment shape, and allowed cultural-requirement keys. It loads the slot `FOR UPDATE`, checks active/verified/unpaused experience, verified host, open/future slot, time ordering, and remaining capacity. It derives price from the database experience and inserts the booking while incrementing `booked_count` within one transaction. Cancellation paths lock the booking and slot, verify ownership/host authority and state, then decrement capacity atomically. The relevant SQL uses an empty `search_path` and restricts execution to authenticated users (service role only for scheduled reminder work).

## Executed tests

- Static SQL review: PASS for row-lock and atomic update shape.
- Unit suite: reports the repository-level current result in `PHASE_16_FINAL_REPORT.md`.
- Live concurrency stress test: BLOCKED. Hosted MICHI `experiences`, `experience_slots`, and `bookings` contain zero rows; no isolated database credentials or test branch were available. No production data was fabricated or mutated.

## Required integration test before launch

In a disposable Supabase project, create one verified test host, one published test experience, and a slot with capacity N. Launch more than N concurrent booking RPCs with distinct authenticated traveler fixtures. Assert total accepted guests never exceeds N; verify rejected calls leave counters unchanged. Race cancellation against repeat cancellation and assert capacity is restored exactly once. Also verify pause, closure, past slot, price tampering, host cross-ownership, and traveler cross-ownership. This report does not claim that an actual concurrent database run occurred.
