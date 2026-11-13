# Safe Zone

A responsive personal-safety web app and installable Progressive Web App (PWA). It uses the real browser geolocation API, keeps profile/contact/history data on the device, and requires a deliberate confirmation before preparing an emergency message.

## Run locally

1. Install Python 3 if it is not already installed.
2. From this folder, run:

   ```powershell
   python -m http.server 8000
   ```

3. Open `http://localhost:8000` in Chrome, Edge, or another modern browser.

Geolocation, clipboard, and PWA installation require a secure context. `localhost` is treated as secure; when hosted elsewhere, use HTTPS. No npm packages, Firebase account, API key, or backend are required.

## Install on Android

Host the folder on an HTTPS web server, open its URL in Android Chrome, then choose **Install app** or **Add to Home screen** from the browser menu. The PWA provides an app-like, offline-capable shell. An Android APK/native Flutter project is not included: Flutter/Dart and the Android SDK were not available in the build environment.

## What works

- Responsive welcome, profile, dashboard, location, contacts, history, and settings screens.
- On-demand real device location, coordinates, reported accuracy, permission/error handling, and Google Maps links.
- SOS confirmation, reviewable emergency message, browser share sheet when available, explicit copy fallback, and an SMS-app link for selected contacts. No message is sent without the user's action.
- Add/edit/delete trusted contacts, phone validation, and recipient selection without address-book access.
- Optional foreground-only location session with a visible indicator and a stop control. It does not publish to a remote contact or track in the background.
- Local alert history and controls to clear history or all app data.
- AES-GCM encrypted profile, contacts, and history in IndexedDB when Web Crypto and IndexedDB are available; local browser storage is used as a clearly identified fallback.
- Cached app shell for returning offline use. GPS and map links still depend on device/browser and network conditions.

## Safety and privacy limits

Safe Zone is not an emergency dispatch service and does not place calls or automatically send texts. The share sheet or messaging app is user-controlled; the app cannot verify that an alert was delivered or received. Location is requested only after an explicit user action. A live session updates location only while the app is open and visible; it is local to the device and is not remote live sharing.

Encrypted browser storage uses a device-local key in IndexedDB. This is not a substitute for a device lock and does not protect data from someone who can use the unlocked device or run code in the same browser origin. Clearing browser/site data also removes the locally stored app data.

## Project files

- `index.html` — app shell and PWA metadata
- `styles.css` — responsive visual design
- `app.js` — navigation, storage, GPS, contacts, SOS, and history
- `manifest.webmanifest`, `sw.js` — PWA installation and offline app shell
- `icons/safe-zone.svg` — Safe Zone shield/location logo
