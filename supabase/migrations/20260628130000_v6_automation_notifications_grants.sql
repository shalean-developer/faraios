-- Grants for V6 workflows and notifications (RLS policies exist but grants were missing).

grant select, insert, update, delete on table public.workflows to authenticated;
grant select, insert on table public.workflow_runs to authenticated;
grant select on table public.automation_jobs to authenticated;
grant select, update on table public.company_notifications to authenticated;
grant select, insert on table public.company_activity_logs to authenticated;
