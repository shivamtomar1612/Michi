# Host and Community Platform (Phase 10)

## Scope

Phase 10 adds the verified-host workspace and manages MICHI-owned experiences. It does not create host accounts or listings for operators found on public tourism websites. Existing host application review remains the route to host verification.

## Routes

- `/host`: listing, upcoming booking, guest, gross booking value proxy, future capacity utilization, guest rating, and host-reported community pressure summaries.
- `/host/experiences`: host inventory and recommendation controls.
- `/host/experiences/new`: create a draft listing.
- `/host/experiences/[id]`: edit a listing and manage its slots.
- `/host/bookings`: view and confirm or decline relevant booking requests.
- `/host/analytics`: host-scoped operational and guest outcome summaries.
- `/host/community`: submit host observations and view linked context.
- `/host/settings`: update host profile details.

All host routes require an authenticated host role at the server boundary. Database RLS remains authoritative for record access and verified-host write operations. Drafts are not public. Publishing requires MICHI verification; pausing removes an approved experience from new recommendations without canceling confirmed bookings.

## Experience and availability behavior

Host actions validate form input with Zod and use the signed-in Supabase client. Experience images are stored in the `experience-images` bucket, limited to JPEG, PNG, WebP, or AVIF and 8 MiB each. The bucket is public because approved listing images are public; hosts are warned not to upload private or sensitive imagery. Upload, update, and deletion policies restrict writes to the verified host's own UUID and experience folders.

Hosts can add genuine date-specific slots, change capacity only at or above already reserved guests and at or below the experience maximum, and close or reopen future slots. Booking capacity remains updated transactionally through the existing booking RPC. Closing a slot only stops new requests; it does not remove bookings. Existing booking confirmation/decline behavior is retained.

The dashboard uses records returned under host RLS. Capacity utilization includes future open and full slots only. Gross booking value is a booking-total proxy, not earnings or settlement. Community pressure is host-reported context, not a live crowd signal. Guest feedback pages read score fields only and do not display private comments.

## Cultural rules and provenance

When a verified host publishes or updates an approved experience, a restricted database function synchronizes the listing's photography, participation, etiquette, eligibility, meeting, accessibility, and cancellation information into Phase 6 cultural knowledge. These records use `source_type = host`, `verification_status = community_verified`, and the source label **Provided directly by host**. The function checks the authenticated role, verified-host status, ownership, publication, and the canonical experience URL. Hosts cannot set official or government source metadata through this workflow.

## Hosted Supabase changes

Applied additive migrations:

- `20261008155004_phase10_host_community_platform`
- `20261008155144_phase10_cultural_rules_detail`

They add `experiences.image_paths`, the public listing-image bucket and scoped Storage policies, and the host-rule synchronization function. No records were fabricated or inserted for this phase. The connected hosted catalog had no MICHI host experiences, slots, or bookings at audit time; real account-based workflow coverage therefore depends on an actual verified host.

## Validation and limitations

Automated schema validation covers experience coordinates, image count, photography policy, and rule language. Existing booking RPC locking and database capacity constraints provide the transactional booking guard. No end-to-end host login, upload, listing publication, or booking could be exercised without a genuine verified host account and listing. See the Phase 10 completion report for the current checks and hosted state.
