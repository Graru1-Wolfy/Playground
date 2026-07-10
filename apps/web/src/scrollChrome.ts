const RETRACT_THRESHOLD = 48;
const SCROLL_DELTA_MIN = 6;

export function bindDefaultsScrollRetract(topStack: HTMLElement): () => void {
  let lastY = window.scrollY;
  let retracted = false;

  const update = (): void => {
    const y = window.scrollY;
    const delta = y - lastY;

    if (y <= RETRACT_THRESHOLD) {
      if (retracted) {
        retracted = false;
        topStack.classList.remove("defaults-retracted");
      }
    } else if (delta > SCROLL_DELTA_MIN && !retracted) {
      retracted = true;
      topStack.classList.add("defaults-retracted");
    } else if (delta < -SCROLL_DELTA_MIN && retracted) {
      retracted = false;
      topStack.classList.remove("defaults-retracted");
    }

    lastY = y;
  };

  let ticking = false;
  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}
