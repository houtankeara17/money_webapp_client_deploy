import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(", ");

function getFocusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => {
      // visible & not aria-hidden
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.closest("[aria-hidden='true']")) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      // offsetParent null for fixed elements is ok; check size
      const rect = el.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0 || el === document.activeElement;
    }
  );
}

/**
 * Trap keyboard focus inside a container while `active` is true.
 *
 * @param {boolean} active
 * @param {object} [options]
 * @param {React.RefObject} [options.initialFocusRef] - element to focus on activate
 * @param {React.RefObject} [options.returnFocusRef] - element to restore focus on deactivate
 * @param {boolean} [options.restoreFocus=true]
 */
export default function useFocusTrap(active, options = {}) {
  const {
    initialFocusRef,
    returnFocusRef,
    restoreFocus = true,
  } = options;

  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current =
      returnFocusRef?.current || document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Initial focus
    const focusInitial = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus?.({ preventScroll: true });
        return;
      }
      const items = getFocusable(container);
      if (items.length) {
        items[0].focus({ preventScroll: true });
      } else {
        // Make container focusable so Esc/Tab still work
        if (!container.hasAttribute("tabindex")) {
          container.setAttribute("tabindex", "-1");
        }
        container.focus({ preventScroll: true });
      }
    };

    const raf = requestAnimationFrame(focusInitial);

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;

      const items = getFocusable(container);
      if (items.length === 0) {
        e.preventDefault();
        container.focus?.({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      const inside = container.contains(activeEl);

      if (e.shiftKey) {
        // Shift+Tab: from first (or outside) → last
        if (!inside || activeEl === first) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else {
        // Tab: from last (or outside) → first
        if (!inside || activeEl === last) {
          e.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    // Capture so we run before other handlers
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);

      if (restoreFocus && previouslyFocused.current) {
        const el = previouslyFocused.current;
        // Defer so React can unmount the modal first
        requestAnimationFrame(() => {
          try {
            el.focus?.({ preventScroll: true });
          } catch (_) {
            /* element may be gone */
          }
        });
      }
    };
  }, [active, initialFocusRef, returnFocusRef, restoreFocus]);

  return containerRef;
}

export { getFocusable, FOCUSABLE_SELECTOR };
