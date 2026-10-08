-- Retain community reports for at most 25 months, allowing a complete 24-month
-- calendar reporting window. Withdrawn reports immediately lose narrative/pressure
-- values and are removed by this scheduled retention job.
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
from cron.job
where jobname = 'michi-community-feedback-retention';

select cron.schedule(
  'michi-community-feedback-retention',
  '27 3 * * *',
  $job$delete from public.community_feedback where created_at < now() - interval '25 months';$job$
);
