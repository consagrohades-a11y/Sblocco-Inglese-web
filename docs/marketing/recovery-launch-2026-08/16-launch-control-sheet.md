# Recupero Debito Inglese — Marketing Launch Control Sheet

This is the manual operating sheet for H0 onward. Leave metrics blank until they are actually observed.

## Manual launch-control table

| timestamp | source | medium | utm_content | post/ad status | spend | visits | diagnostic starts | diagnostic completes | product clicks | signups | checkout starts | purchases | onboarding | first session starts | first session completes | notes |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Copy-paste header for Google Sheets / CSV

```text
timestamp,source,medium,utm_content,post/ad status,spend,visits,diagnostic starts,diagnostic completes,product clicks,signups,checkout starts,purchases,onboarding,first session starts,first session completes,notes
```

## Allowed `post/ad status` values

Use explicit operational states:

- `DRAFT`
- `RULES CHECK REQUIRED`
- `READY`
- `PENDING MODERATION`
- `POSTED`
- `REJECTED`
- `PAUSED`
- `ACTIVE`
- `STOPPED`
- `NOT ELIGIBLE`

Do not write `ACTIVE` unless the paid campaign/ad is actually enabled.  
Do not write `POSTED` unless the group/social post was actually published.

## Spend handling

- Organic Facebook/group row: enter `0` only after the post exists; otherwise leave blank.
- Google/Meta: use actual platform spend, not the planned daily budget.
- Do not estimate spend from clicks or impressions.

## Metric handling

- Leave unavailable metrics blank.
- `0` means observed zero, not unknown.
- Do not infer downstream events from upstream counts.
- If attribution is uncertain, keep the known source/medium and write `attribution uncertain` in notes.

---

# INTER-AGENT DEPENDENCIES

## TECHNICAL GO REQUIRED FOR

- final screenshots showing the Recovery plan/session experience;
- diagnostic-result capture if the designated demo/test path requires runtime approval;
- programme selection, exam-date, plan, session, Modalità scuola and Verifica captures;
- paid traffic that lands on the Recovery sales page;
- claims about runtime capability not already explicitly cleared;
- any marketing asset that visually shows final runtime-dependent states.

Marketing does **not** modify React/runtime code to clear these items.

## COMMERCE GO REQUIRED FOR

- purchase-led campaigns;
- €39 checkout promotion;
- paid Meta activation under the accepted plan;
- Google purchase-led ad groups/price assets going live;
- A4 **post-GO** carousel export/publication containing `€39 · pagamento unico · nessun abbonamento`;
- any CTA that implies the production purchase/entitlement flow is ready.

Marketing does **not** modify Stripe or Supabase to clear these items.

## NO GO REQUIRED FOR

- value-first organic promotion of the free diagnostic;
- group research;
- group-rule checking;
- pre-GO copy-paste organic posts that link only to `/test-recupero-inglese`;
- Google/Meta manual campaign construction **while PAUSED**;
- creative layout setup using placeholders, provided the asset is not called complete/published.

---

# UTM OWNERSHIP BOUNDARY

**Marketing owns:**
- `utm_source` naming convention;
- `utm_medium` naming convention;
- `utm_campaign=recupero_august_2026`;
- `utm_content` naming convention;
- final campaign URLs used in posts/ad build sheets.

**Commerce/runtime agent owns:**
- actual first-party UTM persistence;
- carrying attribution through signup/checkout/purchase where implemented;
- any application/database changes required for persistence.

Marketing must not modify runtime/application code, Stripe or Supabase for UTM persistence.

---

# CURRENT CLAIM BLOCKER

Production Recovery landing still contains:

`due simulazioni quando il tempo lo permette`

Operating consequence:

- direct paid traffic to the sales page = **BLOCKED**;
- AG1/AG2 Google build may exist in Ads Manager but must stay PAUSED;
- no marketing agent React edit;
- Commerce/runtime agents own removal/clearance of the app copy;
- free diagnostic organic traffic remains allowed.

Do not reinterpret this as a minor wording preference. It is an explicit H30 claim gate.

---

# PR #235 SCOPE BOUNDARY

Marketing documentation may remain in PR #235.

Do not add:
- React/application code;
- Stripe code/configuration;
- Supabase migrations/data changes;
- runtime analytics/UTM code;
- checkout modifications.

Do not merge PR #235 from this workstream.

---

# READY-TO-USE INITIAL ROW LABELS

These rows are identifiers only; they do **not** mean anything has been published.

| source | medium | utm_content | initial status |
|---|---|---|---|
| facebook | organic | `ripetizioni_group_01_diagnostic` | `RULES CHECK REQUIRED` |
| facebook | organic | `ripetizioni_group_02_priorities` | `RULES CHECK REQUIRED` |
| facebook | organic | `parent_group_02_structure` | `RULES CHECK REQUIRED` |
| facebook | organic | `ripetizioni_group_03_time_left` | `RULES CHECK REQUIRED` |
| google | cpc | `core_debito_rsa01` | `PAUSED` |
| google | cpc | `esame_rsa01` | `PAUSED` |
| google | cpc | `come_recuperare_rsa01` | `PAUSED` |
| google | cpc | `esercizi_ripasso_rsa01` | `PAUSED` |
| facebook | paid_social | `parent_meta_structure_v1` | `PAUSED` |
| facebook | paid_social | `parent_meta_time_v1` | `PAUSED` |

Change an initial status only after the corresponding human/platform action has actually occurred.
