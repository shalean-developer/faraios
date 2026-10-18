# Foundation validation

Work package: initial blueprint and pure business-access policy core, 19 October 2026.

Run with Node.js 24: `npm ci --ignore-scripts`, `npm run check`, `npm test`.

Tests cover business-switcher membership scope, cross-business denial, role permissions, suspended/missing/unknown claims, hostile role names, record-business mismatch, staff assignment boundaries and own-earnings boundaries.

These tests validate only a pure policy function with trusted synthetic inputs. They do not establish real authentication, database isolation, production security, tenant-safe reporting, live integrations or release readiness. Those remain later acceptance requirements. No real user records or credentials are present.

Task status: T01 scope baseline recorded under the owner's instruction to build the tracker plan. T02/T03/T04 documents prepared for review. T05 blocked on hosting/cost evidence. T06 partial: repository and executable checks only; GitHub run evidence must be verified separately.
