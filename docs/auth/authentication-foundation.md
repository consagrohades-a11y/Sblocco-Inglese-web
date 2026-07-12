# Authentication Foundation

## Scope

This document describes the first authentication foundation for the Vite React app.

It adds learner signup, login, logout, password-reset request and update, a protected account page, and automatic learner profile creation. It does not add assignments UI, admin UI, paid access, Stripe, social login, trainer content migration, or production database changes from Codex.

## Supabase URL Configuration

The browser app uses the existing reusable Supabase client:

```text
src/lib/supabaseClient.js
```

Required Vite environment variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Only the publishable browser key is used. No service-role key, secret key, database URL, or database password belongs in Vite environment files.

## Signup Flow

Route:

```text
/register
```

The form asks for:

- display name;
- email;
- password;
- password confirmation.

The browser sends only `display_name` as safe Supabase Auth user metadata. The browser does not send `role`, `status`, `id`, `created_at`, or `updated_at`.

If Supabase requires email confirmation, the page tells the learner to check their email before logging in.

## Login Flow

Route:

```text
/login
```

The form asks for:

- email;
- password.

Invalid credentials, unconfirmed email, weak password, network failure, and general Supabase failures are mapped to learner-safe messages. Raw technical errors are not displayed.

## Password Reset Flow

Request route:

```text
/forgot-password
```

The form sends a Supabase password-reset email request with:

```text
redirectTo: ${window.location.origin}/update-password
```

The app shows a confirmation message when the reset email request succeeds.

Update route:

```text
/update-password
```

A learner who arrives from a valid Supabase recovery email receives a temporary Supabase Auth session. The update page requires that session before enabling the form. The form asks for:

- new password;
- password confirmation.

On submit, the browser calls:

```js
supabase.auth.updateUser({ password })
```

The page handles missing, invalid, or expired recovery sessions with a safe message and a link to request a new reset email. Password mismatch, weak password, network failure, expired reset links, and successful password update are also handled without displaying raw Supabase errors.

After a successful update, the app shows a success message, signs out the recovery session, and redirects to `/login` so the learner can sign in with the new password.

## Profile Auto-Creation

Migration:

```text
supabase/migrations/20260713090000_auth_profile_bootstrap.sql
```

The migration adds:

- `public.handle_new_auth_user()`
- `on_auth_user_created` trigger on `auth.users`

On `auth.users` insert, the trigger inserts one `public.profiles` row:

- `id`: new auth user id;
- `display_name`: `raw_user_meta_data.display_name` when present, otherwise empty string;
- `interface_language`: `it`;
- `timezone`: `Europe/Rome`;
- `role`: `learner`;
- `status`: `active`.

The function is `SECURITY DEFINER`, uses an empty `set search_path = ''`, fully qualifies `public.profiles`, revokes execute from `PUBLIC`, and uses `on conflict (id) do nothing` so repeated creation attempts do not overwrite protected profile fields.

The empty search path keeps the trigger function from resolving attacker-controlled objects by name. Any database object referenced by the function must remain schema-qualified.

## Protected Routes

Route:

```text
/account
```

`/account` is wrapped by `ProtectedRoute`. While auth state is loading, it shows a loading state. If there is no authenticated user, it redirects to `/login`.

The account page shows:

- display name;
- email;
- interface language;
- account role;
- logout button.

## Navigation

The existing navbar gets one small auth control:

- logged out: `Login`;
- logged in: `Account`.

No broader navigation redesign is included.

## Email Provider Configuration

Supabase Auth email delivery must be configured before real learner use.

Required checks in Supabase:

- site URL points to the production domain;
- redirect URLs include the production domain and local development origin;
- confirmation email template sends learners back to an approved URL;
- password reset email template has an approved redirect URL;
- SMTP/provider settings are production-ready before public launch.

Codex did not connect to Supabase or apply these settings.

## First Admin Promotion

New signups always become `learner` profiles. The browser cannot promote users to admin.

The first admin should be promoted later through a trusted server-side or Supabase SQL-console process after identity is verified:

```sql
update public.profiles
set role = 'admin',
    status = 'active',
    updated_at = now()
where id = '<verified-auth-user-uuid>';
```

Do not expose this operation through the browser app.

## Files Changed

- `supabase/migrations/20260713090000_auth_profile_bootstrap.sql`
- `src/auth/AuthContext.jsx`
- `src/auth/ProtectedRoute.jsx`
- `src/auth/authMessages.js`
- `src/components/auth/AuthFormField.jsx`
- `src/components/auth/AuthNotice.jsx`
- `src/components/auth/AuthPageShell.jsx`
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/UpdatePassword.jsx`
- `src/pages/Account.jsx`
- `src/App.jsx`
- `src/main.js`
- `src/components/Navbar.jsx`
- `scripts/validate-auth-foundation.mjs`
- `package.json`
- `docs/auth/authentication-foundation.md`

## Unresolved Issues

- Email confirmation and reset redirect URLs must be configured in Supabase.
- Profile editing is not implemented; account currently displays profile data only.
- Admin UI and assignment UI are intentionally not included.
- Auth flows need browser QA against a non-production Supabase project before production rollout.
