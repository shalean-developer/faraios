FROM node@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS node
FROM postgres@sha256:0af65001d05296a2ead57ac4a6412433d8913d1bb5d0c88435a7d1e1ee5cb04b
COPY --from=node /usr/local/bin/node /usr/local/bin/node
ADD candidate.tar /repo/
COPY run.sh /harness/run.sh
RUN mkdir /evidence && chown postgres:postgres /evidence
USER postgres
WORKDIR /repo
ENTRYPOINT ["/bin/bash", "/harness/run.sh"]
