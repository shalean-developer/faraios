-- Extend website tracking events for Core Web Vitals reporting
alter table public.website_tracking_events
  drop constraint if exists website_tracking_events_type_check;

alter table public.website_tracking_events
  add constraint website_tracking_events_type_check
  check (event_type in (
    'page_visit', 'booking_form_view', 'booking_submission',
    'quote_request', 'contact_submission', 'web_vital', 'click'
  ));
