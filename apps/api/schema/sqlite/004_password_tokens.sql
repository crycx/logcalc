-- Parooli seadmise lingid: kutse uuele kasutajale ja admini saadetud uue parooli link.
-- Ühekordne, aegub (vaikimisi 7 päeva); andmebaasis ainult lingi räsi (SHA-256).
CREATE TABLE password_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'invite',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX idx_password_tokens_user ON password_tokens(user_id);
