import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { StoreProvider } from "./lib/store";
import LoginPage from "./components/LoginPage";
import LoadingScreen from "./components/LoadingScreen";
import AdminPortal from "./components/AdminPortal";
import DistributorPortal from "./components/DistributorPortal";
import BuyerPortal from "./components/BuyerPortal";
import LandingPage from "./components/landing/LandingPage";
export default function App() {
  const [appState, setAppState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    if (page) return page;
    return localStorage.getItem("ciq_appState") || "landing";
  });
  const [portal, setPortal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const port = params.get("portal");
    if (port) return port;
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
      if (appState === "portal") {
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
      const page = params.get("page") || "landing";
      const port = params.get("portal") || "buyer";
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
  return /* @__PURE__ */ jsxs(StoreProvider, { children: [
    appState === "landing" && /* @__PURE__ */ jsx(
      LandingPage,
      {
        onGetStarted: () => setAppState("login"),
        onRegisterClick: () => setAppState("register")
      }
    ),
    appState === "login" && /* @__PURE__ */ jsx(
      LoginPage,
      {
        initialMode: "login",
        onLogin: handleLogin,
        onBackToLanding: () => setAppState("landing")
      }
    ),
    appState === "register" && /* @__PURE__ */ jsx(
      LoginPage,
      {
        initialMode: "register",
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
