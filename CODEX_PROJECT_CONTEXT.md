# Codex Project Context — Sblocco Inglese

Use this file as the compact project memory before making changes. It is intentionally written for Codex/AI coding agents to avoid rediscovering product strategy, current architecture, and business rules from scratch.

## 1. What this project is

**Sblocco Inglese** is a practical English-learning platform/site for Italian adults who understand some English but freeze when they need to speak under pressure.

The core promise is not generic English lessons. The positioning is:

> Help Italians speak with more clarity and control in real situations: job interviews, work calls, clients, relocation, Erasmus/internships, and professional conversations.

The user/founder is **Rhema**, a bilingual Italian/English teacher. The tone should feel structured, practical, business-aware, and human, not school-like or childish.

## 2. Target audience

Primary target:

- Italian speakers around A2, B1, or B2.
- They usually understand more English than they can actively produce.
- They translate mentally from Italian.
- They feel slower, less natural, or less credible in English than in Italian.
- They need English for work, interviews, calls, clients, relocation, Erasmus, internships, or practical life abroad.

Not ideal for:

- Absolute beginners who cannot build simple sentences.
- People looking for generic conversation only.
- People expecting guaranteed job/interview outcomes.

## 3. Product ecosystem

The current product logic is a three-part ecosystem:

1. **Corsi** — the main product and long-term learning path.
2. **Simulazione** — the low-friction entry point / diagnosis offer.
3. **Trainer** — SRS-based practice that supports the courses and keeps phrases active between lessons.

Do not make the site feel like many disconnected offers. The message is: **one structured ecosystem, each part with a clear role**.

## 4. Current offers

### Primary entry offer

**Simulazione Inglese per Colloqui e Lavoro — €39**

- 30 minutes online.
- Practical simulation.
- Live correction.
- Written feedback.
- 5–10 improved phrases to reuse.
- Level estimate and next-step recommendation.
- Used as a diagnostic before choosing a course.

### Course offers

Current course cards in the site:

1. **Speaking Under Pressure** — €179 beta
   - Main course.
   - 6 weeks.
   - Small group.
   - Practical speaking for interviews, calls, professional answers, and common mistakes.
   - Trainer Suite included while enrolled.

2. **Business English Flow** — €219 beta
   - Work/call/email/client communication.
   - For people already using English professionally and wanting to sound clearer, less translated, and more present.

3. **Urgent Interview Prep** — €249–299
   - Private preparation for a real interview or urgent deadline.
   - 6 private sessions, interview answers, simulations, written feedback, CV review in English.

4. **Team English for Work** — from €800
   - Custom team training for small businesses, hospitality, customer service, beauty/wellness, events, and services with international clients.

## 5. Funnel and booking flow

The current booking flow is frontend-only and should stay simple unless explicitly changed.

Flow:

1. User completes an internal-looking quiz on `/prenota`.
2. Quiz submits to a connected Google Form.
3. User sees an outcome/eligibility direction on-site.
4. User chooses a slot through Calendly embed/link.
5. User pays with PayPal hosted button.
6. Payment confirms the session.
7. Rhema runs the simulation online and sends written feedback.

Important constraints:

- The site does **not** collect card/payment data.
- PayPal handles payment.
- Calendly handles scheduling.
- Google Forms handles quiz submission.
- There is no backend/database/auth system currently.

Main configurable funnel files:

- `src/config/site.js` — links, Google Form fields, Calendly URL, PayPal hosted button, primary offer, CTA labels, About/Founder text, reviews, case studies.
- `src/data/content.js` — longer website content, nav items, FAQ, process steps, course cards, simulation includes.

## 6. Current routes/pages

Routes are defined in `src/App.jsx`.

Current public routes:

