# Safeway Couriers account, authentication, and RBAC report

This report describes the account system added on top of the existing Owner/staff portal. The marketing site and working `/dashboard` ATS–CRM tools were not rebuilt.

## Existing features found

Before this upgrade the portal already had:

- **Authentication:** Better Auth with email/password, Prisma adapter, PostgreSQL, httpOnly session cookies, 2FA plugin, disabled public signup, owner bootstrap at `/setup`.
- **User model:** `User` (name, email, `disabled`, `twoFactorEnabled`) plus Better Auth `Session`, `Account`, `Verification`, `TwoFactor`.
- **Roles:** Prisma roles `OWNER`, `HR_RECRUITER`, `OPERATIONS_ADMIN`, `DISPATCHER`, `COMPLIANCE_ADMIN`, `SALES_ACCOUNT_MANAGER`. Permissions existed in the database, but `getAuthContext` originally used a hardcoded matrix (custom roles would not have applied).
- **Database:** PostgreSQL via Prisma.
- **Owner/admin functionality:** One staff shell at `/dashboard` with applicants, jobs, employees, customers, contracts, documents, compliance, notifications, audit log, users, settings, and security (change password + MFA).
- **Dashboards:** Owner/staff only. No dedicated driver, employee, dispatcher-home, operations, admin, or customer portals.
- **Route protection:** Cookie check in `proxy.ts` plus `requirePermission` on server pages/actions.
- **Authorization:** Enforced on server actions and portal pages, not only in the UI. Customer/employee isolation helpers existed but were unused because those portals did not exist.
- **Gaps vs this specification:** No usernames, no account statuses, no pending activation, no sequential `SC-EMP-0001` IDs, no terminate-access workflow, no DB-driven permission enforcement, no role-specific homes, no customer tenant portal.

The original Owner account is preserved. It is not created from a password in source code.

## Implemented features

- Individual accounts with unique username, generated employee/driver/client IDs, hire/manager/department fields, last login, password-changed date, MFA flag, and account status.
- Owner **User management** (`/dashboard/users`): create user, view/edit, change role, password reset, temporary password, resend activation, lock/unlock, disable/reactivate, terminate access.
- Create-user flow: pending activation, generated ID and username, hashed temporary password shown once, activation link (7 days), first login must set a permanent password. The Owner cannot view an existing password later.
- Login at `/login` with **email or username**, forgot/reset password (generic success message), activation, set-password, logout, 8-hour sessions, rate limits, optional TOTP MFA.
- Roles: Owner, Admin, Operations Manager, Dispatcher, Driver, Employee, Customer, plus existing HR / Operations Admin / Compliance / Sales.
- Database-backed permissions; Owner can create custom roles and assign permissions at `/dashboard/roles`.
- Post-login routing to the correct dashboard; `/dashboard` is the staff/Owner shell and is blocked for driver/employee/customer/dispatcher by `requirePortal`.
- Driver, employee, dispatch, operations, admin, and customer dashboards.
- Server-side checks: authenticated, account active, permission required, customer/employee record isolation, driver can only update assigned deliveries.
- Terminate access: disable login, delete sessions and activation tokens, keep historical employee/delivery/audit records.
- Last Owner cannot be demoted, disabled, or terminated. Only an Owner can assign the Owner role.
- `GET /api/portal/me` for future mobile apps (Better Auth cookies or bearer tokens).
- Audit events for login, logout, failed login, account/role/permission/delivery/incident changes. No portal UI can delete audit rows.

Not in this pass (honest gaps): barcode/QR scan, signature capture, delivery photo upload, full customer billing/invoices/support-ticket module, shift scheduling, and native iOS/Android apps. The auth/API layer is reusable for those later.

## Database changes

Migration: `prisma/migrations/20260828000000_account_rbac_upgrade/migration.sql`

