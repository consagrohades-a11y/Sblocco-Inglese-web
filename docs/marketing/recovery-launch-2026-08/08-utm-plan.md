# Recupero Debito Inglese — UTM & Launch Measurement Plan

## 1. One campaign name across launch channels

Use:

`recupero_august_2026`

Do not create separate campaign names for every group or creative. Channel, audience and creative differences belong in source / medium / content.

---

## 2. Naming standard

### `utm_source`

Use the traffic platform:

- `facebook`
- `instagram`
- `google`

### `utm_medium`

Use:

- `organic` — unpaid group/social traffic
- `cpc` — Google Search paid traffic
- `paid_social` — Meta paid traffic

### `utm_campaign`

Always:

`recupero_august_2026`

### `utm_content`

Use a non-personal internal identifier for the specific placement/message/creative.

Format:

`<audience_or_adgroup>_<placement_or_group>_<angle_or_creative>`

Examples:

- `parent_group_01_programme_first`
- `parent_group_02_structure`
- `student_group_01_priorities`
- `ripetizioni_group_02_diagnostic`
- `core_debito_rsa01`
- `esame_rsa01`
- `parent_meta_structure_v1`
- `parent_meta_time_v1`

### `utm_term`

Use for Google Search keyword/query tracking where available:

`utm_term={keyword}`

Do not use `utm_term` for Facebook groups.

---

## 3. Hygiene rules

- lowercase only;
- use underscores, not spaces;
- keep names short enough to scan in reports;
- do not rename the same creative halfway through the test;
- do not put student names, parent names, emails, phone numbers, school names tied to a person or comment/thread member IDs into UTMs;
- a Facebook group should receive an **internal generic ID**, not a member's identity;
- keep one mapping sheet that translates `parent_group_01` to the group/page name for internal use.

The UTM itself should remain non-personal.

---

## 4. Channel templates

### Facebook parent group

`https://sbloccoinglese.com/test-recupero-inglese?utm_source=facebook&utm_medium=organic&utm_campaign=recupero_august_2026&utm_content=parent_group_01_programme_first`

### Facebook student/ripetizioni group

`https://sbloccoinglese.com/test-recupero-inglese?utm_source=facebook&utm_medium=organic&utm_campaign=recupero_august_2026&utm_content=student_group_01_priorities`

### Instagram organic

`https://sbloccoinglese.com/test-recupero-inglese?utm_source=instagram&utm_medium=organic&utm_campaign=recupero_august_2026&utm_content=student_static_test_v1`

### Google Search → diagnostic

`https://sbloccoinglese.com/test-recupero-inglese?utm_source=google&utm_medium=cpc&utm_campaign=recupero_august_2026&utm_content=core_debito_rsa01&utm_term={keyword}`

### Google Search → product landing after GO

`https://sbloccoinglese.com/percorsi/recupero-debito?utm_source=google&utm_medium=cpc&utm_campaign=recupero_august_2026&utm_content=core_debito_rsa01&utm_term={keyword}`

### Meta parent paid

`https://sbloccoinglese.com/test-recupero-inglese?utm_source=facebook&utm_medium=paid_social&utm_campaign=recupero_august_2026&utm_content=parent_meta_structure_v1`

For Instagram placement within the same paid Meta campaign, use `utm_source=instagram` if dynamic URL parameters are available; otherwise preserve the campaign/content identifier and use the platform report to separate placement.

---

## 5. Facebook group identifier convention

Never put a member's name or personal detail in the URL.

Use this pattern:

`<audience>_group_<nn>_<angle>`

### Audience values

- `parent`
- `student`
- `ripetizioni`

### Angle values

- `programme_first`
- `structure`
- `priorities`
- `diagnostic`
- `time_left`

Examples:

- `parent_group_01_structure`
- `parent_group_02_programme_first`
- `student_group_01_time_left`
- `ripetizioni_group_01_diagnostic`

Internal group log:

| Internal ID | Group name | Audience | Promo rule | Posted | Post URL | Notes |
|---|---|---|---|---|---|---|
| parent_group_01 | internal only | parent | rules checked |  |  |  |
| student_group_01 | internal only | student | rules checked |  |  |  |

---

## 6. Funnel event vocabulary

Use one vocabulary in the launch sheet and analytics discussion even if the underlying app/event names differ.

1. `landing_visit`
2. `diagnostic_started`
3. `diagnostic_completed`
4. `product_cta_clicked`
5. `signup_completed`
6. `checkout_started`
7. `purchase_completed`
8. `onboarding_completed`
9. `first_session_started`
10. `first_session_completed`

Do not mix “lead”, “conversion” and “activation” loosely. The funnel stage should always be identifiable.

---

## 7. Core calculations

For each source/content combination:

**Diagnostic start rate**  
`diagnostic_started / landing_visit`

**Diagnostic completion rate**  
`diagnostic_completed / diagnostic_started`

**Product click-through from result**  
`product_cta_clicked / diagnostic_completed`

**Signup continuation**  
`signup_completed / product_cta_clicked`

**Checkout-start rate**  
`checkout_started / signup_completed`

**Purchase rate from checkout**  
`purchase_completed / checkout_started`

**Onboarding activation**  
`onboarding_completed / purchase_completed`

**First-session activation**  
`first_session_started / onboarding_completed`

**First-session completion**  
`first_session_completed / first_session_started`

**CAC**  
`paid media spend / purchase_completed`

Do not compare these numbers to invented “industry standards” during the first 48 hours. Compare channels and messages against the baseline created by the first real traffic.

---

## 8. H30 launch sheet

Maintain one row per `utm_content`.

| Date/time | Source | Medium | Content | Spend | Visits | Diag starts | Diag complete | Product clicks | Signups | Checkout starts | Purchases | Onboarding complete | Session start | Session complete | Notes |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

For organic group posts, `Spend = €0`.

---

## 9. Attribution discipline for the validation

The first 48 hours are too small for elaborate attribution modelling.

Use a simple working rule:

- UTMs identify the acquisition source/creative;
- platform reports identify paid delivery;
- product funnel events identify what happened after the visit;
- purchase is the commercial validation event;
- onboarding/session events determine whether the purchase is producing actual product use.

If attribution is incomplete, do not manufacture precision. Record the known source and mark uncertain cases as unattributed.

---

## 10. Link QA before publishing

For every public URL:

- [ ] opens the intended page;
- [ ] UTM parameters remain in the address on initial load;
- [ ] no personally identifying information appears in the URL;
- [ ] mobile load works;
- [ ] diagnostic start button works;
- [ ] post-diagnostic destination is known;
- [ ] purchase links are not promoted aggressively before Commerce GO.
