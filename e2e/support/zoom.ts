import { type Page } from "@playwright/test";

/**
 * WCAG 2.2 AA reflow / zoom helpers.
 *
 * 400% zoom at a 1280 CSS-px-wide equivalent viewport is equivalent to
 * laying the page out at 320 CSS px (1280 / 4). All thresholds in this
 * helper are computed from that base.
 *
 * WCAG 1.4.10 Reflow: content at 320 CSS px must not require 2D page
 * scrolling. WCAG 1.4.4 Resize Text: text can be resized up to 200% with
 * no loss of content. WCAG 1.4.12 Text Spacing: line-height 1.5,
 * letter-spacing 0.12em, word-spacing 0.16em, paragraph spacing 2em.
 */

export const BASE_WIDTH_PX = 1280;

export const ZOOM_LEVELS = [
  { label: "200%", zoom: 2, viewport: { width: BASE_WIDTH_PX / 2, height: 720 } },
  { label: "400%", zoom: 4, viewport: { width: BASE_WIDTH_PX / 4, height: 360 } },
] as const;

/** Injected via addStyleTag — WCAG 1.4.12 minimum spacing overrides. */
export const TEXT_SPACING_CSS = `
  *,
  *::before,
  *::after {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p {
    margin-bottom: 2em !important;
  }
`;

/** Document-level horizontal overflow in CSS pixels (0 = no overflow). */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
}

/**
 * Elements whose content is clipped by their own box, excluding the page
 * scroller (which we assert on separately) and any element opted out via
 * `data-allow-overflow` (used by intentional horizontal scroll regions
 * such as wide tables).
 */
export async function clippedElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const allowOverflow = (el: Element): boolean => {
      let cur: Element | null = el;
      while (cur !== null) {
        if (cur.hasAttribute("data-allow-overflow")) return true;
        if (cur.hasAttribute("data-allow-scroll")) return true;
        cur = cur.parentElement;
      }
      return false;
    };

    const offenders: string[] = [];
    const root = document.documentElement;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      if (el === root || el === document.body) continue;
      if (allowOverflow(el)) continue;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;

      const dx = el.scrollWidth - el.clientWidth;
      const dy = el.scrollHeight - el.clientHeight;
      // ignore sub-pixel rounding
      if (dx > 2 || dy > 2) {
        const id = el.id ? `#${el.id}` : "";
        const cls = typeof el.className === "string" && el.className.length > 0
          ? `.${el.className.split(/\s+/).filter(Boolean).join(".")}`
          : "";
        offenders.push(`${el.tagName.toLowerCase()}${id}${cls}`);
      }
    }
    return offenders;
  });
}

/**
 * Walk every element that is exposed to keyboard navigation and verify at
 * least one of the following is true:
 *  - it is visible and has a non-zero bounding box
 *  - it has an accessible name (aria-label / aria-labelledby / text)
 *
 * Used to catch "pointer-only" controls at zoom levels where CSS hides
 * labels or truncates buttons.
 */
export async function unreachableInteractiveElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const SEL =
      'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="tab"], [role="menuitem"]';
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(SEL))) {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        offenders.push(`${el.tagName.toLowerCase()} (zero-size)`);
        continue;
      }
      const label =
        el.getAttribute("aria-label") ??
        el.getAttribute("aria-labelledby") ??
        (el.textContent ?? "").trim();
      if (label.length === 0 && !el.hasAttribute("title")) {
        offenders.push(`${el.tagName.toLowerCase()} (unlabelled)`);
      }
    }
    return offenders;
  });
}