/**
 * ChangeProof Rx — Frontend Architecture & Interactions
 * Manages modal dialogs, accessible navigation, scroll reveals, and pilot request storage.
 */

document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================
     1. DIALOG & ACCESSIBLE MODAL CONTROLS
     ========================================== */
  const pilotDialog = document.getElementById("pilot-dialog");
  const dialogCloseBtn = document.getElementById("dialog-close-btn");
  const openPilotButtons = document.querySelectorAll(".open-pilot-btn");
  const pilotStatus = document.getElementById("pilot-status");
  const pilotForm = document.getElementById("pilot-form");
  let lastActiveElement = null;

  // Open dialog from any "Request a Pilot" CTA
  openPilotButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      lastActiveElement = document.activeElement;
      
      // Clear stale status text when reopening dialog
      if (pilotStatus) {
        pilotStatus.textContent = "";
        pilotStatus.className = "pilot-status";
      }

      if (typeof pilotDialog.showModal === "function") {
        pilotDialog.showModal();
      } else {
        // Fallback for environments lacking native showModal
        pilotDialog.setAttribute("open", "true");
      }

      // Shift keyboard focus to first form input
      const fullNameInput = document.getElementById("fullName");
      if (fullNameInput) {
        fullNameInput.focus();
      }
    });
  });

  // Close dialog helper
  function closeDialog() {
    if (pilotDialog.open) {
      if (typeof pilotDialog.close === "function") {
        pilotDialog.close();
      } else {
        pilotDialog.removeAttribute("open");
      }
    }
  }

  if (dialogCloseBtn) {
    dialogCloseBtn.addEventListener("click", closeDialog);
  }

  // Restore focus to originating CTA button when closed
  pilotDialog.addEventListener("close", () => {
    if (lastActiveElement && typeof lastActiveElement.focus === "function") {
      lastActiveElement.focus();
    }
  });

  // Close when clicking on dialog backdrop
  pilotDialog.addEventListener("click", (event) => {
    if (event.target === pilotDialog) {
      closeDialog();
    }
  });

  /* ==========================================
     2. PILOT FORM SUBMISSION & STORAGE
     ========================================== */
  const pilotStorageKey = "changeproofRxPilotRequests";

  // Visual status class observer for success/error styling
  if (pilotStatus) {
    const observer = new MutationObserver(() => {
      const text = pilotStatus.textContent.trim();
      if (!text) {
        pilotStatus.className = "pilot-status";
      } else if (text.includes("saved in this browser")) {
        pilotStatus.className = "pilot-status status-success";
      } else {
        pilotStatus.className = "pilot-status status-error";
      }
    });
    observer.observe(pilotStatus, { childList: true, characterData: true, subtree: true });
  }

  // Exact prescribed form submission handler
  pilotForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(pilotForm);
    const request = {};

    for (const field of [
      "fullName",
      "phoneNumber",
      "emailAddress",
      "organisationName"
    ]) {
      const value = String(formData.get(field) ?? "").trim();

      if (!value) {
        const input = pilotForm.elements.namedItem(field);
        pilotStatus.textContent = "Please complete the highlighted field.";
        if (input && typeof input.focus === "function") {
          input.focus();
        }
        return;
      }

      request[field] = value;
    }

    request.submissionDateTime = new Date().toISOString();

    try {
      const previous = localStorage.getItem(pilotStorageKey);
      const requests = previous === null ? [] : JSON.parse(previous);

      if (!Array.isArray(requests)) {
        throw new Error("Unexpected pilot request storage format");
      }

      requests.push(request);
      localStorage.setItem(pilotStorageKey, JSON.stringify(requests));
    } catch {
      pilotStatus.textContent =
        "Your request could not be saved in this browser. Your entries are still in the form.";
      return;
    }

    pilotForm.reset();
    pilotStatus.textContent =
      "Pilot request saved in this browser on this device.";
  });

  /* ==========================================
     3. RESPONSIVE MOBILE NAVIGATION
     ========================================== */
  const navToggle = document.getElementById("nav-toggle");
  const primaryNav = document.getElementById("primary-nav");
  const navLinks = document.querySelectorAll(".primary-nav .nav-link");

  function closeMobileMenu() {
    if (navToggle && primaryNav) {
      navToggle.setAttribute("aria-expanded", "false");
      primaryNav.classList.remove("is-open");
      document.body.classList.remove("nav-menu-open");
    }
  }

  function toggleMobileMenu() {
    if (navToggle && primaryNav) {
      const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isExpanded));
      primaryNav.classList.toggle("is-open", !isExpanded);
      document.body.classList.toggle("nav-menu-open", !isExpanded);
    }
  }

  if (navToggle) {
    navToggle.addEventListener("click", toggleMobileMenu);
  }

  // Close mobile navigation when a section link is selected
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMobileMenu();
    });
  });

  // Close mobile menu on Escape key press
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && primaryNav && primaryNav.classList.contains("is-open")) {
      closeMobileMenu();
      if (navToggle) {
        navToggle.focus();
      }
    }
  });

  /* ==========================================
     4. ACTIVE NAVIGATION LINK ON SCROLL
     ========================================== */
  const sections = document.querySelectorAll("main section[id], footer[id]");
  const navMap = new Map();
  navLinks.forEach((link) => {
    const targetId = link.getAttribute("href")?.replace("#", "");
    if (targetId) {
      navMap.set(targetId, link);
    }
  });

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const currentId = entry.target.id;
            navLinks.forEach((link) => link.classList.remove("active"));
            const activeLink = navMap.get(currentId);
            if (activeLink) {
              activeLink.classList.add("active");
            }
          }
        });
      },
      {
        rootMargin: "-25% 0px -65% 0px",
        threshold: 0
      }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* ==========================================
     5. PURPOSEFUL SCROLL ENTRANCE REVEALS
     ========================================== */
  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    // Keep immediately visible if reduced motion requested or no observer
    revealElements.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -60px 0px",
        threshold: 0.1
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  }
});
