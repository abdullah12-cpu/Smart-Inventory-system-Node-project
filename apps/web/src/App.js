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
  const [appState, setAppState] = useState("landing");
  const [portal, setPortal] = useState("buyer");
  const handleLogin = (selectedPortal) => {
    setPortal(selectedPortal);
    setAppState("loading");
  };
  useEffect(() => {
    if (appState === "loading") {
      const timer = setTimeout(() => setAppState("portal"), 1600);
      return () => clearTimeout(timer);
    }
  }, [appState]);
  const handleLogout = () => {
    setAppState("landing");
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
