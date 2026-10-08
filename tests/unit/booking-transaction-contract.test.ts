import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261008161211_phase11_booking_notifications.sql", "utf8")
  + readFileSync("supabase/migrations/20261008161515_phase11_booking_rpc_hardening.sql", "utf8");

describe("PostgreSQL booking transaction contract", () => {
  it("locks the slot before checking and updating its capacity in the booking RPC", () => {
    const requestFunction = migration.split("create function public.request_experience_booking(")[1]?.split("$$;")[0] ?? "";
    expect(requestFunction).toMatch(/from public\.experience_slots where id = p_slot_id for update/i);
    expect(requestFunction).toMatch(/slot_row\.booked_count \+ p_guests > slot_row\.capacity/i);
    expect(requestFunction).toMatch(/update public\.experience_slots set booked_count = booked_count \+ p_guests/i);
  });

  it("locks both booking and slot before releasing capacity on cancellation", () => {
    for (const name of ["cancel_experience_booking", "cancel_host_experience_booking", "decline_experience_booking"]) {
      const body = migration.split(`function public.${name}(`)[1]?.split("$$;")[0] ?? "";
      expect(body).toMatch(/from public\.bookings where id = p_booking_id for update/i);
      expect(body).toMatch(/from public\.experience_slots where id = booking_row\.slot_id for update/i);
      expect(body).toMatch(/booked_count = booked_count - booking_row\.guests/i);
    }
  });

  it("records rule acknowledgment snapshots and only releases a booking once", () => {
    expect(migration).toMatch(/'rules_snapshot', rule_snapshot/i);
    expect(migration).toMatch(/booking_row\.status not in \('pending', 'confirmed'\)/i);
  });

  it("keeps public booking endpoints as invoker wrappers around private privileged functions", () => {
    for (const name of ["request_experience_booking", "confirm_experience_booking", "decline_experience_booking", "cancel_experience_booking", "cancel_host_experience_booking", "complete_experience_booking"]) {
      const wrapper = migration.split(`create or replace function public.${name}(`).at(-1) ?? "";
      expect(wrapper.slice(0, 500)).toMatch(/security invoker/i);
    }
  });
});
