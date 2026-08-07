import { jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installApiBaseUrl } from "./lib/apiBase";
import "./globals.css";

// Must run before anything renders: the store fires API requests on mount, and those need
// the base URL already applied when the app runs outside the dev proxy (native builds).
installApiBaseUrl();

ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsx(React.StrictMode, { children: /* @__PURE__ */ jsx(App, {}) })
);
