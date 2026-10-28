FROM faraios-t19-pinned-base:20261028
RUN test -d /etc/postgresql-custom && test ! -e /etc/postgresql-custom/pgsodium_root.key && test ! -L /etc/postgresql-custom/pgsodium_root.key && ln -s /var/lib/postgresql/data/pgsodium_root.key /etc/postgresql-custom/pgsodium_root.key
