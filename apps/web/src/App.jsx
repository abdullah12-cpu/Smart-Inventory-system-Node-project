import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { StoreProvider } from "./lib/store";
import LoginPage from "./components/LoginPage";
import LoadingScreen from "./components/LoadingScreen";
import AdminPortal from "./components/AdminPortal";
import DistributorPortal from "./components/DistributorPortal";
import BuyerPortal from "./components/BuyerPortal";
import LandingPage from "./components/landing/LandingPage";
import MobileChatApp from "./components/mobile/MobileChatApp";
import { isNativeApp } from "./lib/apiBase";
/**
 * True for phone/tablet-class devices: a coarse pointer (touch) on a narrow viewport.
 * Both conditions are required so a narrowed desktop browser window -- which has a fine
 * pointer -- still gets the full site rather than being pushed into the phone chat.
 */
function isPhoneDevice() {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  return coarsePointer && window.innerWidth <= 820;
}

export default function App() {
  // The phone-sized AI assistant. Handled before anything else and outside StoreProvider:
  // it signs in and talks to the copilot endpoints on its own, so it avoids the store's
  // eager fetch of products/orders/quotations/invoices/suppliers/payments/stock-movements/
  // audit-logs, none of which that screen renders.
  //
  // Reached three ways:
  //   1. ?page=mobile          -- explicit, works on any device
  //   2. the native Capacitor shell -- it launches at the bundle root with no query string
  //   3. any phone opening the site with no ?page at all -- phones get the assistant by
  //      default, since the desktop portals are unusable at that size and expecting people
  //      to remember a query string is a poor way to hand out a link.
  //
  // An explicit ?page=... always wins, so ?page=landing / ?page=portal still opens the full
  // site on a phone when that is genuinely wanted.
  const pageParam = new URLSearchParams(window.location.search).get("page");
  const isMobileChat =
    pageParam === "mobile" || isNativeApp() || (!pageParam && isPhoneDevice());

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
    localStorage.removeItem("ciq_admin_activeTab");
    localStorage.removeItem("ciq_distributor_activeTab");
    localStorage.removeItem("ciq_buyer_activeTab");
    setAppState("landing");
    window.location.href = "/";
  };

  // Returned after the hooks above so hook order stays stable across renders.
  if (isMobileChat) return /* @__PURE__ */ jsx(MobileChatApp, {});

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
