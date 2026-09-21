# Learner avatar assets

Place the 36 production avatar PNG files in this folder with these exact filenames:

`avatar-01.png` through `avatar-36.png`.

Production format:

- 512 × 512 px
- square 1:1 canvas
- PNG
- transparent background around the illustrated character
- consistent head-and-shoulders scale across the full set

Transparency is required for the learner-selected profile background color to remain visible behind the character.

SVG is not required for this avatar system. The application stores only stable appearance keys (for example `avatar-07` and `dusty-blue`) and derives the PNG path and background color from the canonical avatar registry in `src/lib/learnerAvatars.js`.
