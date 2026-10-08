-- 0004_user_bio: a member's self-introduction
--
-- Sign-up asks for an id, a nickname (display_name) and an optional bio.
-- NULL means the member left it out.

ALTER TABLE users
  ADD COLUMN bio text CHECK (char_length(bio) BETWEEN 1 AND 500);