| Change | Detail |
| --- | --- |
| `AccountStatus` enum | `PENDING_ACTIVATION`, `ACTIVE`, `LOCKED`, `SUSPENDED`, `INACTIVE`, `TERMINATED` |
| `User` | `username`, `firstName`, `lastName`, `phone`, `accountStatus`, `mustChangePassword`, `passwordChangedAt`, `lastLoginAt`, `lockedUntil`, `failedLoginCount`, `activationExpiresAt`, `terminatedAt`, `terminatedBy` |
| `Role.key` | Enum → `TEXT` so custom roles can be added |
| `Employee` | `isDriver`, `managerId` |
| `Customer` | `clientNumber` (`SC-CLI-0001`) |
| New models | `IdSequence`, `Delivery`, `DeliveryEvent`, `IncidentReport`, `EmployeeTask` |

Existing Better Auth and ATS/CRM models were not dropped.

## Authentication provider

**Better Auth 1.7.2** with:

- Email/password (scrypt via Better Auth `hashPassword`)
- Username plugin
- Bearer plugin (future apps)
- Two-factor (TOTP) plugin
- Prisma + PostgreSQL
- Next.js cookies

Minimum new password length: 12 characters, mixed case, number, and symbol (`lib/password.ts`).

## Account creation process (Owner)

1. Sign in as Owner → **Users** (`/dashboard/users`).
2. Fill **Create user** (name, email, phone, title, department, role, hire date, manager, employment status). For a client login, also select the customer organization.
3. Submit. The system generates `SC-EMP-####` or `SC-DRV-####`, a unique username, a one-time temporary password, and an activation URL.
4. Copy the temporary password and link immediately. They are not stored in recoverable form.
5. If Resend is configured, the employee also receives the activation email.

## Employee login / activation process

**Option A — activation link**

1. Open `/activate?token=…` (from email or the Owner copy).
2. Set a permanent password.
3. Account becomes `ACTIVE`. Sign in at `/login`.
4. Routed to `/employee/dashboard` (or the dashboard for their role). They cannot open `/dashboard` or `/owner/dashboard`.

**Option B — temporary password**

1. Sign in with email or username plus the temporary password.
2. Forced to `/set-password`.
3. After the new password is saved, routed to their dashboard.

Activation links expire after **7 days**. Terminated accounts cannot activate or reset passwords.

## Test procedure (do not hard-code credentials)

1. Owner signs in at `/login`.
2. Users → Create user → role **Employee**.
3. Confirm the assigned `SC-EMP-####` ID and copy the temporary password / activation link.
4. Sign out. Activate or sign in as the employee and set a permanent password.
5. Confirm redirect to `/employee/dashboard`.
6. Manually open `/dashboard` and `/owner/dashboard` — should bounce back to the employee home.
7. Owner: open the user → **Terminate access** (or Disable).
8. Employee sign-in and forgot-password should fail immediately.

## Role matrix

| Capability | Owner | Admin | Ops Mgr | Dispatcher | Driver | Employee | Customer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `/dashboard` (`/owner/dashboard` redirects here) | `/admin/dashboard` | `/operations/dashboard` | `/dispatch/dashboard` | `/driver/dashboard` | `/employee/dashboard` | `/customer/dashboard` |
| Company / ATS staff tools | Yes | Yes (no owner settings) | No (ops board only) | No | No | No | No |
| Employees / customers / contracts | Yes | Yes | View drivers / limited | Customers for dispatch | Own assignments only | Own profile only | Own org only |
| Dispatch / deliveries | Yes | Yes | Yes | Yes | Own deliveries | Incidents only | Own shipments |
| Users / roles / permissions | Yes | No | No | No | No | No | No |
| System settings / finance | Yes | No | No | No | No | No | No |
| Audit log | Yes | No | No | No | No | No | No |
| Assign Owner role | Yes | No | No | No | No | No | No |

HR Recruiter, Operations Admin, Compliance Admin, and Sales keep their existing `/dashboard` homes with their previous permission sets. Permissions are stored in the database and can be changed by the Owner without a code deploy (re-seeding does **not** wipe Owner edits).

