-- Public callers cannot mint arbitrary requester hashes to bypass or inflate rate limits.
revoke all on function public.consume_cultural_evidence_limit(text) from public, anon, authenticated;
grant execute on function public.consume_cultural_evidence_limit(text) to service_role;
