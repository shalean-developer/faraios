-- Captured from FaraiOS staging before Stage 1; rollback requires separate review.
CREATE OR REPLACE FUNCTION audit.validate_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare ctx jsonb;c public.business_customers;a public.customer_addresses;item public.business_catalogue;line jsonb;lines jsonb:='[]';qty integer;total bigint:=0;line_no integer:=0;seen uuid[]:='{}';uid uuid;local_end timestamp;
begin
 ctx:=public.booking_context(new.business_id);
 if tg_op='INSERT' then
  new:=audit.build_booking_snapshot(new);
 else
  if new.id<>old.id or new.business_id<>old.business_id or new.request_key<>old.request_key or new.customer_id<>old.customer_id or new.address_id<>old.address_id or new.selection<>old.selection or new.price_lines<>old.price_lines or new.total_cents<>old.total_cents or new.currency<>old.currency or new.customer_snapshot<>old.customer_snapshot or new.address_snapshot<>old.address_snapshot or new.required_team_size<>old.required_team_size or new.time_zone<>old.time_zone or new.created_at<>old.created_at or new.request_payload<>old.request_payload then raise exception 'Booking identity and snapshots are immutable';end if;
  if old.status in ('completed','cancelled') then raise exception 'Completed and cancelled bookings cannot be changed';end if;
  if new.status<>old.status and not (
   (old.status='draft' and new.status in ('confirmed','cancelled')) or
   (old.status='confirmed' and new.status in ('assigned','cancelled')) or
   (old.status='assigned' and new.status in ('en_route','cancelled')) or
   (old.status='en_route' and new.status in ('arrived','cancelled')) or
   (old.status='arrived' and new.status in ('in_progress','cancelled')) or
   (old.status='in_progress' and new.status='completed')) then raise exception 'Invalid booking transition';end if;
  if (new.local_start<>old.local_start or new.duration_minutes<>old.duration_minutes) and (old.status not in ('draft','confirmed','assigned','en_route','arrived') or new.status<>old.status or length(trim(new.change_reason))=0) then raise exception 'Rescheduling requires a pre-start booking and reason';end if;
  if new.assigned_staff<>old.assigned_staff and (old.status not in ('confirmed','assigned') or length(trim(new.change_reason))=0) then raise exception 'Assignment changes require a confirmed or assigned booking and reason';end if;
  if new.status='cancelled' and length(trim(new.change_reason))=0 then raise exception 'Cancellation reason required';end if;
  new.version:=old.version+1;
 end if;
 if new.assigned_staff is null or cardinality(new.assigned_staff)>100 or array_position(new.assigned_staff,null) is not null or cardinality(new.assigned_staff)<>(select count(distinct x) from unnest(new.assigned_staff) x) then raise exception 'Invalid staff assignment';end if;
 -- Check assignee membership at assignment and each operational transition.
 if tg_op='INSERT' or new.assigned_staff<>old.assigned_staff or (new.status<>old.status and new.status<>'cancelled') then
  foreach uid in array new.assigned_staff loop
   if not exists(select 1 from jsonb_array_elements(ctx->'staff') x where x.value->>'user_id'=uid::text) then raise exception 'Assignee must be active staff in this business';end if;
  end loop;
 end if;
 if new.status in ('assigned','en_route','arrived','in_progress','completed') and cardinality(new.assigned_staff)<new.required_team_size then raise exception 'Assign the required service team before proceeding';end if;
 if new.status in ('draft','confirmed') and cardinality(new.assigned_staff)>0 then raise exception 'Set Assigned status when assigning the team';end if;
 new.starts_at:=new.local_start at time zone new.time_zone;
 new.ends_at:=new.starts_at+make_interval(mins=>new.duration_minutes);
 if not isfinite(new.local_start) then raise exception 'Enter a finite booking date';end if;
 local_end:=new.local_start+make_interval(mins=>new.duration_minutes);
 if tg_op='INSERT' or new.local_start<>old.local_start or new.duration_minutes<>old.duration_minutes or new.hours_override_reason<>old.hours_override_reason then
  if (not (ctx->'working_days' @> to_jsonb(array[extract(dow from new.local_start)::integer])) or new.local_start::time<(ctx->>'opens_at')::time or local_end::date<>new.local_start::date or local_end::time>(ctx->>'closes_at')::time) and length(trim(new.hours_override_reason))=0 then raise exception 'Outside business working hours: enter an override reason';end if;
 end if;
 new.updated_at:=now();return new;
end;
$function$
