-- Staging-only inactive role. No password, LOGIN or public API function.
create role t19_standard_backend nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
grant usage on schema private_t19_standard to t19_standard_backend;
grant select,insert,update on private_t19_standard.connections,private_t19_standard.oauth_states to t19_standard_backend;
create policy standard_backend_staging on private_t19_standard.connections to t19_standard_backend
 using(environment='staging') with check(environment='staging');
create policy standard_backend_staging on private_t19_standard.oauth_states to t19_standard_backend
 using(environment='staging') with check(environment='staging');
-- Referenced-key checks run through PostgreSQL RI triggers; runtime needs no
-- read/write grant to public businesses, memberships, customer or invoice tables.
