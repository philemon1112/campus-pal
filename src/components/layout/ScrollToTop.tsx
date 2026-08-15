import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Browsers preserve scroll position across history entries, which is right
// for back/forward but wrong for a fresh navigation in an SPA: clicking a
// tour halfway down Explore used to drop you halfway down the tour page.
//
// Resets to the top on PUSH/REPLACE only — 'POP' (back/forward) is left
// alone so returning to a list keeps your place, which is what users expect.
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search, navigationType]);

  return null;
}
