(function () {
  const defaultData = window.SHERIFF_DEFAULT_DATA;
  if (!defaultData) {
    return;
  }

  const STORAGE_KEY = "sheriffOilContent";
  const LANGUAGE_KEY = "sheriffOilLanguage";
  const SERVER_CONTENT_ENDPOINT = "/api/content";
  const CONTACT_MESSAGE_ENDPOINT = "/api/contact-messages";
  const LOADER_MIN_MS = 1180;
  const pageId = document.body.dataset.page || "home";
  const loaderStartedAt = performance.now();
  let loaderDone = false;

  let content = loadContent();
  let currentLanguage = loadLanguage();

  const iconMap = {
    fuel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16"/><path d="M7 21h11"/><path d="M8 9h9"/><path d="M17 7h2l2 3v7a2 2 0 0 1-2 2h-1"/></svg>',
    droplet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10Z"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21c9 0 14-6 14-16C10 5 5 10 5 19"/><path d="M7 17c2-3 5-5 9-6"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 13H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    coffee: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z"/><path d="M16 9h2a2 2 0 0 1 0 4h-2"/><path d="M7 21h9"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 5 3.4 8.2 7 10 3.6-1.8 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>',
    zap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 5 14h6l-1 8 9-13h-6l0-7Z"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="8" r="3"/><path d="M21 21v-2a4 4 0 0 0-3-3.7"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6 19.7 19.7 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.5 1.8L7.9 9.5a15 15 0 0 0 6.6 6.6l1.2-1.2a2 2 0 0 1 1.8-.5l2.8.5a2 2 0 0 1 1.7 2Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>'
  };

  document.addEventListener("DOMContentLoaded", initialize);
  window.addEventListener("load", finishLoading);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      content = loadContent();
      renderAll();
    }
  });

  function initialize() {
    renderAll();
    hydrateServerContent();
    bindNavigation();
    bindLanguageSwitcher();
    bindContactForm();
    bindPageTransitions();
    bindParallax();
    revealOnScroll();
    initializeStaticIcons();
    setTimeout(finishLoading, 900);
  }

  async function hydrateServerContent() {
    const serverContent = await fetchServerContent();
    if (!serverContent) {
      return;
    }

    content = applyServerContent(loadContent(), serverContent);
    renderAll();
  }

  function renderAll() {
    setLanguageState();
    setSeo();
    renderLogos();
    renderNavigation();
    applyTranslations();
    renderServices();
    renderAboutCards();
    renderPriceCards();
    renderHeroPriceCards();
    renderStickyPriceBar();
    renderStats();
    renderFeatureLists();
    renderContactDetails();
    renderMobileActionBar();
    renderMap();
    renderFooter();
    renderImageBlocks();
    initializeStaticIcons();
    removeVisiblePlaceholders();
    refreshRevealNodes();
  }

  function setLanguageState() {
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll(".language-button").forEach((button) => {
      const isActive = button.dataset.language === currentLanguage;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setSeo() {
    const seo = content.seo && content.seo[pageId];
    if (!seo) {
      return;
    }

    const title = localize(seo.title);
    const description = localize(seo.description);
    if (title) {
      document.title = title;
    }

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta && description) {
      descriptionMeta.setAttribute("content", description);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && title) {
      ogTitle.setAttribute("content", title);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && description) {
      ogDescription.setAttribute("content", description);
    }
  }

  function renderLogos() {
    document.querySelectorAll("[data-logo]").forEach((image) => {
      image.src = image.closest(".site-loader") ? content.brand.loaderLogo || content.brand.logo : content.brand.logo;
      image.alt = content.brand.name + " logo";
    });
  }

  function renderNavigation() {
    document.querySelectorAll("[data-nav-links]").forEach((target) => {
      target.innerHTML = content.pages.map((page) => {
        const active = page.id === pageId ? " is-active" : "";
        const current = page.id === pageId ? ' aria-current="page"' : "";
        return '<a class="nav-link page-link' + active + '" href="' + page.href + '" data-page="' + page.id + '"' + current + ">" + escapeHtml(localize(page.label)) + "</a>";
      }).join("");
      target.setAttribute("aria-label", translate("common.navLabel"));
    });
  }

  function applyTranslations() {
    const dictionary = content.translations[currentLanguage] || content.translations.en;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = getValue(dictionary, element.dataset.i18n);
      if (typeof value === "string") {
        element.textContent = value;
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const value = getValue(dictionary, element.dataset.i18nPlaceholder);
      if (typeof value === "string") {
        element.setAttribute("placeholder", value);
      }
    });

    document.querySelectorAll("[data-i18n-label]").forEach((element) => {
      const value = getValue(dictionary, element.dataset.i18nLabel);
      if (typeof value === "string") {
        element.setAttribute("aria-label", value);
      }
    });

    document.querySelectorAll(".language-switcher").forEach((element) => {
      element.setAttribute("aria-label", translate("common.language"));
    });

    const navToggle = document.querySelector(".nav-toggle");
    if (navToggle) {
      const isOpen = document.body.classList.contains("menu-open");
      navToggle.setAttribute("aria-label", translate(isOpen ? "common.closeNavigation" : "common.openNavigation"));
    }
  }

  function renderServices() {
    document.querySelectorAll("[data-render-services]").forEach((target) => {
      const limit = Number(target.dataset.limit || content.services.length);
      target.innerHTML = content.services.slice(0, limit).map((service, index) => (
        '<article class="service-card service-card-' + escapeHtml(service.id) + ' reveal">' +
          '<span class="service-card-number">' + String(index + 1).padStart(2, "0") + "</span>" +
          '<span class="icon-badge">' + iconMarkup(service.icon) + "</span>" +
          "<h3>" + escapeHtml(localize(service.title)) + "</h3>" +
          "<p>" + escapeHtml(localize(service.description)) + "</p>" +
        "</article>"
      )).join("");
    });
  }

  function renderAboutCards() {
    document.querySelectorAll("[data-render-about-cards]").forEach((target) => {
      target.innerHTML = content.aboutCards.map((card) => (
        '<article class="feature-card reveal">' +
          '<span class="icon-badge">' + iconMarkup(card.icon) + "</span>" +
          "<h3>" + escapeHtml(localize(card.title)) + "</h3>" +
          "<p>" + escapeHtml(localize(card.description)) + "</p>" +
        "</article>"
      )).join("");
    });
  }

  function renderPriceCards() {
    const fuelItems = getFuelItems();
    const lastUpdated = formatDate(content.fuelPrices.lastUpdated);
    const perLitre = translate("common.perLitre");
    const updatedLabel = translate("common.lastUpdated");

    document.querySelectorAll("[data-render-prices]").forEach((target) => {
      target.innerHTML = fuelItems.map((fuel) => {
        const service = content.services.find((item) => item.id === fuel.serviceId);
        const title = service ? localize(service.title) : fuel.key;
        const description = service ? localize(service.description) : "";
        const value = content.fuelPrices.currency + content.fuelPrices[fuel.key];
        const featuredClass = fuel.key === "diesel" ? " price-card-featured" : "";
        return (
          '<article class="price-card price-card-' + escapeHtml(fuel.key) + featuredClass + ' reveal">' +
            '<div class="price-card-head">' +
              '<span class="icon-badge icon-badge-light">' + iconMarkup(fuel.icon) + "</span>" +
              '<span class="price-date">' + escapeHtml(updatedLabel) + ": " + escapeHtml(lastUpdated) + "</span>" +
            "</div>" +
            "<h3>" + escapeHtml(title) + "</h3>" +
            "<p>" + escapeHtml(description) + "</p>" +
            '<strong class="price-value">' + escapeHtml(value) + "</strong>" +
            '<span class="price-unit">' + escapeHtml(perLitre) + "</span>" +
          "</article>"
        );
      }).join("");
    });

    document.querySelectorAll("[data-price-updated]").forEach((target) => {
      target.textContent = lastUpdated;
    });
  }

  function renderHeroPriceCards() {
    const fuelItems = getFuelItems();
    const lastUpdated = formatDate(content.fuelPrices.lastUpdated);
    const perLitre = translate("common.perLitre");

    document.querySelectorAll("[data-render-hero-prices]").forEach((target) => {
      target.innerHTML = fuelItems.map((fuel) => {
        const service = content.services.find((item) => item.id === fuel.serviceId);
        const title = service ? localize(service.title) : fuel.key;
        const value = content.fuelPrices.currency + content.fuelPrices[fuel.key];
        const featuredClass = fuel.key === "diesel" ? " hero-price-card-featured" : "";
        return (
          '<article class="hero-price-card' + featuredClass + '">' +
            '<div>' +
              '<span class="icon-badge icon-badge-light">' + iconMarkup(fuel.icon) + "</span>" +
              "<h3>" + escapeHtml(title) + "</h3>" +
            "</div>" +
            '<div class="hero-price-value">' +
              "<strong>" + escapeHtml(value) + "</strong>" +
              "<span>" + escapeHtml(perLitre) + "</span>" +
            "</div>" +
          "</article>"
        );
      }).join("") +
      '<p class="hero-price-date">' + escapeHtml(translate("common.lastUpdated")) + ": " + escapeHtml(lastUpdated) + "</p>";
    });
  }

  function renderStickyPriceBar() {
    const perLitre = translate("common.perLitre");
    document.querySelectorAll("[data-render-sticky-prices]").forEach((target) => {
      target.innerHTML = getFuelItems().map((fuel) => {
        const service = content.services.find((item) => item.id === fuel.serviceId);
        const title = service ? localize(service.title) : fuel.key;
        const value = content.fuelPrices.currency + content.fuelPrices[fuel.key];
        const featuredClass = fuel.key === "diesel" ? " fuel-strip-card-featured" : "";
        return (
          '<article class="fuel-strip-card' + featuredClass + '" aria-label="' + escapeHtml(title + " " + value + " " + perLitre) + '">' +
            '<span class="fuel-strip-icon">' + iconMarkup(fuel.icon) + "</span>" +
            '<span class="fuel-strip-name">' + escapeHtml(title) + "</span>" +
            '<strong>' + escapeHtml(value) + "</strong>" +
            '<small>' + escapeHtml(perLitre) + "</small>" +
          "</article>"
        );
      }).join("");
    });
  }

  function renderStats() {
    document.querySelectorAll("[data-render-stats]").forEach((target) => {
      target.innerHTML = content.stats.map((stat) => {
        const value = stat.textValue ? escapeHtml(localize(stat.textValue)) : '<span class="stat-number" data-count="' + stat.value + '">0</span><span>' + escapeHtml(stat.suffix || "") + "</span>";
        return (
          '<article class="stat-card reveal">' +
            '<strong class="stat-value">' + value + "</strong>" +
            "<span>" + escapeHtml(localize(stat.label)) + "</span>" +
            "<p>" + escapeHtml(localize(stat.text)) + "</p>" +
          "</article>"
        );
      }).join("");
    });
    prepareCounters();
  }

  function renderFeatureLists() {
    document.querySelectorAll("[data-render-list]").forEach((target) => {
      const key = target.dataset.renderList;
      const items = content[key] || [];
      target.innerHTML = items.map((item) => (
        '<li><span class="list-icon">' + iconMarkup("check") + "</span><span>" + escapeHtml(localize(item)) + "</span></li>"
      )).join("");
    });
  }

  function renderContactDetails() {
    const contact = content.contact;
    const phoneHref = "tel:" + contact.phone.replace(/\s+/g, "");
    const emailHref = "mailto:" + contact.email;

    document.querySelectorAll("[data-contact]").forEach((target) => {
      const key = target.dataset.contact;
      const value = key === "hours" ? localize(contact.hours) : contact[key];
      if (target.tagName === "A") {
        target.href = key === "phone" ? phoneHref : key === "email" ? emailHref : target.href;
      }

      if (target.closest(".site-footer")) {
        const label = translate("common." + key);
        target.classList.add("footer-contact-item");
        target.innerHTML = "<small>" + escapeHtml(label) + "</small><span>" + escapeHtml(value) + "</span>";
      } else {
        target.textContent = value;
      }
    });

    document.querySelectorAll("[data-directions]").forEach((link) => {
      link.href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(contact.mapQuery);
    });

    document.querySelectorAll("[data-call]").forEach((link) => {
      link.href = phoneHref;
    });
  }

  function renderMobileActionBar() {
    let actionBar = document.querySelector("[data-mobile-action-bar]");
    if (!actionBar) {
      actionBar = document.createElement("nav");
      actionBar.className = "mobile-action-bar";
      actionBar.setAttribute("data-mobile-action-bar", "");
      document.body.appendChild(actionBar);
    }
    actionBar.setAttribute("aria-label", translate("common.quickActions"));

    const phoneHref = "tel:" + content.contact.phone.replace(/\s+/g, "");
    const directionsHref = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(content.contact.mapQuery);
    actionBar.innerHTML =
      '<a href="' + phoneHref + '">' + iconMarkup("phone") + '<span>' + escapeHtml(translate("buttons.callNow")) + "</span></a>" +
      '<a href="' + directionsHref + '" target="_blank" rel="noreferrer">' + iconMarkup("pin") + '<span>' + escapeHtml(translate("buttons.getDirections")) + "</span></a>";
  }

  function renderMap() {
    document.querySelectorAll("[data-map-frame]").forEach((frame) => {
      frame.src = "https://www.google.com/maps?q=" + encodeURIComponent(content.contact.mapQuery) + "&output=embed";
      frame.title = content.brand.name + " map";
    });
  }

  function renderFooter() {
    document.querySelectorAll("[data-footer-pages]").forEach((target) => {
      target.innerHTML = content.pages.map((page) => (
        '<a class="page-link" href="' + page.href + '">' + escapeHtml(localize(page.label)) + "</a>"
      )).join("");
    });

    document.querySelectorAll("[data-footer-services]").forEach((target) => {
      target.innerHTML = content.services.slice(0, 6).map((service) => (
        '<a class="page-link" href="services.html">' + escapeHtml(localize(service.title)) + "</a>"
      )).join("");
    });

    document.querySelectorAll("[data-current-year]").forEach((target) => {
      target.textContent = String(new Date().getFullYear());
    });
  }

  function renderImageBlocks() {
    document.querySelectorAll("[data-bg-image]").forEach((target) => {
      const key = target.dataset.bgImage;
      if (content.images[key]) {
        target.style.backgroundImage = "linear-gradient(180deg, rgba(8, 8, 10, 0.18), rgba(8, 8, 10, 0.36)), url('" + content.images[key] + "')";
      }
    });

    document.querySelectorAll("[data-image-key]").forEach((image) => {
      const key = image.dataset.imageKey;
      if (content.images[key]) {
        image.src = content.images[key];
      }
      if (content.imageAlts && content.imageAlts[key]) {
        image.alt = localize(content.imageAlts[key]);
      }
    });
  }

  function removeVisiblePlaceholders() {
    document.querySelectorAll("h1, h2, h3, h4, p, a, button, span, strong, small, label, li").forEach((element) => {
      const text = (element.textContent || "").trim();
      if (/^#{1,6}$/.test(text)) {
        element.textContent = "";
        element.hidden = true;
      }
    });
  }

  function bindNavigation() {
    const toggle = document.querySelector(".nav-toggle");
    const panel = document.querySelector(".nav-panel");
    if (!toggle || !panel) {
      return;
    }

    toggle.addEventListener("click", () => {
      const isOpen = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", translate(isOpen ? "common.closeNavigation" : "common.openNavigation"));
      document.body.classList.toggle("menu-open", isOpen);
    });

    document.addEventListener("click", (event) => {
      if (!panel.classList.contains("is-open")) {
        return;
      }
      const clickedLink = event.target.closest(".nav-link");
      const clickedOutside = !event.target.closest(".site-header");
      if (clickedLink || clickedOutside) {
        closeMenu(toggle, panel);
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu(toggle, panel);
      }
    });
  }

  function closeMenu(toggle, panel) {
    panel.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", translate("common.openNavigation"));
    document.body.classList.remove("menu-open");
  }

  function bindLanguageSwitcher() {
    document.querySelectorAll(".language-button").forEach((button) => {
      button.addEventListener("click", () => {
        currentLanguage = normalizeLanguage(button.dataset.language);
        safeStorageSet(LANGUAGE_KEY, currentLanguage);
        renderAll();
      });
    });
  }

  function bindContactForm() {
    const form = document.querySelector("[data-contact-form]");
    if (!form) {
      return;
    }

    const status = form.querySelector("[data-form-status]");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fullName = form.elements.fullName.value.trim();
      const phone = form.elements.phone ? form.elements.phone.value.trim() : "";
      const email = form.elements.email.value.trim();
      const message = form.elements.message.value.trim();

      if (!fullName || !email || !message || !isValidEmail(email)) {
        setStatus(status, translate("form.error"), "error");
        return;
      }

      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
      }

      const saved = await saveContactMessage({
        fullName,
        phone,
        email,
        message,
        page: pageId
      });

      if (submitButton) {
        submitButton.disabled = false;
      }

      if (!saved) {
        setStatus(status, translate("form.saveError"), "error");
        return;
      }

      setStatus(status, translate("form.success"), "success");
      form.reset();
    });
  }

  async function saveContactMessage(payload) {
    try {
      const response = await fetch(CONTACT_MESSAGE_ENDPOINT, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  function bindPageTransitions() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:") || link.target === "_blank") {
        return;
      }

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }

      event.preventDefault();
      document.body.classList.add("is-leaving");
      setTimeout(() => {
        window.location.href = url.href;
      }, 150);
    });
  }

  function bindParallax() {
    const heroMedia = document.querySelector(".hero-media");
    if (!heroMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let ticking = false;
    const update = () => {
      const y = Math.min(window.scrollY * 0.08, 42);
      heroMedia.style.transform = "translate3d(0, " + y + "px, 0) scale(1.04)";
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  function revealOnScroll() {
    const elements = Array.from(document.querySelectorAll(".reveal"));
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("in-view"));
      window.__sheriffRevealInitialized = true;
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });

    elements.forEach((element) => observer.observe(element));
    window.__sheriffRevealObserver = observer;
    window.__sheriffRevealInitialized = true;
  }

  function refreshRevealNodes() {
    const observer = window.__sheriffRevealObserver;
    if (!observer) {
      if (window.__sheriffRevealInitialized) {
        document.querySelectorAll(".reveal").forEach((element) => element.classList.add("in-view"));
      }
      return;
    }
    document.querySelectorAll(".reveal").forEach((element) => {
      if (element.classList.contains("in-view")) {
        return;
      }
      if (observer) {
        observer.observe(element);
      } else {
        element.classList.add("in-view");
      }
    });
  }

  function prepareCounters() {
    const counters = Array.from(document.querySelectorAll(".stat-number"));
    if (!counters.length) {
      return;
    }

    const animate = (node) => {
      if (node.dataset.done === "true") {
        return;
      }
      node.dataset.done = "true";
      const end = Number(node.dataset.count || 0);
      const startTime = performance.now();
      const duration = 900;
      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = String(Math.round(end * eased));
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    };

    if (!("IntersectionObserver" in window)) {
      counters.forEach(animate);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach((counter) => observer.observe(counter));
  }

  function initializeStaticIcons() {
    document.querySelectorAll("[data-icon]").forEach((target) => {
      target.innerHTML = iconMarkup(target.dataset.icon);
    });
  }

  function finishLoading() {
    if (loaderDone) {
      return;
    }

    const elapsed = performance.now() - loaderStartedAt;
    if (elapsed < LOADER_MIN_MS) {
      setTimeout(finishLoading, LOADER_MIN_MS - elapsed);
      return;
    }

    loaderDone = true;
    document.body.classList.add("is-loaded");
    window.setTimeout(() => {
      const loader = document.querySelector(".site-loader");
      if (loader) {
        loader.hidden = true;
      }
    }, 220);
  }

  function setStatus(target, message, tone) {
    if (!target) {
      return;
    }
    target.textContent = message;
    target.className = "form-status";
    if (tone) {
      target.classList.add("is-" + tone);
    }
  }

  function translate(path) {
    const dictionary = content.translations[currentLanguage] || content.translations.en;
    const value = getValue(dictionary, path);
    const fallback = getValue(defaultData.translations[currentLanguage] || defaultData.translations.en, path);
    const englishFallback = getValue(defaultData.translations.en, path);
    return isPlaceholderValue(value) ? (fallback || englishFallback || "") : (value || fallback || englishFallback || "");
  }

  function localize(value) {
    if (value && typeof value === "object") {
      return [value[currentLanguage], value.en, value.sq, value.sr]
        .find((item) => item && !isPlaceholderValue(item)) || "";
    }
    return isPlaceholderValue(value) ? "" : value || "";
  }

  function iconMarkup(name) {
    return iconMap[name] || iconMap.check;
  }

  function getFuelItems() {
    return [
      { key: "diesel", serviceId: "diesel", icon: "fuel" },
      { key: "petrol", serviceId: "petrol", icon: "droplet" },
      { key: "adblue", serviceId: "adblue", icon: "leaf" }
    ];
  }

  function formatDate(value) {
    const date = new Date(value + "T12:00:00");
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const localeMap = {
      en: "en-GB",
      sq: "sq-AL",
      sr: "sr-Latn-RS"
    };
    return new Intl.DateTimeFormat(localeMap[currentLanguage] || "sq-AL", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function loadLanguage() {
    const stored = safeStorageGet(LANGUAGE_KEY);
    return normalizeLanguage(stored);
  }

  function normalizeLanguage(value) {
    return ["sq", "en", "sr"].includes(value) ? value : "sq";
  }

  function loadContent() {
    const saved = readStorage(STORAGE_KEY);
    const base = clone(defaultData);
    if (!saved) {
      return base;
    }

    if (saved.fuelPrices) {
      base.fuelPrices = deepMerge(base.fuelPrices, sanitizeFuelPrices(saved.fuelPrices, base.fuelPrices));
    }
    if (saved.contact && !hasMojibake(saved.contact.address || "")) {
      base.contact = deepMerge(base.contact, sanitizeContact(saved.contact, base.contact));
    }
    if (saved.images) {
      base.images = deepMerge(base.images, saved.images);
    }
    return sanitizeContent(base, defaultData);
  }

  async function fetchServerContent() {
    try {
      const response = await fetch(SERVER_CONTENT_ENDPOINT, {
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch (error) {
      return null;
    }
  }

  function applyServerContent(base, serverContent) {
    const next = clone(base);
    if (serverContent && serverContent.fuelPrices) {
      next.fuelPrices = deepMerge(next.fuelPrices, sanitizeFuelPrices(serverContent.fuelPrices, next.fuelPrices));
    }
    if (serverContent && serverContent.contact && !hasMojibake(serverContent.contact.address || "")) {
      next.contact = deepMerge(next.contact, sanitizeContact(serverContent.contact, next.contact));
    }
    return sanitizeContent(next, defaultData);
  }

  function readStorage(key) {
    const raw = safeStorageGet(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      return false;
    }
    return true;
  }

  function deepMerge(base, override) {
    if (Array.isArray(base) || Array.isArray(override)) {
      return override !== undefined ? override : base;
    }
    if (isObject(base) && isObject(override)) {
      const merged = { ...base };
      Object.keys(override).forEach((key) => {
        merged[key] = key in base ? deepMerge(base[key], override[key]) : override[key];
      });
      return merged;
    }
    return override !== undefined && !isPlaceholderValue(override) ? override : base;
  }

  function getValue(source, path) {
    return path.split(".").reduce((value, key) => {
      if (value && Object.prototype.hasOwnProperty.call(value, key)) {
        return value[key];
      }
      return undefined;
    }, source);
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sanitizeContent(value, fallback) {
    if (Array.isArray(value)) {
      return value.map((item, index) => sanitizeContent(item, fallback && fallback[index]));
    }

    if (isObject(value)) {
      const sanitized = {};
      Object.keys(value).forEach((key) => {
        sanitized[key] = sanitizeContent(value[key], fallback && fallback[key]);
      });
      return sanitized;
    }

    return isPlaceholderValue(value) ? fallback || "" : value;
  }

  function sanitizeFuelPrices(saved, fallback) {
    const clean = {};
    ["diesel", "petrol", "adblue"].forEach((key) => {
      clean[key] = isValidPrice(saved[key]) ? saved[key] : fallback[key];
    });
    clean.currency = isPlaceholderValue(saved.currency) ? fallback.currency : saved.currency || fallback.currency;
    clean.lastUpdated = isValidDate(saved.lastUpdated) ? saved.lastUpdated : fallback.lastUpdated;
    return clean;
  }

  function sanitizeContact(saved, fallback) {
    const clean = {};
    ["address", "phone", "email", "mapQuery"].forEach((key) => {
      clean[key] = isPlaceholderValue(saved[key]) ? fallback[key] : saved[key] || fallback[key];
    });
    if (saved.hours && isObject(saved.hours)) {
      clean.hours = deepMerge(fallback.hours, saved.hours);
    }
    return clean;
  }

  function isValidPrice(value) {
    return typeof value === "string" && /^\d+([.,]\d{1,2})?$/.test(value.trim());
  }

  function isValidDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function isPlaceholderValue(value) {
    return typeof value === "string" && /^(?:#+|[-–—]+|n\/a|todo|tbd|placeholder|coming soon)$/i.test(value.trim());
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function hasMojibake(value) {
    return /[\u00c3\u00c2\u00c5\u00c4]/.test(value);
  }
})();
