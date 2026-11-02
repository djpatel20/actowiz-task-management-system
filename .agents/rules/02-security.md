---
trigger: always_on
description: Mandatory authentication, authorization, validation, data protection, and API security requirements.
---

# Security Rules

## Authentication

- Hash passwords with bcrypt using an appropriate work factor.
- Never store plaintext passwords.
- Sign JWTs using environment secrets.
- Configure explicit token expiry.
- Prefer HTTP-only, Secure-in-production, SameSite cookies for browser authentication.
- Do not put long-lived refresh tokens in localStorage.
- If using access and refresh tokens, implement refresh-token/session revocation so logout can invalidate the session.
- Clearing a cookie alone does not revoke a stateless JWT.
- Validate the current user and account active status on protected requests.
- Return generic login errors. Do not reveal whether an email exists.
- Rate-limit login and other sensitive endpoints.

## Cookie and Browser Security

- Configure CORS with an explicit frontend origin.
- Never use wildcard origin with credentials.
- Use HttpOnly, Secure in production, and an appropriate SameSite policy.
- Consider CSRF protection for cookie-authenticated state-changing requests.
- Validate Origin/Referer and/or use a CSRF token strategy appropriate to the cookie setup.
- Use Helmet and appropriate security headers.

## Authorization and IDOR Prevention

- Authenticate before authorization.
- Enforce authorization in backend middleware/services for every protected resource.
- Never trust client-supplied role, teamId, createdBy, or ownership fields.
- Fetch the resource and verify the actor can access that exact resource before reading or modifying it.
- Distinguish permission to view a task from permission to edit it, change its status, assign it, or comment on it.
- Admin may access all teams.
- Manager access is restricted to their own team.
- Employee access is restricted to tasks assigned to them.
- Verify task, project, team, and assignee consistency on create and update.

## Input and Output

- Validate params, query strings, and request bodies with Zod.
- Use allowlisted update fields.
- Never pass req.body directly into a Mongoose update.
- Prevent NoSQL operator injection.
- Do not accept arbitrary MongoDB filters from clients.
- Limit string lengths, array sizes, pagination bounds, and attachment sizes/types.
- Normalize email addresses and validate IDs.
- Avoid returning password hashes, token secrets, internal stack traces, or sensitive fields.
- Use consistent error responses without leaking implementation details.

## Configuration

- Keep secrets in environment variables.
- Provide .env.example with placeholders only.
- Validate required environment variables at startup.
- Never commit .env, private keys, real seed passwords, or production credentials.
- Use separate development and production settings.

## Audit and Files

- Generate activity records on the server.
- Clients cannot create or edit audit records.
- If attachments are implemented, validate file size, extension, and MIME type.
- Use safe generated filenames.
- Do not trust the original filename.
- Do not expose uploaded files publicly unless that is an intentional, access-controlled design.

## Security Verification

Test:

- Unauthenticated access.
- Wrong-role access.
- Cross-team access.
- Unassigned task access.
- Inactive users.
- Invalid transitions.
- Mass-assignment attempts.
- Invalid IDs.

Frontend-only restrictions are never sufficient.