- `/` — Home
- `/simulazione-39` — Simulation offer page
- `/percorsi` — Courses/offers page
- `/recensioni` — Founder/reviews page
- `/casi-reali` and `/case-studies` — Case studies
- `/contatti` — Contact + FAQ
- `/faq` — redirects to `/contatti#faq`
- `/trainers` — Trainer landing page
- `/trainers/business-expression` — Business Expression Trainer
- `/trainers/general-expression` — General Expression Trainer
- `/trainers/word-trainer` — Word Trainer
- `/trainer` — redirects to `/trainers/business-expression`
- `/prenota` — Booking/quiz/payment flow
- `/privacy`, `/privacy-policy`, `/cookie-policy`, `/termini-e-condizioni` — Legal pages
- `*` — NotFound

Shared layout includes:

- `Navbar`
- `Footer`
- `StickyMobileCTA`
- `BackToTopButton`
- `ScrollManager` for hash scrolling and route scroll reset

## 7. Tech stack

Current stack:

- React 18
- Vite 5
- React Router DOM 6
- Tailwind CSS 3
- lucide-react icons
- Plain JavaScript/JSX, not TypeScript
- Frontend-only app

Scripts in `package.json`:

```bash
npm run dev
npm run build
npm run preview
npm run validate:srs
```

## 8. Visual identity and tone

Design direction:

- Modern educational SaaS / practical coaching platform.
- Warm, credible, slightly premium.
- Not cartoonish, not childish, not generic school branding.
- Avoid cliché language-learning imagery when possible: flags, grammar-book visuals, generic graduation-cap identity, mascots, or literal padlocks.
- Use structured visual systems, cards, process flows, diagnosis framing, trainer/product ecosystem framing.

Tailwind brand colors:

- `ink`: `#18221f`
- `paper`: `#fbf7f1`
- `linen`: `#f3eadf`
- `clay`: `#c76545`
- `coral`: `#e86f51`
- `moss`: `#0e7c66`
- `mint`: `#dcefe8`
- `sea`: `#174e63`
- `butter`: `#fff2c7`
- `blush`: `#f8e4df`

Copy tone:

- Practical, clear, direct.
- Italian-first site copy.
- Speak to the pain: “capisco ma mi blocco”, “traduco mentalmente”, “sotto pressione sembro meno sicuro/a”.
- Do not overpromise.
- Do not guarantee jobs, interviews, outcomes, or fluency.
- Use “beta” pricing language when relevant.

## 9. Navigation labels

Current nav labels:

- Home
- Corsi
- Simulazione
- Trainer
- Founder e recensioni
- Contatti
- Prenota

Keep **Founder e recensioni** unless the user explicitly asks to rename it.

## 10. Trainer system

The Trainer is a client-side SRS product. It is meant to support lessons/courses and eventually become a paid/included feature.

Current trainers in `src/data/trainerConfig.js`:

1. **Business Expression Trainer**
   - Route: `/trainers/business-expression`
   - 250 expression cards
   - Storage key: `sblocco_srs_progress_v1`
   - Categories: Interview English, Business English, Meetings & Calls, Emails & Follow-ups, Customer-facing English, Small Talk & Natural Reactions

2. **General Expression Trainer**
   - Route: `/trainers/general-expression`
   - 250 expression cards
   - Storage key: `sblocco_general_expression_progress_v1`
   - Categories: everyday conversation, opinions, clarification, social situations, travel, feelings, storytelling, plans/goals

3. **Word Trainer**
   - Route: `/trainers/word-trainer`
   - 500 word cards
   - Storage key: `sblocco_word_trainer_progress_v1`
   - Categories: work/career, business/money, meetings/calls, travel/hospitality, everyday life, feelings/opinions/personality, phrasal verbs, connectors, collocations, false friends/Italian interference

SRS behavior:

- Progress is saved in `localStorage`.
- No account system currently.
- Cards can be filtered by multiple categories and multiple levels.
- Session limit is 10 cards.
- Daily new-card limit is 10.
- After session completion, user can add 5 more cards.
- Ratings: Again, Hard, Good, Easy.
- If rating is `again`, the card is reinserted after 3 more cards instead of appearing immediately.
- Keyboard shortcuts: Space reveals answer; 1/2/3/4 rate Again/Hard/Good/Easy.
- Dark/light trainer theme is saved locally.

