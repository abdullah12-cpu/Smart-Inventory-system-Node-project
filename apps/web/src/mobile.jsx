/**
 * Entry point for the mobile assistant — a build that contains ONLY the chatbot.
 *
 * Why this exists as its own entry rather than a route inside the main app:
 *
 * The mobile chat used to be reached through the website's bundle, selected at runtime by
 * `?page=mobile` plus device detection. That decision could always be pushed the wrong way --
 * by a stale query string the app itself had written into the URL, by cached localStorage,
 * or by a device that didn't match the heuristic -- and when it went wrong a phone was served
 * the full desktop site. Two rounds of patching the heuristic did not fix it, because the
 * heuristic was the problem.
 *
 * Splitting the entry point removes the decision entirely. `App.jsx`, the portals and the
 * landing page are not imported here, so they are not in this bundle: there is no website to
 * fall back to, whatever the URL or storage says. It is also what the Capacitor app ships,
 * so the native build and the installable web app are byte-for-byte the same product.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import MobileChatApp from "./components/mobile/MobileChatApp";
import { installApiBaseUrl } from "./lib/apiBase";
import "./globals.css";

// Must run before render: the app issues API calls immediately on mount, and those need the
// base URL (native builds) and the session token already applied.
installApiBaseUrl();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MobileChatApp />
  </React.StrictMode>
);
