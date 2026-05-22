CREATE TYPE "UserRole" AS ENUM ('admin', 'permanent', 'partner', 'subscriber');
ALTER TABLE users
  ADD COLUMN role "UserRole" NOT NULL DEFAULT 'subscriber',
  ADD COLUMN access_expires_at TIMESTAMP(3),
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

UPDATE users SET role = 'admin' WHERE email = 'matheusgmlima28@gmail.com';