Key trainer files:

- `src/components/SrsTrainer.jsx`
- `src/components/SrsCard.jsx`
- `src/components/DeckSelector.jsx`
- `src/components/ReviewStats.jsx`
- `src/components/TrainerLayout.jsx`
- `src/utils/srsAlgorithm.js`
- `src/utils/validateSrsCards.js`
- `scripts/validate-srs-cards.mjs`
- `src/data/srsCards.js`
- `src/data/generalExpressionCards.js`
- `src/data/wordTrainerCards.js`
- `src/data/trainerConfig.js`

## 11. Current content/proof assets

The site currently uses:

- Rhema/founder positioning in `siteConfig.aboutMe`.
- Preply review summaries and image paths in `siteConfig.reviews`.
- Case studies for:
  - Software developer relocation English.
  - Brand Manager / business English.
  - Emirates Cabin Crew interview prep.

When editing proof/case studies:

- Keep them anonymized unless the user explicitly gives permission otherwise.
- Keep disclaimers clear: results vary and are not guaranteed.
- Do not invent fake reviews or fake screenshots.

## 12. Legal/contact constraints

Known project constraints:

- Public assistance email: `consagrohades@gmail.com`.
- WhatsApp is used for support/contact, not as the main technical backend.
- Avoid wording around “partita IVA” unless the user explicitly requests legal/tax copy.
- Avoid “gratis/free” claims unless the user explicitly approves them; platform copy previously had issues with “free/gratis” wording.
- The site should remain reassuring but not make legal, financial, employment, or learning-outcome guarantees.

## 13. Main safe edit points

When making routine copy/product changes, prefer editing these first:

- `src/config/site.js`
  - Brand name, teacher name, links, booking form fields, payment settings, primary offer, CTA labels, About text, reviews, case studies.

- `src/data/content.js`
  - Nav items, trust badges, fit cards, process steps, booking steps, FAQ, course offers, simulation copy.

- `src/data/trainerConfig.js`
  - Trainer names, routes, descriptions, categories, storage keys, card counts.

- `src/data/*Cards.js`
  - Trainer card datasets.

- `src/pages/*`
  - Page-level structure and section ordering.

- `src/components/VisualSystem.jsx` and shared components
  - Reusable layout/card/section components.

Avoid scattering the same business fact across many files. When possible, centralize recurring values in `siteConfig` or content data files.

## 14. Build/deployment notes

The project is deployed through Vercel from GitHub. Pushing to the connected branch should trigger redeploy.

Before committing meaningful changes, run:

```bash
npm run build
```

For trainer data edits, also run:

```bash
npm run validate:srs
```

The project previously had a Vite import/path issue involving `/src/main.jsx`; preserve the current `index.html` + `src/main.jsx` structure unless intentionally changing app entrypoints.

## 15. Codex working rules

When Codex edits this project:

1. Preserve the strategic hierarchy: courses first, simulation as entry/diagnosis, trainer as support.
2. Keep the copy in Italian unless the surrounding page is intentionally English/trainer UI.
3. Keep the site practical and conversion-oriented, not academic.
4. Do not invent unavailable backend features.
5. Do not add fake social proof.
6. Do not make broad guarantees.
7. Prefer small, targeted diffs over redesigning the whole site.
8. Keep mobile responsiveness and sticky CTA behavior in mind.
9. Reuse existing components and brand colors.
10. When changing pricing/offers, update all repeated references consistently.

## 16. One-sentence project memory

Sblocco Inglese is a React/Vite/Tailwind frontend platform for Italian adults who understand English but freeze under pressure, built around practical courses, a €39 diagnostic simulation, and SRS trainers for business expressions, general expressions, and useful vocabulary.
