create schema book05_eft;
revoke all on schema book05_eft from public,anon;
grant usage on schema book05_eft to authenticated;
alter function public.book05_verify_eft(uuid,uuid,int,text) set schema book05_eft;
alter role authenticator set pgrst.db_schemas='public, graphql_public, book05_eft';
notify pgrst,'reload config';
notify pgrst,'reload schema';
