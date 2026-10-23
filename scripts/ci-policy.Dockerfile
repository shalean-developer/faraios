# Exact Node 24 / PostgreSQL 17 bases already used by T19 offline verification.
FROM node@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS node
FROM postgres@sha256:0af65001d05296a2ead57ac4a6412433d8913d1bb5d0c88435a7d1e1ee5cb04b
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm
RUN mkdir -p /repo && chown postgres:postgres /repo
WORKDIR /repo
COPY --chown=postgres:postgres . .
USER postgres
RUN npm ci --ignore-scripts
ENTRYPOINT ["/bin/bash", "/repo/scripts/run-ci-policy.sh"]
