import { createExperience, initNavigation, initDialog } from './ui.js';
import { initVideos } from './media.js';
import { initMotion } from './motion.js';
import { initCinematic } from './cinematic.js';
import { initWork } from './work.js';
import { initMaker } from './maker.js';
import { initOffers } from './offers.js';
import { initPointerTrail } from './pointer-trail.js';

// The editorial state survives motion breakpoint and preference changes.
const experience = createExperience();
const motion = initMotion(experience);
initNavigation(() => motion.lenis);
initDialog(() => motion.lenis);
initVideos();
initCinematic();
initWork(() => motion.lenis);
initMaker(() => motion.lenis);
initOffers();
initPointerTrail();

const root = document.documentElement;
const updateVisibility = () => root.classList.toggle('page-hidden', document.hidden);
document.addEventListener('visibilitychange', updateVisibility);
updateVisibility();
