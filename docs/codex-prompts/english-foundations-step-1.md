# Codex Prompt — English Foundations Step 1

Read these files first:

- `docs/sblocco-product-strategy.md`
- `docs/english-foundations-architecture.md`
- `src/App.jsx`
- `src/components/Navbar.jsx`
- `src/pages/GrammarHub.jsx`
- `src/pages/GrammarA1Hub.jsx`

Task:

Rename and reposition the current Grammar section as **English Foundations** without changing the deeper exercise engine yet.

Scope:

1. Change the navbar label from `Grammar` to `English Foundations`.
2. Keep existing routes working. Do not break:
   - `/grammar`
   - `/grammar/a1`
   - `/grammar/a1/:topicId`
   - `/levels/a1/be-basic-sentences`
   - `/levels/a1/present-simple-normal-verbs`
3. Update page copy on `GrammarHub.jsx` and `GrammarA1Hub.jsx` so the section is no longer framed as a generic grammar archive.
4. Position the section as a CEFR-based learning path that teaches, evaluates, and gives specific feedback.
5. Use the wording **English Foundations** for the section name.
6. Use **A1 English Foundations** for the A1 page.
7. Keep the guided unit path primary.
8. Keep the old checkpoint cards visible, but rename/reframe them as targeted checks or quick checks.
9. Do not remove old checkpoint functionality.
10. Do not create new routes unless strictly necessary.
11. Do not create new exercise components.
12. Do not hardcode new lesson content inside JSX beyond necessary page copy.
13. Run `npm run build`.

Content direction:

The new page copy should communicate this logic:

```text
CEFR level → unit → practice → checkpoint → specific feedback
```

Learner-facing message:

```text
This is not just grammar practice. Each level helps you build usable English: understand the rule, use it in controlled exercises, check your mistakes, and repeat with clearer feedback.
```

A1 page message:

```text
A1 English Foundations helps you create simple sentences, ask and answer basic questions, talk about daily life, and handle simple predictable situations.
```

Avoid technical language like:

```text
diagnostic metadata
error-pattern tags
affected skill
production mode
```

Acceptance criteria:

- Navbar shows `English Foundations`.
- `/grammar` still opens successfully.
- `/grammar/a1` still opens successfully.
- Existing unit links still work.
- Old checkpoint links still work.
- The guided unit section appears before quick checks.
- Copy clearly says units teach active English and quick checks diagnose weak points.
- Build passes.
