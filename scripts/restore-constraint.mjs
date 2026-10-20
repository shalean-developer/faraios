// One exact native CHECK round-trip difference. Reconstruct its original
// reviewed BETWEEN syntax; do not normalize SQL or relax catalog fingerprints.
export const WORKING_DAYS_SOURCE_DEF='CHECK ((((cardinality(working_days) >= 1) AND (cardinality(working_days) <= 7)) AND (working_days <@ ARRAY[(0)::smallint, (1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint])))';
export const WORKING_DAYS_REPLAY_DEF='CHECK (((cardinality(working_days) >= 1) AND (cardinality(working_days) <= 7) AND (working_days <@ ARRAY[(0)::smallint, (1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint])))';
export const WORKING_DAYS_CHECK='CHECK (cardinality(working_days) BETWEEN 1 AND 7 AND working_days <@ ARRAY[0,1,2,3,4,5,6]::smallint[])';
export const RECONSTRUCT_WORKING_DAYS_SQL=`DO $t11_working_days$
DECLARE k record; column_number smallint; definition text;
BEGIN
 SELECT c.*,pg_get_constraintdef(c.oid) AS definition,obj_description(c.oid,'pg_constraint') AS description,
        pg_get_userbyid(t.relowner) AS owner,t.relkind
 INTO k FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
 WHERE n.nspname='public' AND t.relname='business_settings' AND c.conname='business_settings_working_days_check';
 IF NOT FOUND OR k.contype<>'c' OR NOT k.convalidated OR k.condeferrable OR k.condeferred OR k.connoinherit
 OR NOT k.conislocal OR k.coninhcount<>0 OR k.conparentid<>0 OR k.description IS NOT NULL OR k.owner<>'postgres' OR k.relkind<>'r'
 THEN RAISE EXCEPTION 'RESTORE_CHECK_RECONSTRUCTION_REFUSED'; END IF;
 SELECT attnum INTO column_number FROM pg_attribute WHERE attrelid=k.conrelid AND attname='working_days' AND NOT attisdropped AND atttypid='smallint[]'::regtype;
 IF column_number IS NULL OR k.conkey IS DISTINCT FROM ARRAY[column_number]
 OR EXISTS(SELECT 1 FROM pg_inherits WHERE inhrelid=k.conrelid OR inhparent=k.conrelid)
 OR EXISTS(SELECT 1 FROM public.business_settings)
 OR k.definition NOT IN ('${WORKING_DAYS_SOURCE_DEF}','${WORKING_DAYS_REPLAY_DEF}')
 THEN RAISE EXCEPTION 'RESTORE_CHECK_RECONSTRUCTION_REFUSED'; END IF;
 IF k.definition='${WORKING_DAYS_REPLAY_DEF}' THEN
  ALTER TABLE public.business_settings DROP CONSTRAINT business_settings_working_days_check;
  ALTER TABLE public.business_settings ADD CONSTRAINT business_settings_working_days_check ${WORKING_DAYS_CHECK};
 END IF;
 SELECT pg_get_constraintdef(c.oid) INTO definition FROM pg_constraint c WHERE c.conrelid=k.conrelid AND c.conname='business_settings_working_days_check';
 IF definition IS DISTINCT FROM '${WORKING_DAYS_SOURCE_DEF}' THEN RAISE EXCEPTION 'RESTORE_CHECK_RECONSTRUCTION_REFUSED'; END IF;
END $t11_working_days$;
`;
