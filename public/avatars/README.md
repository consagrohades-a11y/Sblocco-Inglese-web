# Learner avatar assets

Place the 36 production avatar PNG files in this folder with these exact filenames:

`avatar-01.png` through `avatar-36.png`.

Recommended production format:

- 512 × 512 px
- square 1:1 canvas
- PNG
- transparent background
- consistent head-and-shoulders scale across the full set

SVG is not required for this avatar system. The application stores only the stable key (for example `avatar-07`) and derives the public PNG path from the canonical avatar registry in `src/lib/learnerAvatars.js`.
