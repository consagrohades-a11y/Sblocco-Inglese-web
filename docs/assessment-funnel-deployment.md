# Public assessment funnel deployment

## What this release adds

- Public route: `/assessment`
- Personal result route: `/profilo/:token`
- Admin lead pipeline: `/admin/leads`
- Vercel email function: `/api/send-assessment-result`
- Supabase table and RPCs for public lead capture, secure result retrieval, follow-up requests and admin management

## Required Supabase migration

Apply only:

`supabase/migrations/20260716090000_public_assessment_leads.sql`

The migration creates `public.assessment_leads` and the following RPCs:

- `submit_public_assessment_lead`
- `get_public_assessment_result`
- `request_public_assessment_followup`
- `mark_public_assessment_email_status`
- `admin_list_assessment_leads`
- `admin_update_assessment_lead`

The table is not directly readable or writable by anonymous users. Public access is limited to the narrow security-definer functions above. The personal result link exposes the generated profile, name and profession, but not the saved email address, WhatsApp number, raw answers or internal notes.

## Required Vercel environment variables

### `RESEND_API_KEY`

Private API key used only by the Vercel server function to send the result email.

### `ASSESSMENT_FROM_EMAIL`

Verified sender, for example:

`Sblocco Inglese <profilo@sbloccoinglese.com>`

The domain or sender must be verified in the email provider before public recruitment begins. The code falls back to the provider onboarding sender, but that fallback is not appropriate for normal public delivery.

### `ASSESSMENT_PUBLIC_URL`

Recommended production value:

`https://sbloccoinglese.com`

This is used to generate the secure result link in the email. If omitted, the request origin is used.

## Behaviour when email is not configured

The assessment result is still saved and shown immediately on the website. The page reports that email delivery is not currently available. This prevents a provider outage or missing key from destroying a completed assessment.

## Consent model

The result form contains two separate controls:

1. Required consent to process the supplied information and deliver the requested profile.
2. Optional consent for course openings, beta invitations and practical marketing communication.

A person can receive the requested result without joining a marketing list.

## Recruitment workflow

1. Visitor completes the assessment.
2. Visitor sees a useful preview.
3. Visitor submits name and email.
4. Supabase stores the lead and returns a random result token.
5. The complete result appears immediately.
6. Vercel sends the result email.
7. The visitor can request beta or course follow-up from the result page.
8. Admin reviews and updates the lead in `/admin/leads`.

## Recommended pre-launch checks

- Apply the migration in the linked Supabase project.
- Add and verify all three Vercel environment variables.
- Complete the assessment with Gmail, Outlook and a work-domain test address.
- Verify the personal link opens without login.
- Confirm the link does not expose email or raw answers.
- Confirm a follow-up request appears in the admin lead pipeline.
- Confirm marketing consent remains optional.
- Review the Privacy Policy before starting a broad public campaign so the final list of processors and retention choices matches the production setup.
