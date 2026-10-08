-- 0005_memberships: which services a member has joined
--
-- One person, many services (CLAUDE.md): a member is one `users` row, and
-- signing in to a service for the first time records joining it here. The
-- service is its OIDC client id (e.g. 'todo'), which is also its name in
-- https://{service}.hwahee.com.

CREATE TABLE memberships (
  user_id    text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  service    text NOT NULL CHECK (char_length(service) BETWEEN 1 AND 100),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, service)
);
