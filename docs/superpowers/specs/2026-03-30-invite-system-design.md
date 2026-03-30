# Team Invite System Design

**Goal:** Allow admins to invite team members to the BERG admin panel by generating a signup link (with copy-to-clipboard) and sending an email invite via Resend.

## Architecture

Admin creates invite → system generates token + stores in `invites` table → link displayed with Copy button + email sent via Resend → invitee clicks link → sets name/password on accept-invite page → account created, token consumed, user logged in.

## Database

New `invites` table:
```sql
CREATE TABLE IF NOT EXISTS invites (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK(role IN ('admin', 'editor')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);
```

## API Endpoints

### POST /api/users/invite (auth required, admin only)
- Input: `{ email, role }`
- Validates email not already a user
- Generates 64-char hex token via `crypto.randomBytes(32)`
- Inserts into invites table with 7-day expiry
- Sends invite email via Resend
- Returns: `{ invite: { id, email, role, token, expires_at }, link }`

### POST /api/users/accept-invite (public, no auth)
- Input: `{ token, name, password }`
- Validates token exists, not expired, not used
- Creates user with email/role from invite
- Marks token as used
- Generates JWT tokens, sets cookies
- Returns: `{ user: { id, name, email, role } }`

## Frontend

### Updated UsersPage
- "Invite Team Member" button next to existing "Add User"
- Invite form: email + role selector
- After invite: show link with Copy button + success message

### New AcceptInvitePage (`/admin/accept-invite`)
- Public page (no auth required)
- Reads `token` from URL query params
- Shows: BERG branding, name field, password field, submit button
- On success: redirects to `/admin`
- On error: shows "Invalid or expired invite link"

## Email Template
- From: BERG Collective <info@bergcollective.org>
- Subject: "You're invited to BERG Collective"
- Body: BERG branded HTML with invite link button
- Link: `{FRONTEND_URL}/admin/accept-invite?token={token}`
