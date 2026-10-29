#!/bin/sh
set -eu

#######################################
# Used by both ami and docker builds to initialise database schema.
# Env vars:
#   POSTGRES_DB        defaults to postgres
#   POSTGRES_HOST      defaults to localhost
#   POSTGRES_PORT      defaults to 5432
#   POSTGRES_PASSWORD  defaults to ""
#   USE_DBMATE         defaults to ""
# Exit code:
#   0 if migration succeeds, non-zero on error.
#######################################

export PGDATABASE="${POSTGRES_DB:-postgres}"
export PGHOST="${POSTGRES_HOST:-localhost}"
export PGPORT="${POSTGRES_PORT:-5432}"
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

# if args are supplied, simply forward to dbmate
connect="$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE?sslmode=disable"
if [ "$#" -ne 0 ]; then
	export DATABASE_URL="${DATABASE_URL:-postgres://supabase_admin:$connect}"
	exec dbmate "$@"
	exit 0
fi

db=$(cd -- "$(dirname -- "$0")" >/dev/null 2>&1 && pwd)

# T19: only the fresh init-script sessions bypass extension-owner redirection.
# The GUC is SIGHUP-only: a backend SET/PGOPTIONS override is not supported.
t19_wait_privileged_extensions() {
 t19_expected="$1"
 t19_tries=0
 while [ "$t19_tries" -lt 10 ]; do
  t19_seen=$(psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -qAt -c "SHOW supautils.privileged_extensions")
  if [ "$t19_seen" = "$t19_expected" ]; then return 0; fi
  t19_tries=$((t19_tries + 1))
  sleep 1
 done
 echo T19_INIT_EXTENSION_CONFIG_RELOAD_FAILED >&2
 return 1
}

if [ -z "${USE_DBMATE:-}" ]; then
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin <<EOSQL
do \$\$
begin
  -- postgres role is pre-created during AMI build
  if not exists (select from pg_roles where rolname = 'postgres') then
    create role postgres superuser login password '$PGPASSWORD';
    alter database postgres owner to postgres;
  end if;
end \$\$
EOSQL
	t19_privileged_before=$(psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -qAt -c "SHOW supautils.privileged_extensions")
	test -n "$t19_privileged_before"
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -c "ALTER SYSTEM SET supautils.privileged_extensions TO ''"
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -c "SELECT pg_reload_conf()"
	t19_wait_privileged_extensions ""
	# Prime the unchanged vendor stats extension before role/default-ACL setup.
	# Its later IF NOT EXISTS migration must not create it as supabase_admin.
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U postgres -f "$db/migrations/00-extension.sql"
	# run init scripts as postgres user
	for sql in "$db"/init-scripts/*.sql; do
		echo "$0: running $sql"
		psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U postgres -f "$sql"
	done
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -c "ALTER SYSTEM RESET supautils.privileged_extensions"
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -c "SELECT pg_reload_conf()"
	t19_wait_privileged_extensions "$t19_privileged_before"
	echo T19_INIT_EXTENSION_CONFIG_RESTORED
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U postgres -c "ALTER USER supabase_admin WITH PASSWORD '$PGPASSWORD'"
	# run migrations as super user - postgres user demoted in post-setup
	for sql in "$db"/migrations/*.sql; do
		echo "$0: running $sql"
		psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -f "$sql"
	done
else
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin <<EOSQL
  create role postgres superuser login password '$PGPASSWORD';
  alter database postgres owner to postgres;
EOSQL
	# run init scripts as postgres user
	DBMATE_MIGRATIONS_DIR="$db/init-scripts" DATABASE_URL="postgres://postgres:$connect" dbmate --no-dump-schema migrate
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U postgres -c "ALTER USER supabase_admin WITH PASSWORD '$PGPASSWORD'"
	# run migrations as super user - postgres user demoted in post-setup
	DBMATE_MIGRATIONS_DIR="$db/migrations" DATABASE_URL="postgres://supabase_admin:$connect" dbmate --no-dump-schema migrate
fi

# run any post migration script to update role passwords
postinit="/etc/postgresql.schema.sql"
if [ -e "$postinit" ]; then
	echo "$0: running $postinit"
	psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -f "$postinit"
fi

# once done with everything, reset stats from init
psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -c 'SELECT extensions.pg_stat_statements_reset(); SELECT pg_stat_reset();' || true
