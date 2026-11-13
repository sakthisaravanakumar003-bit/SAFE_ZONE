(() => {
  "use strict";

  const NAV_ITEMS = [
    ["home", "Home", "home"],
    ["sos", "SOS", "sos"],
    ["location", "Location", "pin"],
    ["contacts", "Contacts", "users"],
    ["history", "History", "history"],
    ["settings", "Settings", "settings"]
  ];
  const DEFAULT_DATA = { profile: null, contacts: [], history: [] };
  const root = document.querySelector("#app");
  const modalRoot = document.querySelector("#modal-root");
  const toastRoot = document.querySelector("#toast-root");
  const state = {
    ...DEFAULT_DATA,
    route: "home",
    location: null,
    locationPermission: "not requested",
    liveSharing: false,
    liveStarting: false,
    watchId: null,
    storageMode: "loading",
    storageProblem: "",
    persistenceBlocked: false,
    sosRequestId: 0,
    sosRequestActive: 0,
    db: null,
    cryptoKey: null,
    pendingAlert: null
  };
  let saveQueue = Promise.resolve();
  let toastTimer;

  const iconPaths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    sos: '<path d="M12 3v5m0 8v5M3 12h5m8 0h5"/><circle cx="12" cy="12" r="8"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8L6.3 12l1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8H14l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.9Z"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    crosshair: '<circle cx="12" cy="12" r="8"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    plus: '<path d="M12 5v14m-7-7h14"/>',
    edit: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/>',
    trash: '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1A19.5 19.5 0 0 1 4.2 12 19.8 19.8 0 0 1 1.1 3.3 2 2 0 0 1 3.1 1h3a2 2 0 0 1 2 1.7l.5 3.1a2 2 0 0 1-.6 1.7L6.7 8.8a16 16 0 0 0 6.5 6.5l1.3-1.3a2 2 0 0 1 1.7-.6l3.1.5a2 2 0 0 1 1.7 2Z"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    share: '<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    alert: '<path d="m10.3 3.9-8.1 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.8-3.1l-8.1-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  };

  function icon(name, extraClass = "") {
    return `<svg class="icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function initials(value) {
    return String(value || "SZ").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  }

  function mapUrl(location) {
    return `https://www.google.com/maps?q=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`;
  }

  function formatDate(value, options = { dateStyle: "medium", timeStyle: "short" }) {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
  }

  function toast(message, kind = "") {
    clearTimeout(toastTimer);
    toastRoot.innerHTML = `<div class="toast ${kind}" role="status">${escapeHtml(message)}</div>`;
    toastTimer = setTimeout(() => { toastRoot.innerHTML = ""; }, 4600);
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("safe-zone-vault", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("vault")) request.result.createObjectStore("vault");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open browser storage."));
      request.onblocked = () => reject(new Error("Browser storage is blocked by another Safe Zone tab."));
    });
  }

  function databaseGet(db, key) {
    return new Promise((resolve, reject) => {
      const request = db.transaction("vault", "readonly").objectStore("vault").get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not read saved data."));
    });
  }

  function databasePut(db, key, value) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("vault", "readwrite");
      transaction.objectStore("vault").put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not save data."));
      transaction.onabort = () => reject(transaction.error || new Error("Saving was interrupted."));
    });
  }

  function databaseClear(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("vault", "readwrite");
      transaction.objectStore("vault").clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not clear saved data."));
      transaction.onabort = () => reject(transaction.error || new Error("Clearing was interrupted."));
    });
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  async function loadData() {
    if (window.indexedDB && window.crypto?.subtle) {
      const db = await openDatabase();
      state.db = db;
      let key = await databaseGet(db, "encryption-key");
      if (!key) {
        key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
        await databasePut(db, "encryption-key", key);
      }
      state.cryptoKey = key;
      state.storageMode = "encrypted";
      const stored = await databaseGet(db, "app-data");
      if (!stored) return;
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(stored.iv) }, key, base64ToBytes(stored.data)
      );
      Object.assign(state, sanitizeData(JSON.parse(new TextDecoder().decode(plaintext))));
      return;
    }

    state.storageMode = "browser";
    const stored = localStorage.getItem("safe-zone-data");
    if (stored) Object.assign(state, sanitizeData(JSON.parse(stored)));
  }

  function sanitizeData(value) {
    return {
      profile: value?.profile && typeof value.profile.name === "string" ? value.profile : null,
      contacts: Array.isArray(value?.contacts) ? value.contacts.filter((item) =>
        item && typeof item.id === "string" && typeof item.name === "string" && typeof item.phone === "string"
      ) : [],
      history: Array.isArray(value?.history) ? value.history.filter((item) =>
        item && typeof item.id === "string" && typeof item.timestamp === "string"
      ).slice(0, 100) : []
    };
  }

  function persist() {
    if (state.persistenceBlocked) return;
    const snapshot = JSON.stringify({ profile: state.profile, contacts: state.contacts, history: state.history.slice(0, 100) });
    saveQueue = saveQueue.then(async () => {
      if (state.storageMode === "encrypted") {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, state.cryptoKey, new TextEncoder().encode(snapshot));
        await databasePut(state.db, "app-data", { iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) });
      } else {
        localStorage.setItem("safe-zone-data", snapshot);
      }
    }).catch((error) => {
      state.persistenceBlocked = true;
      state.storageProblem = error?.message || "Browser storage is unavailable.";
      toast(`Changes are only in memory and may be lost: ${state.storageProblem}`, "error");
      if (state.route === "settings") render();
    });
    return saveQueue;
  }

  function updateHistory(id, status) {
    const item = state.history.find((entry) => entry.id === id);
    if (item) item.status = status;
    persist();
  }

  function navMarkup(className) {
    return `<nav class="${className}" aria-label="Main navigation">${NAV_ITEMS.map(([route, label, symbol]) => {
      const active = state.route === route || (route === "home" && state.route === "home");
      return `<button type="button" class="nav-link ${active ? "active" : ""}" data-nav="${route}" aria-label="${label}">${icon(symbol)}<span>${label}</span></button>`;
    }).join("")}</nav>`;
  }

  function appShell(content) {
    const name = escapeHtml(state.profile?.name || "there");
    const permissionLabel = state.locationPermission === "granted" ? "Location ready" : "Safety tools ready";
    return `<div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark" aria-hidden="true"></span><div class="brand-copy"><strong>SAFE ZONE</strong><span>Personal safety</span></div></div>
        <div class="nav-caption">Workspace</div>${navMarkup("nav-list")}
        <div class="sidebar-bottom"><div class="privacy-mini">${icon("lock")}<span>Your safety data stays on this device. Share only when you choose.</span></div></div>
      </aside>
      <div class="main-area">
        <header class="topbar"><div class="topbar-label">Your personal safety space<strong>Welcome back, ${name}</strong></div>
          <div class="topbar-right">${state.liveSharing ? '<span class="live-pill">Live session</span>' : `<span class="online-pill">${permissionLabel}</span>`}<span class="avatar" aria-label="${name}">${escapeHtml(initials(state.profile?.name))}</span></div>
        </header>
        <main class="content" id="main-content">${content}</main>
      </div>
      ${navMarkup("mobile-nav")}
    </div>`;
  }

  function welcomePage() {
    return `<main class="welcome-screen">
      <section class="welcome-copy">
        <div class="brand"><span class="brand-mark" aria-hidden="true"></span><div class="brand-copy"><strong>SAFE ZONE</strong><span>Personal safety</span></div></div>
        <p class="eyebrow">A little more peace of mind</p>
        <h1>Your safety,<br><span>within reach.</span></h1>
        <p>Keep trusted people close, share your real location when you need to, and prepare an SOS alert on your terms.</p>
        <button class="button button-primary" type="button" data-action="get-started">${icon("arrow")} Get started</button>
        <div class="welcome-foot">${icon("lock")} Private by design. No account or cloud service required.</div>
      </section>
      <section class="welcome-art" aria-label="Safe Zone features">
        <div class="shield-art"><span class="brand-mark" aria-hidden="true"></span></div>
        <div class="feature-float feature-one">${icon("pin")} Real device location</div>
        <div class="feature-float feature-two">${icon("users")} Your trusted circle</div>
        <div class="feature-float feature-three">${icon("shield")} You stay in control</div>
      </section>
    </main>`;
  }

  function setupPage(editing = false) {
    const profile = state.profile || {};
    return `<main class="setup-wrap"><section class="setup-card card">
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><div class="brand-copy"><strong>SAFE ZONE</strong><span>Personal safety</span></div></div>
      <p class="eyebrow">${editing ? "Your profile" : "First, a few details"}</p>
      <h1>${editing ? "Edit your profile" : "Set up your safety profile"}</h1>
      <p class="subtitle">Your details stay on this device and are used only to personalize an alert you choose to share.</p>
      <div class="permission-note">${icon("pin")}<span><strong>Location is never accessed in the background.</strong><br>Safe Zone will ask your browser for location only when you request it. Your browser may show its own permission prompt then.</span></div>
      <form class="form-grid" data-form="profile">
        <div class="field"><label for="profile-name">Your display name</label><input id="profile-name" name="name" autocomplete="name" required maxlength="60" placeholder="e.g. Alex Morgan" value="${escapeHtml(profile.name || "")}"></div>
        <div class="field"><label for="profile-phone">Your phone number</label><input id="profile-phone" name="phone" type="tel" autocomplete="tel" required maxlength="24" placeholder="e.g. +1 555 010 1234" value="${escapeHtml(profile.phone || "")}"><span class="field-hint">Used in your profile only. You choose if an alert is shared.</span></div>
        <div class="form-actions">${editing ? '<button class="button button-quiet" type="button" data-action="cancel-profile">Cancel</button>' : ""}<button class="button button-primary" type="submit">${editing ? "Save changes" : "Continue"} ${icon("arrow")}</button></div>
      </form>
    </section></main>`;
  }

  function locationSummary() {
    if (!state.location) return { title: "Location not checked", detail: "Request location when you need it. Nothing is tracked in the background.", accuracy: "" };
    const checkedAt = formatDate(state.location.timestamp, { timeStyle: "short" });
    return {
      title: "Current location available",
      detail: `${state.location.latitude.toFixed(5)}, ${state.location.longitude.toFixed(5)} · updated ${checkedAt}`,
      accuracy: Number.isFinite(state.location.accuracy) ? `Accuracy ±${Math.round(state.location.accuracy)} m` : "Accuracy unavailable"
    };
  }

  function dashboardPage() {
    const location = locationSummary();
    const recent = state.history.slice(0, 2);
    const selectedCount = state.contacts.filter((contact) => contact.selected).length;
    return `<div class="page-heading"><div><p class="eyebrow">Your safety at a glance</p><h1>You're in your Safe Zone.</h1><p class="subtitle">A quick check-in, ${escapeHtml(state.profile?.name || "")}. Your SOS is ready whenever you need it.</p></div></div>
      ${state.liveSharing ? `<div class="live-banner"><div><span class="live-pill">Live session active</span><p>Your location is being refreshed on this device only. It is not being sent to anyone.</p></div><button class="button button-danger" data-action="stop-live" type="button">Stop session</button></div>` : ""}
      <div class="grid dashboard-grid">
        <section class="card sos-card"><div class="sos-content">
          <button type="button" class="sos-button" data-action="sos" aria-label="Prepare an SOS alert"><span>${icon("sos")}</span><strong>SOS</strong></button>
          <p class="sos-caption"><strong>Need help?</strong><br>Tap to review and prepare an alert. Nothing is sent automatically.</p>
        </div></section>
        <section class="card card-pad"><div class="section-title"><h2>Safety status</h2>${icon("shield")}</div>
          <div class="stack">
            <div class="status-card"><span class="status-icon">${icon("pin")}</span><div class="status-copy"><strong>${state.locationPermission === "denied" ? "Location permission denied" : "Location access"}</strong><span>${state.locationPermission === "granted" ? "Allowed by your browser. Requested only when you ask." : state.locationPermission === "denied" ? "Change this in your browser's site settings." : "Not requested yet. You decide when to allow it."}</span></div></div>
            <div class="status-card"><span class="status-icon">${icon("users")}</span><div class="status-copy"><strong>${state.contacts.length} trusted ${state.contacts.length === 1 ? "contact" : "contacts"}</strong><span>${selectedCount} selected for the SMS fallback. Sharing always needs your action.</span></div><button type="button" class="text-button" data-nav="contacts">Manage</button></div>
          </div>
        </section>
      </div>
      <section class="card card-pad location-card">
        <div class="section-title"><h2>Current location</h2><button class="text-button" type="button" data-nav="location">View location</button></div>
        <div class="location-main"><div class="location-detail"><span class="status-icon">${icon("pin")}</span><div class="location-text"><strong>${location.title}</strong><p>${escapeHtml(location.detail)}${location.accuracy ? `<br>${escapeHtml(location.accuracy)}` : ""}</p></div></div>
          <div class="location-actions"><button class="button" type="button" data-action="refresh-location">${icon("crosshair")} Get location</button>${state.location ? `<a class="button" target="_blank" rel="noopener noreferrer" href="${mapUrl(state.location)}">${icon("arrow")} Open map</a>` : ""}</div>
        </div>
      </section>
      <div class="metric-row">
        <div class="metric"><div class="metric-top">Trusted contacts ${icon("users")}</div><strong>${state.contacts.length}</strong><small>In your safety circle</small></div>
        <div class="metric"><div class="metric-top">Alerts prepared ${icon("history")}</div><strong>${state.history.length}</strong><small>Stored on this device</small></div>
        <div class="metric"><div class="metric-top">Sharing ${icon("lock")}</div><strong>${state.liveSharing ? "On" : "Off"}</strong><small>${state.liveSharing ? "Device-only session" : "You control every share"}</small></div>
      </div>
      <section class="card card-pad" style="margin-top:18px"><div class="section-title"><h2>Recent alert activity</h2><button class="text-button" type="button" data-nav="history">View history</button></div>
        ${recent.length ? recent.map(historyRow).join("") : `<div class="empty-state"><span class="status-icon">${icon("history")}</span><strong>No alerts yet</strong><p>If you prepare an SOS, its time and outcome will be recorded here on this device.</p></div>`}
      </section>`;
  }

  function historyRow(item, includeLink = false) {
    return `<div class="alert-row"><span class="alert-badge">${icon("alert")}</span><div class="row-main"><strong>${escapeHtml(formatDate(item.timestamp))}</strong><span>${escapeHtml(item.details || "SOS alert attempt")}${item.location ? ` · ${escapeHtml(item.location.latitude.toFixed(5))}, ${escapeHtml(item.location.longitude.toFixed(5))}` : ""}</span><span class="history-status">${escapeHtml(item.status)}</span></div>${includeLink && item.location ? `<a class="icon-button" href="${mapUrl(item.location)}" target="_blank" rel="noopener noreferrer" aria-label="Open alert location in Google Maps">${icon("arrow")}</a>` : ""}</div>`;
  }

  function locationPage() {
    const location = locationSummary();
    const coords = state.location ? `Latitude ${state.location.latitude.toFixed(6)}<br>Longitude ${state.location.longitude.toFixed(6)}` : "Request an update to view your real device coordinates.";
    return `<div class="page-heading"><div><p class="eyebrow">On-demand GPS</p><h1>Your location</h1><p class="subtitle">Your device location is requested only when you ask. Safe Zone does not track you in the background.</p></div></div>
      ${state.liveSharing ? `<div class="live-banner"><div><span class="live-pill">Live session active</span><p>Refreshing on this device while this page is open. No one else can see your location.</p></div><button class="button button-danger" type="button" data-action="stop-live">Stop session</button></div>` : ""}
      <div class="grid split-grid">
        <section class="card card-pad"><div class="section-title"><h2>Location status</h2><span class="status-tag">${state.locationPermission === "granted" ? "Permission allowed" : "Permission on request"}</span></div>
          <div class="map-preview"><span class="map-pin">${icon("pin")}</span><span class="map-label">${state.location ? "Map preview is illustrative · open Google Maps for the real map" : "No location preview until you request GPS"}</span></div>
          <div style="height:16px"></div><div class="location-text"><strong>${location.title}</strong><p>${state.location ? `${coords}<br>${escapeHtml(location.accuracy)} · Updated ${escapeHtml(formatDate(state.location.timestamp, { timeStyle: "short" }))}` : escapeHtml(location.detail)}</p></div>
          <div class="divider"></div><div class="location-actions"><button class="button button-primary" type="button" data-action="refresh-location">${icon("crosshair")} Get current location</button>${state.location ? `<a class="button" href="${mapUrl(state.location)}" target="_blank" rel="noopener noreferrer">${icon("arrow")} Open in Google Maps</a>` : ""}</div>
        </section>
        <section class="card card-pad"><div class="section-title"><h2>Optional live session</h2>${icon("crosshair")}</div>
          <p class="subtitle">Keep location updates visible while this app is open. This session is local to your device; it is not a remote share or background tracking.</p>
          <div class="divider"></div>
          ${state.liveSharing ? `<div class="status-card"><span class="status-icon" style="color:var(--green)">${icon("crosshair")}</span><div class="status-copy"><strong>Location session active</strong><span>Updates are visible on this device only. Stop any time.</span></div></div><div style="height:14px"></div><button class="button button-danger" type="button" data-action="stop-live">${icon("close")} Stop location session</button>` : `<button class="button button-primary" type="button" data-action="start-live" ${state.liveStarting ? "disabled" : ""}>${icon("crosshair")} ${state.liveStarting ? "Getting location…" : "Start live session"}</button>`}
          <div style="height:14px"></div><button class="button" type="button" data-action="share-location" ${state.location ? "" : "disabled"}>${icon("share")} Share current location</button>
          <p class="field-hint" style="margin:12px 0 0">Sharing opens your device's share options. You choose the recipient and whether to send. Delivery cannot be verified by Safe Zone.</p>
        </section>
      </div>`;
  }

  function contactForm(contact = null) {
    const selected = contact?.selected !== false;
    return `<form class="form-grid" data-form="contact">
      <input type="hidden" name="id" value="${escapeHtml(contact?.id || "")}">
      <div class="field"><label for="contact-name">Contact name</label><input id="contact-name" name="name" required maxlength="60" autocomplete="off" placeholder="e.g. Jordan Lee" value="${escapeHtml(contact?.name || "")}"></div>
      <div class="field"><label for="contact-phone">Phone number</label><input id="contact-phone" name="phone" type="tel" required maxlength="24" autocomplete="tel" placeholder="e.g. +1 555 010 1234" value="${escapeHtml(contact?.phone || "")}"><span class="field-hint">Include country code if possible. No address book access is used.</span></div>
      <label class="check-row"><input type="checkbox" name="selected" ${selected ? "checked" : ""}><span>Include in the SMS sharing fallback. This does not send anything.</span></label>
      <div class="form-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">${contact ? "Save contact" : "Add contact"}</button></div>
    </form>`;
  }

  function contactsPage() {
    return `<div class="page-heading"><div><p class="eyebrow">Your safety circle</p><h1>Trusted contacts</h1><p class="subtitle">Add people you trust. Contacts are stored on this device and are never messaged unless you choose to share.</p></div><button type="button" class="button button-primary" data-action="add-contact">${icon("plus")} Add contact</button></div>
      <section class="card card-pad">
        <div class="section-title"><h2>${state.contacts.length} ${state.contacts.length === 1 ? "contact" : "contacts"}</h2><span class="status-tag">${state.contacts.filter((item) => item.selected).length} selected for SMS fallback</span></div>
        ${state.contacts.length ? state.contacts.map((contact) => `<div class="contact-row"><input class="check" type="checkbox" data-contact-select="${escapeHtml(contact.id)}" ${contact.selected ? "checked" : ""} aria-label="Include ${escapeHtml(contact.name)} in SMS fallback"><span class="contact-avatar">${escapeHtml(initials(contact.name))}</span><div class="row-main"><strong>${escapeHtml(contact.name)}</strong><span>${escapeHtml(contact.phone)}</span></div><div class="row-actions"><button type="button" class="icon-button" data-action="edit-contact" data-id="${escapeHtml(contact.id)}" aria-label="Edit ${escapeHtml(contact.name)}">${icon("edit")}</button><button type="button" class="icon-button" data-action="delete-contact" data-id="${escapeHtml(contact.id)}" aria-label="Delete ${escapeHtml(contact.name)}">${icon("trash")}</button></div></div>`).join("") : `<div class="empty-state"><span class="status-icon">${icon("users")}</span><strong>Your trusted circle starts here</strong><p>Add a trusted person to make them available in the SMS fallback when you prepare an alert.</p><button class="button button-primary" type="button" data-action="add-contact">${icon("plus")} Add a contact</button></div>`}
      </section>
      <div class="permission-note">${icon("lock")}<span><strong>Privacy note</strong><br>Safe Zone does not read your phone's address book. Selecting a contact only adds their number to the SMS fallback link; your messaging app will ask you to send.</span></div>`;
  }

  function historyPage() {
    return `<div class="page-heading"><div><p class="eyebrow">On this device</p><h1>Emergency history</h1><p class="subtitle">Times, locations and sharing outcomes for SOS attempts. A prepared or shared alert is not proof of delivery.</p></div>${state.history.length ? `<button type="button" class="button" data-action="clear-history">${icon("trash")} Clear history</button>` : ""}</div>
      <section class="card card-pad"><div class="section-title"><h2>Recent activity</h2><span class="status-tag">${state.history.length} saved</span></div>
        ${state.history.length ? state.history.map((item) => historyRow(item, true)).join("") : `<div class="empty-state"><span class="status-icon">${icon("history")}</span><strong>No emergency activity</strong><p>When you confirm an SOS attempt, its time, location (if available) and outcome will appear here.</p></div>`}
      </section>
      <p class="field-hint" style="margin-top:15px">History is stored locally on this device. No emergency service is contacted automatically.</p>`;
  }

  function settingsPage() {
    const storageText = state.storageMode === "encrypted" ? "Encrypted local vault (AES-GCM)" :
      state.storageMode === "browser" ? "Browser storage (unencrypted fallback)" :
        state.storageProblem ? `Session only · ${state.storageProblem}` : "Local browser storage";
    return `<div class="page-heading"><div><p class="eyebrow">Your app, your choices</p><h1>Settings</h1><p class="subtitle">Manage your profile, privacy and data on this device.</p></div></div>
      <section class="card card-pad"><div class="section-title"><h2>Profile</h2><button class="text-button" type="button" data-action="edit-profile">Edit profile</button></div>
        <div class="setting-row"><div><strong>${escapeHtml(state.profile?.name || "")}</strong><p>${escapeHtml(state.profile?.phone || "")}</p></div><span class="contact-avatar">${escapeHtml(initials(state.profile?.name))}</span></div>
      </section>
      <section class="card card-pad" style="margin-top:16px"><div class="section-title"><h2>Privacy & location</h2>${icon("lock")}</div>
        <div class="setting-row"><div><strong>Location permission</strong><p>${state.locationPermission === "granted" ? "Your browser currently allows location access." : state.locationPermission === "denied" ? "Permission is denied. Change it in your browser's site settings, then try again." : "Not requested yet. A browser prompt appears only when you request GPS or prepare an SOS."} Location is not accessed in the background.</p></div><span class="status-tag ${state.locationPermission === "denied" ? "warning" : ""}">${escapeHtml(state.locationPermission)}</span></div>
        <div class="setting-row"><div><strong>Local data storage</strong><p>${escapeHtml(storageText)}. Contact details and history stay in this browser profile; device/browser access can expose them. No cloud account is used.</p></div><span class="status-tag">${state.storageMode === "encrypted" ? "Encrypted" : "Local"}</span></div>
        ${state.storageProblem ? `<div class="permission-note">${icon("info")}<span>Saved changes may not persist: ${escapeHtml(state.storageProblem)}</span></div>` : ""}
        <div class="setting-row"><div><strong>Privacy policy</strong><p>What Safe Zone stores, when location is requested, and what happens when you share.</p></div><button class="button" type="button" data-action="privacy">Read policy</button></div>
      </section>
      <section class="card card-pad" style="margin-top:16px"><div class="section-title"><h2>Sharing settings</h2>${icon("share")}</div>
        <div class="setting-row"><div><strong>SMS fallback recipients</strong><p>${state.contacts.filter((contact) => contact.selected).length} selected trusted contacts. You can change recipients in Contacts. Your messaging app asks before sending.</p></div><button class="button" type="button" data-nav="contacts">Manage</button></div>
        <div class="setting-row"><div><strong>Live location</strong><p>Only updates on this device while the app is open. No background tracking, server or automatic recipient sharing.</p></div><span class="status-tag ${state.liveSharing ? "warning" : ""}">${state.liveSharing ? "Active" : "Off"}</span></div>
      </section>
      <section class="card card-pad" style="margin-top:16px"><div class="section-title"><h2>About Safe Zone</h2>${icon("shield")}</div>
        <div class="setting-row"><div><strong>Safe Zone · Personal safety</strong><p>On-device prototype. SOS alerts are prepared for sharing; this app cannot contact emergency services or confirm message delivery.</p></div><span class="status-tag">Web app</span></div>
        <div class="form-actions" style="justify-content:flex-start"><button class="button button-danger" type="button" data-action="clear-data">${icon("trash")} Clear all local data</button></div>
      </section>`;
  }

  function render() {
    if (!state.profile) {
      root.innerHTML = state.route === "setup" ? setupPage() : welcomePage();
      return;
    }
    if (state.route === "setup") {
      root.innerHTML = setupPage(true);
      return;
    }
    const pages = { home: dashboardPage, location: locationPage, contacts: contactsPage, history: historyPage, settings: settingsPage };
    root.innerHTML = appShell((pages[state.route] || dashboardPage)());
  }

  function modal(title, copy, options = {}) {
    const symbol = options.symbol || "alert";
    const iconColor = options.danger === false ? 'style="background:rgba(112,167,255,.1);color:var(--blue-bright)"' : "";
    return `<div class="modal-backdrop" data-backdrop><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      ${options.hideIcon ? "" : `<span class="modal-icon" ${iconColor}>${icon(symbol)}</span>`}
      <h2 id="modal-title">${title}</h2>${copy ? `<div class="modal-copy">${copy}</div>` : ""}${options.body || ""}
      ${options.actions || ""}</section></div>`;
  }

  function showModal(markup) {
    modalRoot.innerHTML = markup;
    modalRoot.querySelector("input:not([type=hidden]), button")?.focus();
  }

  function closeModal() {
    if (state.sosRequestActive) {
      state.sosRequestId += 1;
      state.sosRequestActive = 0;
    }
    modalRoot.innerHTML = "";
    state.pendingAlert = null;
  }

  function phoneIsValid(value) {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15 && /^[+\d][\d\s().-]*$/.test(value.trim());
  }

  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({ kind: "unavailable", message: "Location unavailable. This browser does not support device location." });
        return;
      }
      navigator.geolocation.getCurrentPosition((position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
            !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
          reject({ kind: "unavailable", message: "Location unavailable. The device returned invalid coordinates." });
          return;
        }
        const result = {
          latitude,
          longitude,
          accuracy: Number.isFinite(position.coords.accuracy) && position.coords.accuracy >= 0 ? position.coords.accuracy : null,
          timestamp: new Date(position.timestamp || Date.now()).toISOString()
        };
        state.location = result;
        state.locationPermission = "granted";
        resolve(result);
      }, (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          state.locationPermission = "denied";
          reject({ kind: "denied", message: "Permission denied. Allow location in your browser's site settings, then try again." });
        } else if (error.code === error.TIMEOUT) {
          reject({ kind: "timeout", message: "Location unavailable. Your device took too long to respond; check GPS and try again." });
        } else {
          reject({ kind: "unavailable", message: "Location unavailable. Check that location services are enabled and try again." });
        }
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }

  function alertMessage(location, timestamp) {
    const name = state.profile?.name || "Safe Zone user";
    return `EMERGENCY ALERT!\nI need assistance.\nName: ${name}\nLocation: ${mapUrl(location)}\nTime: ${formatDate(timestamp)}\n\nPlease contact me.`;
  }

  function createHistoryEntry(details, location, status) {
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      location: location || null,
      status,
      details
    };
    state.history.unshift(entry);
    state.history = state.history.slice(0, 100);
    persist();
    return entry;
  }

  function openSosConfirmation() {
    const selected = state.contacts.filter((contact) => contact.selected).length;
    showModal(modal("Prepare an SOS alert?", "Safe Zone will request your current location, then prepare a message for you to review. Nothing is sent automatically.", {
      body: `<div class="status-card"><span class="status-icon">${icon("users")}</span><div class="status-copy"><strong>${selected} trusted ${selected === 1 ? "contact" : "contacts"} selected</strong><span>You can still choose a different app or recipient when sharing. ${selected ? "If sharing is unavailable, you can copy the alert or open your SMS app." : "You can share with any app, or add contacts for the SMS fallback."}</span></div></div>`,
      actions: `<div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-danger" type="button" data-action="confirm-sos">${icon("sos")} Continue to location</button></div>`
    }));
  }

  async function confirmSos() {
    const requestId = ++state.sosRequestId;
    state.sosRequestActive = requestId;
    modalRoot.innerHTML = modal("Getting location…", "Your browser may ask for location permission. This can take a few seconds.", {
      symbol: "pin", danger: false,
      actions: `<div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button></div>`
    });
    try {
      const location = await getCurrentLocation();
      if (state.sosRequestId !== requestId) return;
      state.sosRequestActive = 0;
      const timestamp = new Date().toISOString();
      const message = alertMessage(location, timestamp);
      const entry = createHistoryEntry("SOS alert prepared", location, "Prepared · delivery not verified");
      state.pendingAlert = { message, entryId: entry.id };
      render();
      showPreparedAlert();
    } catch (error) {
      if (state.sosRequestId !== requestId) return;
      state.sosRequestActive = 0;
      const status = error.kind === "denied" ? "Permission denied · not shared" : "Location unavailable · not shared";
      createHistoryEntry("SOS alert attempt", null, status);
      render();
      showModal(modal(error.kind === "denied" ? "Permission denied" : "Location unavailable", escapeHtml(error.message), {
        symbol: "info", danger: false,
        actions: `<div class="modal-actions"><button class="button button-primary" type="button" data-action="close-modal">Close</button></div>`
      }));
      toast(error.message, "error");
    }
  }

  function smsHref() {
    const phones = state.contacts.filter((contact) => contact.selected)
      .map((contact) => contact.phone.replace(/[^\d+]/g, "")).join(",");
    const body = encodeURIComponent(state.pendingAlert?.message || "");
    return `sms:${phones}?body=${body}`;
  }

  function showPreparedAlert(fallbackMessage = "") {
    if (!state.pendingAlert) return;
    const contactsCount = state.contacts.filter((contact) => contact.selected).length;
    const actions = `<div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Close</button><button class="button" type="button" data-action="copy-alert">${icon("copy")} Copy alert</button>${contactsCount ? `<a class="button" href="${smsHref()}" data-action="sms-open">${icon("phone")} Open SMS app</a>` : ""}<button class="button button-primary" type="button" data-action="share-alert">${icon("share")} Share alert</button></div>`;
    const fallback = fallbackMessage ? `<div class="permission-note" style="margin-bottom:13px">${icon("info")}<span>${escapeHtml(fallbackMessage)}</span></div>` : "";
    const preview = `<label class="field"><span class="field-hint">Review your message before sharing</span><textarea id="alert-copy-text" class="message-preview" rows="7" readonly>${escapeHtml(state.pendingAlert.message)}</textarea></label>`;
    const accuracy = Number.isFinite(state.location?.accuracy) ? `accuracy ±${Math.round(state.location.accuracy)} m` : "accuracy unavailable";
    showModal(modal("Alert prepared", `${fallback}<p class="modal-copy">Location acquired · ${accuracy}. Choose how to continue. Safe Zone cannot verify delivery.</p>${preview}`, {
      symbol: "check", danger: false, hideIcon: false, body: "",
      actions
    }));
  }

  function markSharePreparedStatus(status) {
    if (state.pendingAlert) updateHistory(state.pendingAlert.entryId, status);
  }

  async function shareAlert() {
    const message = state.pendingAlert?.message;
    if (!message) return;
    if (!navigator.share) {
      showPreparedAlert("Sharing unavailable in this browser. Use Copy alert or Open SMS app instead.");
      return;
    }
    toast("Opening sharing application…");
    try {
      await navigator.share({ title: "Safe Zone emergency alert", text: message });
      markSharePreparedStatus("Share flow completed · delivery not verified");
      closeModal();
      render();
      toast("Share flow completed. Safe Zone cannot confirm the alert was delivered.", "success");
    } catch (error) {
      if (error.name === "AbortError") {
        markSharePreparedStatus("Sharing canceled by user · not delivered");
        closeModal();
        render();
        toast("Sharing canceled. No delivery was confirmed.");
      } else {
        showPreparedAlert("Sharing is unavailable here. Copy the alert or open the SMS app; sending is still your choice.");
      }
    }
  }

  async function copyAlert() {
    const message = state.pendingAlert?.message;
    if (!message) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable in this browser.");
      await navigator.clipboard.writeText(message);
      markSharePreparedStatus("Alert copied · delivery not verified");
      showPreparedAlert("Alert copied to your clipboard. Paste it into a message and choose whether to send.");
      toast("Alert copied. It has not been sent.", "success");
    } catch (error) {
      showPreparedAlert(`${error.message || "Copy is unavailable."} Select the message text to copy it manually.`);
      const field = document.querySelector("#alert-copy-text");
      if (field) {
        field.focus();
        field.select();
      }
      toast("Copy unavailable. The message is selected for manual copying.", "error");
    }
  }

  async function refreshLocation() {
    toast("Getting location…");
    try {
      await getCurrentLocation();
      render();
      toast("Location acquired.", "success");
    } catch (error) {
      render();
      toast(error.message, "error");
    }
  }

  async function startLiveSession() {
    if (state.liveSharing || state.liveStarting) return;
    if (!navigator.geolocation) {
      toast("Location unavailable. This browser does not support device location.", "error");
      return;
    }
    state.liveStarting = true;
    render();
    toast("Getting location…");
    try {
      await getCurrentLocation();
      if (!state.liveStarting || document.visibilityState === "hidden") {
        state.liveStarting = false;
        return;
      }
      const watchId = navigator.geolocation.watchPosition((position) => {
        state.location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) && position.coords.accuracy >= 0 ? position.coords.accuracy : null,
          timestamp: new Date(position.timestamp || Date.now()).toISOString()
        };
        if (state.route === "location" || state.route === "home") render();
      }, (error) => {
        state.liveSharing = false;
        state.watchId = null;
        state.locationPermission = error.code === error.PERMISSION_DENIED ? "denied" : state.locationPermission;
        toast(error.code === error.PERMISSION_DENIED ? "Location permission denied. Live session stopped." : "Location unavailable. Live session stopped.", "error");
        render();
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
      state.watchId = watchId;
      state.liveStarting = false;
      state.liveSharing = true;
      render();
      toast("Live location session active on this device only.", "success");
    } catch (error) {
      state.liveStarting = false;
      render();
      toast(error.message, "error");
    }
  }

  function stopLiveSession() {
    if (state.watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
    state.liveSharing = false;
    render();
    toast("Live location session stopped.");
  }

  async function shareCurrentLocation() {
    if (!state.location) {
      toast("Get your location first.", "error");
      return;
    }
    const text = `My current location: ${mapUrl(state.location)}\nUpdated: ${formatDate(state.location.timestamp)}\n\nShared by me using Safe Zone.`;
    if (navigator.share) {
      toast("Opening sharing application…");
      try {
        await navigator.share({ title: "My current location", text });
        toast("Share flow completed. Delivery is not verified.", "success");
      } catch (error) {
        if (error.name !== "AbortError") toast("Sharing unavailable. Try copying the map link from Google Maps.", "error");
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast("Location link copied. It has not been sent.", "success");
      } catch (error) {
        toast("Sharing and clipboard are unavailable in this browser.", "error");
      }
    }
  }

  function addOrEditContact(event) {
    const form = event.target;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    if (!name || name.length > 60) {
      toast("Enter a contact name under 60 characters.", "error");
      return;
    }
    if (!phoneIsValid(phone)) {
      toast("Enter a valid phone number with 7–15 digits.", "error");
      form.elements.phone.focus();
      return;
    }
    const id = String(data.get("id") || "");
    const contact = { id: id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`), name, phone, selected: data.has("selected") };
    if (id) state.contacts = state.contacts.map((item) => item.id === id ? contact : item);
    else state.contacts.push(contact);
    persist();
    closeModal();
    render();
    toast(id ? "Contact updated." : "Contact added.", "success");
  }

  function editContact(id) {
    const contact = state.contacts.find((item) => item.id === id);
    if (!contact) return;
    showModal(modal("Edit contact", "Update the contact details or change whether they appear in the SMS fallback.", {
      symbol: "users", danger: false, body: contactForm(contact)
    }));
  }

  function showContactForm() {
    showModal(modal("Add a trusted contact", "Only the details you enter are saved. Safe Zone does not access your address book.", {
      symbol: "users", danger: false, body: contactForm()
    }));
  }

  function askToDeleteContact(id) {
    const contact = state.contacts.find((item) => item.id === id);
    if (!contact) return;
    showModal(modal(`Remove ${escapeHtml(contact.name)}?`, "This removes the contact from this device. It will not affect messages or call history.", {
      symbol: "trash",
      actions: `<div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-danger" type="button" data-action="confirm-delete-contact" data-id="${escapeHtml(contact.id)}">Remove contact</button></div>`
    }));
  }

  function showProfileForm() {
    state.route = "setup";
    render();
  }

  function askToClearHistory() {
    showModal(modal("Clear emergency history?", "This permanently removes the saved alert times, locations and sharing outcomes from this device.", {
      symbol: "trash",
      actions: `<div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-danger" type="button" data-action="confirm-clear-history">Clear history</button></div>`
    }));
  }

  function askToClearData() {
    showModal(modal("Clear all local data?", "This removes your profile, trusted contacts and emergency history from this browser. You cannot undo this.", {
      symbol: "trash",
      actions: `<div class="modal-actions"><button class="button button-quiet" type="button" data-action="close-modal">Cancel</button><button class="button button-danger" type="button" data-action="confirm-clear-data">Clear all data</button></div>`
    }));
  }

  async function clearAllData() {
    try {
      if (state.db) await databaseClear(state.db);
      localStorage.removeItem("safe-zone-data");
      if (state.db) state.cryptoKey = null;
      stopLiveWatchOnly();
      Object.assign(state, {
        profile: null, contacts: [], history: [], route: "home", location: null,
        locationPermission: "not requested", storageMode: "loading", storageProblem: "", persistenceBlocked: false
      });
      closeModal();
      await loadData();
      render();
      toast("All Safe Zone data cleared from this browser.", "success");
    } catch (error) {
      closeModal();
      toast(`Could not clear all local data: ${error.message}`, "error");
    }
  }

  function stopLiveWatchOnly() {
    if (state.watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
    state.liveSharing = false;
    state.liveStarting = false;
  }

  function showPrivacyPolicy() {
    showModal(modal("Privacy at a glance", "Safe Zone keeps control with you.", {
      symbol: "lock", danger: false,
      body: `<div class="stack">
        <div class="status-card"><span class="status-icon">${icon("pin")}</span><div class="status-copy"><strong>Location</strong><span>Requested from your browser only when you ask for GPS, SOS or a live session. It is not collected in the background. Live sessions update only on this device while open.</span></div></div>
        <div class="status-card"><span class="status-icon">${icon("users")}</span><div class="status-copy"><strong>Profile & contacts</strong><span>Saved in browser storage on this device. When supported, app data is encrypted with a device-local key. This does not protect against someone who can use your unlocked browser or device.</span></div></div>
        <div class="status-card"><span class="status-icon">${icon("share")}</span><div class="status-copy"><strong>Sharing</strong><span>Safe Zone prepares an alert only after your confirmation. You choose the sharing app and recipient. The app cannot verify delivery or contact emergency services.</span></div></div>
        <div class="status-card"><span class="status-icon">${icon("trash")}</span><div class="status-copy"><strong>Clear data</strong><span>Use Settings → Clear all local data to remove the profile, contacts, and history stored by this app.</span></div></div>
      </div>`,
      actions: `<div class="modal-actions"><button class="button button-primary" type="button" data-action="close-modal">Done</button></div>`
    }));
  }

  root.addEventListener("click", async (event) => {
    const navButton = event.target.closest("[data-nav]");
    if (navButton) {
      const route = navButton.dataset.nav;
      if (route === "sos") openSosConfirmation();
      else { closeModal(); state.route = route; render(); }
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "get-started") { state.route = "setup"; render(); }
    else if (action === "sos") openSosConfirmation();
    else if (action === "refresh-location") await refreshLocation();
    else if (action === "start-live") await startLiveSession();
    else if (action === "stop-live") stopLiveSession();
    else if (action === "share-location") await shareCurrentLocation();
    else if (action === "add-contact") showContactForm();
    else if (action === "edit-contact") editContact(button.dataset.id);
    else if (action === "delete-contact") askToDeleteContact(button.dataset.id);
    else if (action === "edit-profile") showProfileForm();
    else if (action === "privacy") showPrivacyPolicy();
    else if (action === "clear-history") askToClearHistory();
    else if (action === "clear-data") askToClearData();
    else if (action === "cancel-profile") { state.route = "settings"; render(); }
  });

  modalRoot.addEventListener("click", async (event) => {
    if (event.target.matches("[data-backdrop]")) { closeModal(); return; }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "close-modal") closeModal();
    else if (action === "confirm-sos") await confirmSos();
    else if (action === "copy-alert") await copyAlert();
    else if (action === "share-alert") await shareAlert();
    else if (action === "add-contact") showContactForm();
    else if (action === "edit-contact") editContact(actionButton.dataset.id);
    else if (action === "delete-contact") {
      askToDeleteContact(actionButton.dataset.id);
    } else if (action === "confirm-delete-contact") {
      state.contacts = state.contacts.filter((item) => item.id !== actionButton.dataset.id);
      persist(); closeModal(); render(); toast("Contact removed.");
    } else if (action === "edit-profile") showProfileForm();
    else if (action === "privacy") showPrivacyPolicy();
    else if (action === "clear-history") askToClearHistory();
    else if (action === "confirm-clear-history") {
      state.history = []; persist(); closeModal(); render(); toast("Emergency history cleared.", "success");
    } else if (action === "clear-data") askToClearData();
    else if (action === "confirm-clear-data") await clearAllData();
    else if (action === "sms-open") {
      event.preventDefault();
      markSharePreparedStatus("SMS link activated · delivery not verified");
      const smsUrl = actionButton.href;
      closeModal();
      render();
      toast("Opening sharing application… Review before sending; delivery is not verified.");
      window.setTimeout(() => { window.location.href = smsUrl; }, 120);
    }
  });

  root.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-contact-select]");
    if (!checkbox) return;
    const contact = state.contacts.find((item) => item.id === checkbox.dataset.contactSelect);
    if (contact) { contact.selected = checkbox.checked; persist(); render(); }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form.matches("form[data-form]")) return;
    event.preventDefault();
    if (form.dataset.form === "contact") { addOrEditContact(event); return; }
    if (form.dataset.form === "profile") {
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      if (!name || name.length > 60) { toast("Enter your name (up to 60 characters).", "error"); return; }
      if (!phoneIsValid(phone)) { toast("Enter a valid phone number with 7–15 digits.", "error"); form.elements.phone.focus(); return; }
      state.profile = { name, phone };
      state.route = "home";
      persist(); render(); toast(`You're all set, ${name}.`, "success");
    }
  });

  async function initialize() {
    try {
      await loadData();
    } catch (error) {
      state.storageMode = "session only";
      state.persistenceBlocked = true;
      state.storageProblem = error?.message || "Saved data could not be opened.";
      toast(`Saved data could not be read. Your current session will not overwrite it: ${state.storageProblem}`, "error");
    }
    render();
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("Safe Zone offline support could not be registered:", error);
      });
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && (state.liveSharing || state.liveStarting)) {
      stopLiveWatchOnly();
      render();
    }
  });
  window.addEventListener("pagehide", stopLiveWatchOnly);
  initialize();
})();
