import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { StoreProvider } from "./lib/store";
import LoginPage from "./components/LoginPage";
import LoadingScreen from "./components/LoadingScreen";
import AdminPortal from "./components/AdminPortal";
import DistributorPortal from "./components/DistributorPortal";
import BuyerPortal from "./components/BuyerPortal";
import LandingPage from "./components/landing/LandingPage";
import { clearAuthToken } from "./lib/apiBase";
export default function App() {
  // The mobile assistant is a separate build with its own entry point (mobile.html), not a
  // route inside this app -- see src/mobile.jsx for why. Only thing left to handle here is
  // old links: ?page=mobile used to select it from this bundle, so redirect those rather
  // than 404-ing people who bookmarked or shared one.
  const legacyMobileLink =
    new URLSearchParams(window.location.search).get("page") === "mobile";
  if (legacyMobileLink && typeof window !== "undefined") {
    window.location.replace("/mobile");
  }

  const [appState, setAppState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    if (page) {
      if (page === "admin") return "login";
      return page;
    }
    return localStorage.getItem("ciq_appState") || "landing";
  });
  const [portal, setPortal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const port = params.get("portal");
    const page = params.get("page");
    if (port) return port;
    if (page === "admin") return "admin";
    return localStorage.getItem("ciq_portal") || "buyer";
  });

  const handleLogin = (selectedPortal) => {
    setPortal(selectedPortal);
    localStorage.setItem("ciq_portal", selectedPortal);
    setAppState("loading");
    localStorage.setItem("ciq_appState", "loading");

    const params = new URLSearchParams(window.location.search);
    params.set("page", "loading");
    params.set("portal", selectedPortal);
    window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (appState === "loading") {
      const timer = setTimeout(() => {
        setAppState("portal");
        localStorage.setItem("ciq_appState", "portal");

        const params = new URLSearchParams(window.location.search);
        params.set("page", "portal");
        params.set("portal", portal);
        // Default tab on load
        if (portal === "admin") {
          const tab = localStorage.getItem("ciq_admin_activeTab") || "dashboard";
          params.set("tab", tab);
        } else if (portal === "distributor") {
          const tab = localStorage.getItem("ciq_distributor_activeTab") || "catalog";
          params.set("tab", tab);
        } else if (portal === "buyer") {
          const tab = localStorage.getItem("ciq_buyer_activeTab") || "catalog";
          params.set("tab", tab);
        }
        window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [appState, portal]);

  useEffect(() => {
    // Never rewrite the URL while the mobile assistant is showing. These effects still run
    // (hooks cannot be skipped), and letting them stamp ?page=<state> onto a phone's URL is
    // exactly what used to strand phones on the desktop site after one refresh.
    if (appState !== "loading") {
      localStorage.setItem("ciq_appState", appState);
      const params = new URLSearchParams(window.location.search);
      params.set("page", appState);
      if (appState === "portal" || appState === "login" || appState === "register") {
        params.set("portal", portal);
      } else {
        params.delete("portal");
        params.delete("tab");
      }
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    }
  }, [appState, portal]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      let page = params.get("page") || "landing";
      let port = params.get("portal") || "buyer";
      if (page === "admin") {
        page = "login";
        port = "admin";
      }
      setAppState(page);
      setPortal(port);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("ciq_appState");
    localStorage.removeItem("ciq_portal");
    localStorage.removeItem("ciq_currentUser");
    clearAuthToken();
    localStorage.removeItem("ciq_admin_activeTab");
    localStorage.removeItem("ciq_distributor_activeTab");
    localStorage.removeItem("ciq_buyer_activeTab");
    setAppState("landing");
    window.location.href = "/";
  };

  return /* @__PURE__ */ jsxs(StoreProvider, { children: [
    appState === "landing" && /* @__PURE__ */ jsx(
      LandingPage,
      {
        onGetStarted: (selectedPortal) => {
          setPortal(selectedPortal);
          setAppState("login");
          const params = new URLSearchParams(window.location.search);
          params.set("page", "login");
          params.set("portal", selectedPortal);
          window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
        },
        onRegisterClick: (selectedPortal) => {
          setPortal(selectedPortal);
          setAppState("register");
          const params = new URLSearchParams(window.location.search);
          params.set("page", "register");
          params.set("portal", selectedPortal);
          window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
        }
      }
    ),
    appState === "login" && /* @__PURE__ */ jsx(
      LoginPage,
      {
        initialMode: "login",
        portal,
        onLogin: handleLogin,
        onBackToLanding: () => setAppState("landing")
      }
    ),
    appState === "register" && /* @__PURE__ */ jsx(
      LoginPage,
      {
        initialMode: "register",
        portal,
        onLogin: handleLogin,
        onBackToLanding: () => setAppState("landing")
      }
    ),
    appState === "loading" && /* @__PURE__ */ jsx(LoadingScreen, { portal }),
    appState === "portal" && /* @__PURE__ */ jsxs(Fragment, { children: [
      portal === "admin" && /* @__PURE__ */ jsx(AdminPortal, { onLogout: handleLogout }),
      portal === "distributor" && /* @__PURE__ */ jsx(DistributorPortal, { onLogout: handleLogout }),
      portal === "buyer" && /* @__PURE__ */ jsx(BuyerPortal, { onLogout: handleLogout })
    ] })
  ] });
}
