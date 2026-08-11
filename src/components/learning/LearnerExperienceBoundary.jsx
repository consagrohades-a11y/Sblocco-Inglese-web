import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const LEARNER_SURFACES = [
  { key: 'dashboard', match: (path) => path === '/dashboard' },
  { key: 'recovery', match: (path) => path === '/test-recupero-inglese' || path.startsWith('/recupero-debito') },
  { key: 'assignment-detail', match: (path) => /^\/assignments\/[^/]+$/.test(path) },
  { key: 'assignments', match: (path) => path === '/assignments' || path.startsWith('/attivita/') },
  { key: 'exercise', match: (path) => path === '/exercises' },
  { key: 'practice', match: (path) => path === '/practice' },
  { key: 'collection', match: (path) => path === '/collections' },
  { key: 'progress', match: (path) => path === '/progressi' },
  { key: 'trainer', match: (path) => path === '/trainers' || path.startsWith('/trainers/') },
  { key: 'grammar', match: (path) => path === '/grammar' || path.startsWith('/grammar/') },
  { key: 'account', match: (path) => path === '/account' },
];

function learnerSurfaceForPath(pathname) {
  return LEARNER_SURFACES.find((surface) => surface.match(pathname))?.key || '';
}

/**
 * Applies the Sblocco editorial learner design as a route-level invariant.
 *
 * This deliberately does not depend on the user's auth role. Several learner
 * tools (trainers and grammar resources) can be visited publicly, and their
 * visual language should not change after login. Admin routes are never
 * included here and therefore keep their utility-first presentation.
 */
export default function LearnerExperienceBoundary() {
  const location = useLocation();
  const surface = useMemo(() => learnerSurfaceForPath(location.pathname), [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const active = Boolean(surface);

    root.classList.toggle('sblocco-learner-experience', active);
    if (active) root.dataset.learningSurface = surface;
    else delete root.dataset.learningSurface;

    return () => {
      root.classList.remove('sblocco-learner-experience');
      delete root.dataset.learningSurface;
    };
  }, [surface]);

  return null;
}

export { LEARNER_SURFACES, learnerSurfaceForPath };
