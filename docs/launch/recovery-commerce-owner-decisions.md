# OWNER DECISIONS — Recupero Debito launch

This file records the merchant/business decisions confirmed for the launch branch. Engineering must not invent unresolved legal or fiscal facts.

## RESOLVED FOR LAUNCH

- **Access duration** — €39 one-time purchase grants **90 days of access from first successful fulfillment**. No subscription and no automatic renewal. The commerce migration enforces `expires_at`; webhook retries for the same purchase must not extend the window.
- **Launch refund policy** — **full refund when requested within 14 days from conclusion of the contract**, without reducing any mandatory consumer rights. Refund/recesso detail remains subject to final professional legal review for the product's exact classification.
- **Immediate access** — buyer positively requests that access start immediately after payment, without waiting for the withdrawal period to expire, and confirms they have read the recesso/refund information. The implementation does not assert an automatic loss of statutory withdrawal rights in every case.
- **Minor / guardian contracting model** — the contracting purchaser must be **18+**. If the learner is under 18, the purchaser must be the learner's **parent or legal guardian**. Checkout records a separate positive confirmation.
- **Support/privacy email target** — approved target addresses are `assistenza@sbloccoinglese.com` and `privacy@sbloccoinglese.com`. **Do not publish them until the mailboxes/aliases are actually activated and tested.** Until then, the current operational contact remains `consagrohades@gmail.com`.

## STILL REQUIRES OWNER / PROFESSIONAL COMPLETION BEFORE LIVE SALE

1. **Legal seller identity and geographic address disclosure** — the actual contracting seller must be completed in the legal pages. Personal privacy is a hard constraint: do not casually publish a residential address or expose the seller identity in marketing surfaces. Resolve a lawful disclosure setup before live sale.
2. **Fiscal status and fiscal-document process** — current facts supplied by the owner: Sblocco Inglese presently sells no other product; Recupero Debito is the only paid offer; checkout will be available for a maximum of 20 days; there is no subscription or continuing paid catalogue at present. The owner currently has no Partita IVA. The intended treatment is a genuinely temporary/non-habitual commercial initiative, but the legal tax classification and the exact receipt/declaration/document process must be confirmed with a qualified Italian tax professional. There is no engineering assumption that “under 30 days” is automatically occasional.

## IMPLEMENTATION BOUNDARY

- Do not add a fake Partita IVA, fiscal code, seller name, address, or inactive email alias.
- Do not describe the activity to customers as “occasionale” unless a qualified professional specifically instructs that wording.
- Do not enable another paid Sblocco Inglese product or extend Recovery sales beyond the stated temporary window without reopening the fiscal-status analysis.
- Before any production gate, validate the complete branch head after all policy, checkout, entitlement and regression-test changes are present together.
