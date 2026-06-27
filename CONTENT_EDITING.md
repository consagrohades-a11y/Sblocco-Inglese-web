# Sblocco Inglese copy editing map

Use this when you want to change text without searching the whole project.

## Main site copy

- `src/config/site.js`
  - brand name, CTA labels, price, booking links
  - Rhema/about copy
  - reviews and case-study snippets

- `src/data/content.js`
  - navigation labels
  - homepage/process/booking copy
  - course offers on `/percorsi`
  - FAQ questions and answers
  - clickable section details

## Trainer copy and cards

- `src/data/trainerConfig.js`
  - trainer names, descriptions, categories, card totals, and trainer navigation

- `src/data/srsCards.js`
  - Business English / interview / email / call cards

- `src/data/generalExpressionCards.js`
  - General expression trainer cards

- `src/data/hospitalityExpressionCards.js`
  - 150 hospitality expressions for hotels, restaurants, guest service, complaints, front desk, and safety

- `src/data/wordTrainerCards.js`
  - Word trainer cards

## Page-specific copy

If the text is unique to one page layout, check:

- `src/pages/Home.jsx`
- `src/pages/Percorsi.jsx`
- `src/pages/Simulation.jsx`
- `src/pages/Reviews.jsx`
- `src/pages/TrainersLanding.jsx`

## After editing

Run these before publishing:

```bash
npm.cmd run validate:srs
npm.cmd run build
```

Use `validate:srs` after changing any trainer card file. Use `build` after any site copy or layout change.
