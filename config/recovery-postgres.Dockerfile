FROM postgres:17.11 AS build
RUN apt-get update && apt-get install -y --no-install-recommends build-essential git postgresql-server-dev-17 ca-certificates
RUN git clone https://github.com/supabase/supautils.git /src/supautils && cd /src/supautils && git checkout 67cf44697d397641327c3da895740fc4ed342214 && make PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config && make install PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config
RUN git clone https://github.com/eradman/pg-safeupdate.git /src/safeupdate && cd /src/safeupdate && git checkout 37dbc9c4acf5e2504adf2b218e9c6b41751022f3 && make PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config && make install PG_CONFIG=/usr/lib/postgresql/17/bin/pg_config
FROM postgres:17.11
COPY --from=build /usr/lib/postgresql/17/lib/supautils.so /usr/lib/postgresql/17/lib/supautils.so
COPY --from=build /usr/lib/postgresql/17/lib/safeupdate.so /usr/lib/postgresql/17/lib/safeupdate.so
