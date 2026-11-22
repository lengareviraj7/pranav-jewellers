"use client";

import { useEffect } from "react";

/**
 * KeyboardNavigation
 * Global rapid-entry keyboard automation for Sarafa ERP.
 * When the user types any value into an input or select and presses 'Enter':
 * - Automatically advances focus to the next field in the form or modal dialog.
 * - Prevents accidental early form submission while entering values.
 * - Auto-selects existing text/numbers in the focused field so users can type or accept immediately.
 * - On the final field, advances focus to the primary submit button.
 * - Allows multiline textareas to keep normal Enter newline behavior.
 * - Allows buttons to trigger normal activation on Enter.
 */
export default function KeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process standalone 'Enter' keypresses
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const tagName = target.tagName.toUpperCase();

      // Never intercept multiline textarea - Enter creates newlines
      if (tagName === "TEXTAREA") return;

      // Never intercept buttons or elements acting as buttons - Enter should click them
      if (tagName === "BUTTON" || target.getAttribute("role") === "button") return;

      // Only handle INPUT and SELECT
      if (tagName !== "INPUT" && tagName !== "SELECT") return;

      // For input elements, ignore type="submit", "button", "reset"
      if (tagName === "INPUT") {
        const inputType = (target.getAttribute("type") || "text").toLowerCase();
        if (["submit", "button", "reset"].includes(inputType)) return;
      }

      // Determine the active boundary container:
      // Priority 1: Enclosing <form>
      // Priority 2: Enclosing active modal dialog
      // Priority 3: Enclosing <main> or document.body
      const form = target.closest("form");
      const modal = target.closest(
        "[role='dialog'], .modal-backdrop, .modal-3d-content, div.fixed.inset-0, .fixed.inset-0"
      );
      
      const container: HTMLElement =
        (form as HTMLElement) ||
        (modal as HTMLElement) ||
        (target.closest("main") as HTMLElement) ||
        document.body;

      // Selector for candidate interactive form controls in logical order
      const selector = [
        'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'button[type="submit"]:not([disabled])',
        'button.submit-btn:not([disabled])',
        'button[data-enter-submit]:not([disabled])'
      ].join(", ");

      const allElements = Array.from(container.querySelectorAll<HTMLElement>(selector));

      // Filter to only visible and currently enabled elements
      const focusables = allElements.filter((el) => {
        if (el.hasAttribute("disabled")) return false;
        if (el.getAttribute("aria-hidden") === "true") return false;
        if (el.tabIndex < 0) return false;

        // Visibility checks
        if (el.offsetParent === null && window.getComputedStyle(el).position !== "fixed") {
          return false;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;

        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          return false;
        }

        return true;
      });

      const currentIndex = focusables.indexOf(target);

      if (currentIndex !== -1 && currentIndex < focusables.length - 1) {
        // Prevent default submission / form reload
        e.preventDefault();
        e.stopPropagation();

        const next = focusables[currentIndex + 1];
        next.focus();

        // If next is a text or number input, auto-select its value for swift overwriting or inspection
        if (next instanceof HTMLInputElement) {
          const t = (next.getAttribute("type") || "text").toLowerCase();
          if (["text", "number", "tel", "search", "password", "email"].includes(t)) {
            try {
              next.select();
            } catch (_) {}
          }
        }
      } else if (currentIndex === focusables.length - 1) {
        // We are on the last input field; check if there is an associated submit button
        const submitBtn = container.querySelector<HTMLElement>(
          'button[type="submit"]:not([disabled]), button.submit-btn:not([disabled]), button[data-enter-submit]:not([disabled])'
        );

        if (submitBtn && submitBtn !== target) {
          e.preventDefault();
          e.stopPropagation();
          submitBtn.focus();
        }
      }
    };

    // Attach in capture phase to guarantee interception before form submission listeners
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return null;
}
