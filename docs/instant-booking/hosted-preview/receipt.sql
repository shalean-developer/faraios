create or replace function instant_private.receipt(p_ref uuid) returns jsonb
language sql stable security definer set search_path='' as $$
    select jsonb_build_object('state', state, 'booking', booking_id, 'slug', slug)
    from instant_private.holds where reference = p_ref
$$;
