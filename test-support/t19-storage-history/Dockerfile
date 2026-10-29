# SOURCE-ONLY recipe. The build operator must verify this local tag resolves
# to the immutable baseImage in config/t19-storage-history-proposal.json.
FROM faraios-t19-storage-history-base:20261029
COPY --chown=0:0 --chmod=0644 0002-storage-schema.sql 0062-object-versioning-core.sql /app/migrations/tenant/
COPY --chown=0:0 --chmod=0644 LICENSE NOTICE /usr/share/doc/faraios-t19-storage-history/
