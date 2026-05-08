(function () {
  const defaultData = window.SHERIFF_DEFAULT_DATA;
  if (!defaultData) {
    return;
  }

  const STORAGE_KEY = "sheriffOilContent";
  const LANGUAGE_KEY = "sheriffOilLanguage";
  const AUTH_KEY = "sheriffOilAdminUnlocked";
  const SERVER_CONTENT_ENDPOINT = "/api/content";
  const SERVER_PRICE_ENDPOINT = "/api/fuel-prices";
  const ADMIN_ACCOUNT_EMAIL = "RigonDragusha@sheriff.petrol";
  const ADMIN_EMAIL_HASH = "4936375698c50dac31058dbb98013792effbcecf7f11aa060cb3ddbf76f3e74d";
  const ADMIN_PASSWORD_HASH = "996e1990f55742fdac09f1bc60f76b594fc77d1505f9f8dd65879a9e922cc9a5";
  const LOADER_MIN_MS = 1180;
  const loaderStartedAt = performance.now();
  let loaderDone = false;
  const iconMap = {
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 5 3.4 8.2 7 10 3.6-1.8 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16"/><path d="M7 21h11"/><path d="M8 9h9"/><path d="M17 7h2l2 3v7a2 2 0 0 1-2 2h-1"/></svg>',
    droplet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10Z"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21c9 0 14-6 14-16C10 5 5 10 5 19"/><path d="M7 17c2-3 5-5 9-6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>'
  };

  let currentLanguage = loadLanguage();
  let state = loadContent();

  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    renderAll();
    hydrateServerContent();
    bindLanguageSwitcher();
    bindLogin();
    bindDashboard();
    revealAll();
    setTimeout(finishLoading, 500);
  }

  function renderAll() {
    document.documentElement.lang = currentLanguage;
    renderLogos();
    applyTranslations();
    initializeIcons();
    setLanguageButtons();
    setAccountInfo();
    setPanelState();
    fillForm();
    renderPreview();
    removeVisiblePlaceholders();
  }

  function renderLogos() {
    document.querySelectorAll("[data-logo]").forEach((image) => {
      image.src = image.closest(".site-loader") ? "../assets/sheriff-loader-wordmark-clean.png" : "../assets/sherif-logo.png";
      image.alt = defaultData.brand.name + " logo";
    });
  }

  function applyTranslations() {
    const dictionary = defaultData.translations[currentLanguage] || defaultData.translations.en;

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
  }

  function setLanguageButtons() {
    document.querySelectorAll(".language-button").forEach((button) => {
      const isActive = button.dataset.language === currentLanguage;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
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

  function bindLogin() {
    const form = document.querySelector("[data-admin-login]");
    if (!form) {
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = form.elements.email.value.trim().toLowerCase();
      const password = form.elements.password.value.trim();
      const isValid = await isValidLogin(email, password);

      if (!isValid) {
        setStatus(document.querySelector("[data-login-status]"), translate("admin.loginError"), "error");
        return;
      }

      try {
        window.sessionStorage.setItem(AUTH_KEY, "true");
      } catch (error) {
        return;
      }
      setStatus(document.querySelector("[data-login-status]"), "", "");
      setPanelState();
      form.reset();
    });
  }

  function bindDashboard() {
    const form = document.querySelector("[data-price-form]");
    if (!form) {
      return;
    }

    form.addEventListener("input", () => {
      state = collectState();
      renderPreview();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      state = collectState();
      const saved = await saveState(state);
      renderPreview();
      setStatus(
        document.querySelector("[data-admin-status]"),
        saved ? translate("admin.saved") : translate("admin.saveError"),
        saved ? "success" : "error",
        true
      );
    });

    const cancelButton = document.querySelector("[data-cancel-edit]");
    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        state = loadContent();
        fillForm();
        renderPreview();
        setStatus(document.querySelector("[data-admin-status]"), translate("admin.cancelled"), "success", true);
      });
    }

    const resetButton = document.querySelector("[data-reset-prices]");
    if (resetButton) {
      resetButton.addEventListener("click", async () => {
        safeStorageRemove(STORAGE_KEY);
        state = {
          fuelPrices: clone(defaultData.fuelPrices)
        };
        await saveState(state);
        fillForm();
        renderPreview();
        setStatus(document.querySelector("[data-admin-status]"), translate("admin.reset"), "success", true);
      });
    }

    const logoutButton = document.querySelector("[data-admin-logout]");
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        try {
          window.sessionStorage.removeItem(AUTH_KEY);
        } catch (error) {
          return;
        }
        setPanelState();
      });
    }
  }

  function setPanelState() {
    const unlocked = isUnlocked();
    const login = document.querySelector("[data-login-view]");
    const panel = document.querySelector("[data-dashboard-view]");

    if (login) {
      login.hidden = unlocked;
    }
    if (panel) {
      panel.hidden = !unlocked;
    }
  }

  function fillForm() {
    setInput("diesel-price", state.fuelPrices.diesel);
    setInput("petrol-price", state.fuelPrices.petrol);
    setInput("adblue-price", state.fuelPrices.adblue);
    setInput("last-updated", state.fuelPrices.lastUpdated);
  }

  function collectState() {
    const next = {
      fuelPrices: {
        currency: defaultData.fuelPrices.currency,
        diesel: normalizePrice(getInput("diesel-price")),
        petrol: normalizePrice(getInput("petrol-price")),
        adblue: normalizePrice(getInput("adblue-price")),
        lastUpdated: getInput("last-updated") || defaultData.fuelPrices.lastUpdated
      }
    };
    return next;
  }

  function saveState(value) {
    const existing = readStorage(STORAGE_KEY) || {};
    existing.fuelPrices = value.fuelPrices;
    safeStorageSet(STORAGE_KEY, JSON.stringify(existing));
    return saveServerState(value);
  }

  async function hydrateServerContent() {
    const serverContent = await fetchServerContent();
    if (!serverContent || !serverContent.fuelPrices) {
      return;
    }

    state = {
      fuelPrices: sanitizeFuelPrices(serverContent.fuelPrices, defaultData.fuelPrices)
    };
    fillForm();
    renderPreview();
  }

  async function fetchServerContent() {
    try {
      const response = await fetch(SERVER_CONTENT_ENDPOINT, {
        cache: "no-store",
        credentials: "same-origin",
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

  async function saveServerState(value) {
    try {
      const response = await fetch(SERVER_PRICE_ENDPOINT, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Admin-Email-Hash": ADMIN_EMAIL_HASH,
          "X-Admin-Password-Hash": ADMIN_PASSWORD_HASH
        },
        body: JSON.stringify({
          fuelPrices: value.fuelPrices
        })
      });

      if (!response.ok) {
        return false;
      }

      const saved = await response.json();
      if (saved && saved.fuelPrices) {
        state = {
          fuelPrices: sanitizeFuelPrices(saved.fuelPrices, defaultData.fuelPrices)
        };
        fillForm();
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function renderPreview() {
    const preview = document.querySelector("[data-admin-preview]");
    if (!preview) {
      return;
    }

    const fuel = state.fuelPrices;
    const petrolLabel = currentLanguage === "sq" ? "Benzinë" : currentLanguage === "sr" ? "Benzin" : "Petrol";
    preview.innerHTML =
      '<div class="admin-price-preview-grid">' +
        previewCard("Diesel", fuel.currency + fuel.diesel, "fuel", true) +
        previewCard(petrolLabel, fuel.currency + fuel.petrol, "droplet", false) +
        previewCard("AdBlue", fuel.currency + fuel.adblue, "leaf", false) +
      "</div>" +
      previewRow(translate("common.lastUpdated"), formatDate(fuel.lastUpdated));
    setLastUpdatedInfo();
  }

  function previewCard(label, value, icon, featured) {
    return (
      '<article class="admin-price-preview-card' + (featured ? " is-featured" : "") + '">' +
        '<span>' + iconMarkup(icon) + "</span>" +
        "<small>" + escapeHtml(label) + "</small>" +
        "<strong>" + escapeHtml(value) + "</strong>" +
      "</article>"
    );
  }

  function previewRow(label, value) {
    return '<div class="admin-preview-row"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + "</strong></div>";
  }

  function loadContent() {
    const saved = readStorage(STORAGE_KEY);
    const base = clone(defaultData);
    if (saved && saved.fuelPrices) {
      base.fuelPrices = deepMerge(base.fuelPrices, sanitizeFuelPrices(saved.fuelPrices, base.fuelPrices));
    }
    return {
      fuelPrices: clone(base.fuelPrices)
    };
  }

  function isUnlocked() {
    try {
      return window.sessionStorage.getItem(AUTH_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  async function isValidLogin(email, password) {
    const emailHash = await sha256(email);
    const passwordHash = await sha256(password);
    return emailHash === ADMIN_EMAIL_HASH && passwordHash === ADMIN_PASSWORD_HASH;
  }

  async function sha256(value) {
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
      return "";
    }

    const data = new TextEncoder().encode(value);
    const buffer = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function setAccountInfo() {
    document.querySelectorAll("[data-admin-account]").forEach((element) => {
      element.textContent = ADMIN_ACCOUNT_EMAIL;
    });
  }

  function setLastUpdatedInfo() {
    document.querySelectorAll("[data-admin-last-updated]").forEach((element) => {
      element.textContent = formatDate(state.fuelPrices.lastUpdated);
    });
  }

  function initializeIcons() {
    document.querySelectorAll("[data-icon]").forEach((element) => {
      element.innerHTML = iconMarkup(element.dataset.icon);
    });
  }

  function iconMarkup(name) {
    return iconMap[name] || iconMap.check;
  }

  function setInput(id, value) {
    const input = document.getElementById(id);
    if (input) {
      input.value = value;
    }
  }

  function getInput(id) {
    const input = document.getElementById(id);
    return input ? input.value.trim() : "";
  }

  function normalizePrice(value) {
    const number = Number(value);
    if (Number.isNaN(number) || number < 0) {
      return "0.00";
    }
    return number.toFixed(2);
  }

  function setStatus(target, message, tone, animate) {
    if (!target) {
      return;
    }
    target.textContent = message;
    target.className = "form-status";
    if (tone) {
      target.classList.add("is-" + tone);
    }
    if (animate) {
      target.classList.add("is-animated");
      window.setTimeout(() => target.classList.remove("is-animated"), 950);
    }
  }

  function translate(path) {
    const value = getValue(defaultData.translations[currentLanguage] || defaultData.translations.en, path);
    const fallback = getValue(defaultData.translations.en, path);
    return isPlaceholderValue(value) ? (fallback || "") : (value || fallback || "");
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

  function safeStorageRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      return false;
    }
    return true;
  }

  function loadLanguage() {
    const stored = safeStorageGet(LANGUAGE_KEY);
    return normalizeLanguage(stored);
  }

  function normalizeLanguage(value) {
    return ["sq", "en", "sr"].includes(value) ? value : "sq";
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

  function sanitizeFuelPrices(saved, fallback) {
    const clean = {};
    ["diesel", "petrol", "adblue"].forEach((key) => {
      clean[key] = isValidPrice(saved[key]) ? saved[key] : fallback[key];
    });
    clean.currency = isPlaceholderValue(saved.currency) ? fallback.currency : saved.currency || fallback.currency;
    clean.lastUpdated = isValidDate(saved.lastUpdated) ? saved.lastUpdated : fallback.lastUpdated;
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

  function removeVisiblePlaceholders() {
    document.querySelectorAll("h1, h2, h3, h4, p, a, button, span, strong, small, label, li").forEach((element) => {
      const text = (element.textContent || "").trim();
      if (/^#{1,6}$/.test(text)) {
        element.textContent = "";
        element.hidden = true;
      }
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function revealAll() {
    document.querySelectorAll(".reveal").forEach((element) => {
      element.classList.add("in-view");
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
})();