## Security controls

- Passwords hashed by Better Auth; never stored or displayed after creation.
- Public registration disabled. Owner bootstrap requires `OWNER_SETUP_SECRET` and only runs if no Owner exists.
- Cookie gate on portal prefixes; every page/action still checks session + status + permission on the server.
- Account statuses other than `ACTIVE` / valid `PENDING_ACTIVATION` cannot use the portal.
- Five failed logins lock an active account for 15 minutes. Owner **Lock** stays locked until Unlock.
- Customer queries are scoped to `ctx.user.customerId`. Drivers can only mutate their assigned deliveries. Employees only load their own profile, training, tasks, documents, and incidents.
- Last Owner protection on role revoke, disable, and terminate.
- Generic forgot-password message (no account enumeration).
- Login `next` parameter limited to same-origin paths.
- Sessions expire in 8 hours; terminate/disable deletes session rows.
- Audit log is append-only in the portal (view only).
- Future apps: same Better Auth API + `Authorization: Bearer` and `GET /api/portal/me`.

## Environment variables (Vercel)

Required for production:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL |
| `BETTER_AUTH_SECRET` | Session signing (long random secret) |
| `BETTER_AUTH_URL` | Exact public origin users sign in on, e.g. `https://portal.safewaycouriers.com` |
| `NEXT_PUBLIC_SITE_URL` | Same origin for activation/reset links |
| `OWNER_SETUP_SECRET` | One-time Owner bootstrap at `/setup` if no Owner exists |
| `DATA_ENCRYPTION_KEY` | Existing sensitive-field encryption |
| `BLOB_READ_WRITE_TOKEN` | Private document storage |
| `RESEND_API_KEY` | Activation and password-reset email |
| `EMAIL_FROM` | e.g. `Safeway Couriers <noreply@safewaycouriers.com>` |
| `CRON_SECRET` | Existing alert cron |

Copy `.env.example`. Never commit `.env.local`.

## Email requirements

**Yes — you need an email provider for production.** The app uses **Resend**. Without `RESEND_API_KEY`:

- Locally, activation/reset messages are printed to the server log and the Owner still sees the activation URL / temporary password on screen.
- In production, sending throws and account-setup emails will not go out.

SendGrid/SES are not wired. You can keep Resend or later swap `lib/email.ts`.

Verify `noreply@safewaycouriers.com` (or your from-address) in Resend.

## Production deployment (`https://portal.safewaycouriers.com`)

This is the same Next.js app as `www.safewaycouriers.com`, not a second codebase.

1. Add `portal.safewaycouriers.com` as a domain on the Vercel project (DNS CNAME to Vercel).
2. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` to `https://portal.safewaycouriers.com` (or keep www if that is the only login host — they must match the URL in the browser).
3. `trustedOrigins` already includes `https://portal.safewaycouriers.com`.
4. Run `prisma migrate deploy` against production Postgres (do not reset data).
5. Run `prisma db seed` once after migrate so new roles/permissions/ID sequences exist. Seed no longer overwrites permission checkboxes the Owner already saved.
6. Configure Resend + from-address.
7. Confirm the existing Owner can sign in; do not run `/setup` if an Owner already exists.

## Manual actions you must do

These are **not** finished until you configure them:

1. **Vercel env vars** listed above, especially `BETTER_AUTH_URL` / `NEXT_PUBLIC_SITE_URL` for the portal hostname.
2. **DNS / Vercel domain** for `portal.safewaycouriers.com`.
3. **Resend** API key and verified from-domain, or activation/reset email will not send in production.
4. **Production migrate + seed** on the live database.
5. **Owner password:** change it in **Security** if it is still a temporary value. It is not in the source code.
6. Create a **test employee** with the procedure above; no test password is baked into the app.

Local migrate needs `DATABASE_URL` from `.env.local` (Prisma does not load that file by itself unless you export it).
