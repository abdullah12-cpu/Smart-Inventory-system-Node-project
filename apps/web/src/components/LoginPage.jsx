import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building2,
  ArrowLeft,
  CheckCircle2,
  Search,
  Loader2,
  XCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Warehouse,
  Coins,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Globe,
  MapPin
} from "lucide-react";
import { useStore } from "@/lib/store";
import { setAuthToken } from "@/lib/apiBase";

export default function LoginPage({
  onLogin,
  initialMode = "login",
  onBackToLanding,
  portal: propPortal
}) {
  const { addNotification, setCurrentUser } = useStore();
  const params = new URLSearchParams(window.location.search);
  const portalParam = params.get("portal") || propPortal || "buyer";

  const isAdminRoute = portalParam === "admin";
  const isWholesaleRoute = portalParam === "distributor";
  const isBuyerRoute = portalParam === "buyer";

  const [mode, setMode] = useState(() => {
    if (initialMode === "register") {
      return isWholesaleRoute ? "register_distributor" : "register_buyer";
    }
    return initialMode;
  });

  const [portal, setPortal] = useState(portalParam);
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState(() => {
    if (isAdminRoute) return "zain@commerceiq.com";
    if (isWholesaleRoute) return "asim@commerceiq.com";
    return "demo@commerceiq.com";
  });
  const [password, setPassword] = useState("demopassword");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [ntnCode, setNtnCode] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [warehouseRegion, setWarehouseRegion] = useState("wh-1");
  const [buyerStoreName, setBuyerStoreName] = useState("");
  const [buyerContactName, setBuyerContactName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerRegion, setBuyerRegion] = useState("wh-1");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const [statusEmail, setStatusEmail] = useState("");
  const [statusResult, setStatusResult] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  const handleCheckStatus = async (e) => {
    e.preventDefault();
    if (!statusEmail) return;
    setStatusLoading(true);
    setStatusError("");
    setStatusResult(null);
    try {
      const response = await fetch(`/api/auth/application-status?email=${encodeURIComponent(statusEmail)}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setStatusResult(data);
      } else {
        setStatusError(data.message || "Failed to retrieve application status.");
      }
    } catch (err) {
      console.error(err);
      setStatusError("Failed to connect to the server.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSubmitLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) return;
    setErrorMsg("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Persist the session token before the user object: the store starts firing
        // API calls as soon as currentUser is set, and those need to be authenticated.
        setAuthToken(data.token);
        setCurrentUser(data.user);
        const userRole = data.user.role || "buyer";

        if (isAdminRoute && userRole !== "admin") {
          setErrorMsg("Access denied. Authorized administrator credentials required.");
          return;
        }
        if (isWholesaleRoute && userRole !== "distributor") {
          setErrorMsg("Access denied. This portal is restricted to partner wholesalers.");
          return;
        }
        if (isBuyerRoute && userRole !== "buyer") {
          setErrorMsg("Access denied. This portal is reserved for retail B2C buyers.");
          return;
        }

        localStorage.setItem("ciq_portal", userRole);
        onLogin(userRole);
      } else {
        setErrorMsg(data.message || "Invalid email or password.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to authentication service.");
    }
  };

  const handlePrefill = async (role) => {
    setErrorMsg("");
    let targetEmail = "";
    let targetPortal = "";
    if (role === "admin") {
      targetEmail = "zain@commerceiq.com";
      targetPortal = "admin";
    } else if (role === "distributor") {
      targetEmail = "asim@commerceiq.com";
      targetPortal = "distributor";
    } else {
      targetEmail = "demo@commerceiq.com";
      targetPortal = "buyer";
    }
    
    setEmail(targetEmail);
    setPassword("demopassword");
    setPortal(targetPortal);

    // Call submit directly
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail, password: "demopassword" }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Persist the session token before the user object: the store starts firing
        // API calls as soon as currentUser is set, and those need to be authenticated.
        setAuthToken(data.token);
        setCurrentUser(data.user);
        const userRole = data.user.role || targetPortal;
        
        if (isAdminRoute && userRole !== "admin") {
          setErrorMsg("Access denied. Authorized administrator credentials required.");
          return;
        }
        if (isWholesaleRoute && userRole !== "distributor") {
          setErrorMsg("Access denied. This portal is restricted to partner wholesalers.");
          return;
        }
        if (isBuyerRoute && userRole !== "buyer") {
          setErrorMsg("Access denied. This portal is reserved for retail B2C buyers.");
          return;
        }

        localStorage.setItem("ciq_portal", userRole);
        onLogin(userRole);
      } else {
        setErrorMsg(data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    if (!businessName || !contactName || !regEmail || !regPassword || !country || !city) {
      alert("Please fill in all fields, including Country and City.");
      return;
    }
    try {
      const response = await fetch("/api/auth/register-distributor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName,
          contactName,
          regEmail,
          password: regPassword,
          country,
          city
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        addNotification({
          title: "B2B Partnership Registration Applied",
          message: `B2B partnership requested by ${businessName} (Contact: ${contactName}).`,
          severity: "INFO",
          trigger_type: "DISTRIBUTOR_REGISTRATION"
        });
        setRegisterSuccess(true);
      } else {
        alert(data.message || "Distributor registration failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to registration service.");
    }
  };

  const handleSubmitBuyerRegister = async (e) => {
    e.preventDefault();
    if (!buyerStoreName || !buyerContactName || !buyerEmail || !regPassword) return;
    try {
      const response = await fetch("/api/auth/register-buyer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyerStoreName,
          buyerContactName,
          buyerEmail,
          password: regPassword,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        addNotification({
          title: "New Buyer Account Registered",
          message: `Buyer profile registered for ${buyerStoreName} (Contact: ${buyerContactName}).`,
          severity: "INFO",
          trigger_type: "BUYER_REGISTRATION"
        });
        setRegisterSuccess(true);
      } else {
        alert(data.message || "Buyer registration failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to registration service.");
    }
  };

  // ==========================================
  // 1. ADMIN SECURE LOGIN (Indigo Theme)
  // ==========================================
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex font-sans overflow-hidden text-xs">
        {/* LEFT PANEL */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] text-white p-16 flex-col justify-between relative">
          <motion.div 
            animate={{ 
              scale: [1, 1.25, 1],
              opacity: [0.15, 0.35, 0.15],
              x: [0, 40, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[#4F46E5]/10 blur-[80px] pointer-events-none rounded-full" 
          />
          <div className="flex items-center gap-3 cursor-pointer z-10" onClick={onBackToLanding}>
            <div className="w-10 h-10 bg-white text-[#4F46E5] rounded-xl flex items-center justify-center font-black text-xl shadow-lg">IQ</div>
            <div>
              <div className="text-white font-extrabold text-base tracking-tight leading-none">CommerceIQ</div>
              <div className="text-[8px] text-white/60 font-bold tracking-widest uppercase mt-0.5">Admin Portal Console</div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="my-auto z-10 flex flex-col gap-6 max-w-lg">
            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-start border border-white/10 text-indigo-400">Control Panel</span>
            <h1 className="text-3xl font-black tracking-tight leading-snug" style={{ fontFamily: "Outfit, sans-serif" }}>Manage & Control the CommerceIQ Ecosystem</h1>
            <p className="text-slate-400 text-xs leading-relaxed">Access real-time platform analytics, process incoming distributor application requests, and configure regional warehouses.</p>

            <div className="flex flex-col gap-3.5 mt-4">
              {[
                { icon: <Warehouse className="text-indigo-400" size={14} />, title: "Depot & Stock Control", desc: "Monitor safety thresholds and stock across Karachi, Lahore, and Islamabad terminals." },
                { icon: <User className="text-indigo-400" size={14} />, title: "Distributor Approvals", desc: "Review and approve partner wholesaler credentials and credit ledgers." },
                { icon: <Coins className="text-indigo-400" size={14} />, title: "Real-time Audits", desc: "Inspect customer transaction logs, invoice histories, and system events." }
              ].map((benefit, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + idx * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.025, x: 8, backgroundColor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(79, 70, 229, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">{benefit.icon}</div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{benefit.title}</h4>
                    <p className="text-slate-400 text-[10px] leading-relaxed mt-0.5">{benefit.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <div className="text-[10px] text-slate-500 z-10">© 2026 CommerceIQ. Authorized Administrator Console.</div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white overflow-y-auto h-screen">
          <motion.div initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-[420px] flex flex-col gap-6">
            <button onClick={onBackToLanding} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors border-0 bg-transparent cursor-pointer self-start -ml-1 text-[11px] font-bold">
              <ArrowLeft size={13} /> Exit Console
            </button>

            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-black text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>Admin Authorization</h2>
                <p className="text-slate-400 mt-0.5">Please sign in with administrator credentials.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                <span className="text-[10px] text-[#4F46E5] font-extrabold uppercase tracking-wider flex items-center gap-1"><Sparkles size={11} /> 1-Click Secure Admin Auth</span>
                <motion.button
                  type="button"
                  onClick={() => handlePrefill("admin")}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  animate={{ boxShadow: ["0 0 0 0 rgba(79,70,229,0.1)", "0 0 10px 3px rgba(79,70,229,0.3)", "0 0 0 0 rgba(79,70,229,0.1)"] }}
                  transition={{ boxShadow: { repeat: Infinity, duration: 2.2, ease: "easeInOut" } }}
                  className="w-full py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold transition-all cursor-pointer text-[10px] text-slate-600 hover:text-[#4F46E5] hover:border-[#4F46E5]/40"
                >
                  Admin Portal Login
                </motion.button>
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-rose-50 border border-rose-200 text-rose-600 px-3.5 py-2 rounded-xl text-[10px] font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
                    <AlertCircle size={12} /> {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmitLogin} autoComplete="off" className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Console Admin Email</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={13} /></span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="admin@commerceiq.com"
                      autoComplete="off"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5] transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Security Password</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5] transition-all"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer">
                      {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-[11px] uppercase rounded-lg border-0 shadow-sm cursor-pointer transition-all mt-2">
                  Sign In to Admin Console
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. WHOLESALER B2B LOGIN/REGISTRATION (Indigo Theme)
  // ==========================================
  if (isWholesaleRoute) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex font-sans overflow-hidden text-xs">
        {/* LEFT PANEL */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] text-white p-16 flex-col justify-between relative">
          <motion.div 
            animate={{ 
              scale: [1, 1.25, 1],
              opacity: [0.15, 0.35, 0.15],
              x: [0, 40, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[#4F46E5]/10 blur-[80px] pointer-events-none rounded-full" 
          />
          <div className="flex items-center gap-3 cursor-pointer z-10" onClick={onBackToLanding}>
            <div className="w-10 h-10 bg-white text-[#4F46E5] rounded-xl flex items-center justify-center font-black text-xl shadow-lg">IQ</div>
            <div>
              <div className="text-white font-extrabold text-base tracking-tight leading-none">CommerceIQ</div>
              <div className="text-[8px] text-white/60 font-bold tracking-widest uppercase mt-0.5">B2B Wholesale Portal</div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="my-auto z-10 flex flex-col gap-6 max-w-lg">
            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-start border border-white/10 text-indigo-400">Wholesale Channel</span>
            <h1 className="text-3xl font-black tracking-tight leading-snug" style={{ fontFamily: "Outfit, sans-serif" }}>Scale B2B Sourcing with Direct Factory Rates</h1>
            <p className="text-slate-400 text-xs leading-relaxed">Allocate payments directly to custom interest-free ledger limits, retrieve multi-depot stock, and verify bulk safety stock margins.</p>

            <div className="flex flex-col gap-3.5 mt-4">
              {[
                { icon: <TrendingUp className="text-indigo-400" size={14} />, title: "Factory Wholesale Tiers", desc: "Access commercial safety safety thresholds and wholesale prices linked to MOQ constraints." },
                { icon: <Warehouse className="text-indigo-400" size={14} />, title: "Depot Freight Sourcing", desc: "Allocate cargo directly from terminal locations in Karachi, Lahore, and Islamabad." },
                { icon: <Coins className="text-indigo-400" size={14} />, title: "Balance Invoice Ledger", desc: "Submit wire details to settle custom PKR interest-free distributor ledgers." }
              ].map((benefit, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + idx * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.025, x: 8, backgroundColor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(79, 70, 229, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">{benefit.icon}</div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{benefit.title}</h4>
                    <p className="text-slate-400 text-[10px] leading-relaxed mt-0.5">{benefit.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <div className="text-[10px] text-slate-500 z-10">© 2026 CommerceIQ. Authorized wholesale channel.</div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white overflow-y-auto h-screen">
          <motion.div initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-[420px] flex flex-col gap-6">
            <button onClick={onBackToLanding} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors border-0 bg-transparent cursor-pointer self-start -ml-1 text-[11px] font-bold">
              <ArrowLeft size={13} /> Exit Portal
            </button>

            {/* Quick-switch tab selection */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
              <button
                onClick={() => { setMode("login"); setErrorMsg(""); }}
                className={`flex-1 py-2 text-center rounded-lg font-bold transition-all border-0 cursor-pointer ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode("register_distributor"); setErrorMsg(""); }}
                className={`flex-1 py-2 text-center rounded-lg font-bold transition-all border-0 cursor-pointer ${mode.startsWith("register") ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Partner Apply
              </button>
              <button
                onClick={() => { setMode("check_status"); setErrorMsg(""); }}
                className={`flex-1 py-2 text-center rounded-lg font-bold transition-all border-0 cursor-pointer ${mode === "check_status" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Track Apply
              </button>
            </div>

            {registerSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-4 animate-fade-in">
                <CheckCircle2 size={36} className="text-emerald-500" />
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Application Submitted!</h3>
                  <p className="text-slate-500 text-[10px] leading-relaxed mt-1">Your B2B distributor account application was successfully saved. Managers will inspect NTN codes and credit allocations shortly.</p>
                </div>
                <button onClick={() => { setRegisterSuccess(false); setMode("login"); }} className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg border-0 cursor-pointer transition-colors shadow-sm">
                  Back to Sign In
                </button>
              </div>
            ) : mode === "login" ? (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-black text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>Wholesale Sign In</h2>
                  <p className="text-slate-400 mt-0.5">Please sign in to access B2B inventory pipelines.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                  <span className="text-[10px] text-[#4F46E5] font-extrabold uppercase tracking-wider flex items-center gap-1"><Sparkles size={11} /> 1-Click Wholesale Auth</span>
                  <motion.button
                    type="button"
                    onClick={() => handlePrefill("distributor")}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    animate={{ boxShadow: ["0 0 0 0 rgba(79,70,229,0.1)", "0 0 10px 3px rgba(79,70,229,0.3)", "0 0 0 0 rgba(79,70,229,0.1)"] }}
                    transition={{ boxShadow: { repeat: Infinity, duration: 2.2, ease: "easeInOut" } }}
                    className="w-full py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold transition-all cursor-pointer text-[10px] text-slate-600 hover:text-[#4F46E5] hover:border-[#4F46E5]/40"
                  >
                    Wholesaler Portal Login
                  </motion.button>
                </div>

                <AnimatePresence>
                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-rose-50 border border-rose-200 text-rose-600 px-3.5 py-2 rounded-xl text-[10px] font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
                      <AlertCircle size={12} /> {errorMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmitLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={13} /></span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="wholesaler@company.com"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5] transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Password</label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
                      <input
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5] transition-all"
                      />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer">
                        {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-[11px] uppercase rounded-lg border-0 shadow-sm cursor-pointer transition-all mt-2">
                    Sign In to B2B Console
                  </motion.button>
                </form>
              </div>
            ) : mode === "check_status" ? (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-black text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>Track Application</h2>
                  <p className="text-slate-400 mt-0.5">Check B2B partnership queue status.</p>
                </div>

                <form onSubmit={handleCheckStatus} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Registered Business Email</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={13} /></span>
                      <input
                        type="email"
                        value={statusEmail}
                        onChange={(e) => setStatusEmail(e.target.value)}
                        required
                        placeholder="e.g. b2b@company.com"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={statusLoading} className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-[11px] uppercase rounded-lg border-0 shadow-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                    {statusLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    <span>Search Queue Status</span>
                  </button>
                </form>

                {statusError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 px-3.5 py-3 rounded-xl text-[10px] font-semibold text-center flex items-center justify-center gap-2">
                    <XCircle size={14} className="text-rose-500 shrink-0" />
                    <span>{statusError}</span>
                  </div>
                )}

                {statusResult && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800">{statusResult.business_name || "B2B Partner"}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        statusResult.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                        statusResult.status === "REJECTED" ? "bg-rose-50 text-rose-600 border border-rose-200" :
                        "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>{statusResult.status}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 text-[10px] text-slate-500 border-t border-slate-200 pt-3">
                      <div className="flex justify-between"><span>Applied On:</span> <span className="font-bold text-slate-700">{statusResult.created_at ? new Date(statusResult.created_at).toLocaleDateString() : "—"}</span></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-black text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>Wholesaler Registration</h2>
                  <p className="text-slate-400 mt-0.5">Apply for a B2B distributor account queue.</p>
                </div>

                <form onSubmit={handleSubmitRegister} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Business Company Name *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Building2 size={13} /></span>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                        placeholder="e.g. Lahore Wholesale Terminal"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Contact Name *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={13} /></span>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        required
                        placeholder="e.g. Asim Raza"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email Address *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={13} /></span>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                        placeholder="distributor@company.com"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Country *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Globe size={13} /></span>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          required
                          placeholder="e.g. Pakistan"
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">City *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><MapPin size={13} /></span>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                          placeholder="e.g. Lahore"
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Password *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-[11px] uppercase rounded-lg border-0 shadow-sm cursor-pointer transition-colors mt-2">
                    Submit Distributor Request
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. RETAIL B2C BUYER LOGIN/REGISTRATION (Indigo Theme)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex font-sans overflow-hidden text-xs">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] text-white p-16 flex-col justify-between relative">
        <motion.div 
          animate={{ 
            scale: [1, 1.25, 1],
            opacity: [0.15, 0.35, 0.15],
            x: [0, 40, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-[#4F46E5]/10 blur-[80px] pointer-events-none rounded-full" 
        />
        
        {/* Top Header Logo */}
        <div className="flex items-center gap-3 cursor-pointer z-10" onClick={onBackToLanding}>
          <div className="w-10 h-10 bg-white text-[#4F46E5] rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
            IQ
          </div>
          <div>
            <div className="text-white font-extrabold text-base tracking-tight leading-none">CommerceIQ</div>
            <div className="text-[8px] text-white/60 font-bold tracking-widest uppercase mt-0.5">Consumer Retail Hub</div>
          </div>
        </div>

        {/* Consumer copy */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="my-auto z-10 flex flex-col gap-6 max-w-lg"
        >
          <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-start border border-white/10 text-indigo-400">
            Retail Buyer Portal
          </span>
          <h1 className="text-3xl font-black tracking-tight leading-snug" style={{ fontFamily: "Outfit, sans-serif" }}>
            Direct Consumer Sourcing Made Simple
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed">
            Purchase single-unit products instantly, track courier delivery in real time, and enjoy end-to-end secure checkouts.
          </p>

          {/* Cards strip with Staggered Entrance and Hover lift */}
          <div className="flex flex-col gap-3.5 mt-4">
            {[
              {
                icon: <Truck className="text-indigo-400" size={14} />,
                title: "Doorstep Courier Shipping",
                desc: "Enjoy immediate retail order dispatch with active courier tracking updates."
              },
              {
                icon: <ShieldCheck className="text-indigo-400" size={14} />,
                title: "Secure Payment Gateway",
                desc: "Certified end-to-end encryption for debit/credit transfers and cash-on-delivery."
              },
              {
                icon: <ShoppingBag className="text-indigo-400" size={14} />,
                title: "100% Buyer Protection",
                desc: "Full money-back coverage and hassle-free returns on damaged items."
              }
            ].map((benefit, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.025, x: 8, backgroundColor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(79, 70, 229, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{benefit.title}</h4>
                  <p className="text-slate-400 text-[10px] leading-relaxed mt-0.5">{benefit.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Minimal Footer */}
        <div className="text-[10px] text-slate-500 z-10">
          © 2026 CommerceIQ. Real-time Consumer Commerce.
        </div>
      </div>

      {/* RIGHT SIDE PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white overflow-y-auto h-screen">
        <motion.div 
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-[420px] flex flex-col gap-6"
        >
          {/* Back to Home Button */}
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors border-0 bg-transparent cursor-pointer self-start -ml-1 text-[11px] font-bold"
          >
            <ArrowLeft size={13} /> Back to Catalog Store
          </button>

          {/* Quick-switch tab selection */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
            <button
              onClick={() => { setMode("login"); setErrorMsg(""); }}
              className={`flex-1 py-2 text-center rounded-lg font-bold transition-all border-0 cursor-pointer ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("register_buyer"); setErrorMsg(""); }}
              className={`flex-1 py-2 text-center rounded-lg font-bold transition-all border-0 cursor-pointer ${mode === "register_buyer" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Register
            </button>
          </div>

          {registerSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-4 animate-fade-in">
              <CheckCircle2 size={36} className="text-emerald-500" />
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Account Created!</h3>
                <p className="text-slate-500 text-[10px] leading-relaxed mt-1">
                  Your retail buyer profile was successfully registered. You can now sign in and purchase items instantly.
                </p>
              </div>
              <button
                onClick={() => { setRegisterSuccess(false); setMode("login"); }}
                className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg border-0 cursor-pointer transition-colors shadow-sm"
              >
                Back to Sign In
              </button>
            </div>
          ) : mode === "login" ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-black text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>Buyer Sign In</h2>
                <p className="text-slate-400 mt-0.5">Please sign in to complete your purchase.</p>
              </div>

              {/* Prefill Demonstration Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                <span className="text-[10px] text-[#4F46E5] font-extrabold uppercase tracking-wider flex items-center gap-1"><Sparkles size={11} /> 1-Click Fast Buyer Auth</span>
                <motion.button
                  type="button"
                  onClick={() => handlePrefill("buyer")}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  animate={{ boxShadow: ["0 0 0 0 rgba(79,70,229,0.1)", "0 0 10px 3px rgba(79,70,229,0.3)", "0 0 0 0 rgba(79,70,229,0.1)"] }}
                  transition={{ boxShadow: { repeat: Infinity, duration: 2.2, ease: "easeInOut" } }}
                  className="w-full py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold transition-all cursor-pointer text-[10px] text-slate-600 hover:text-[#4F46E5] hover:border-[#4F46E5]/40"
                >
                  B2C Buyer Portal Login
                </motion.button>
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }} 
                    exit={{ opacity: 0, height: 0 }} 
                    className="bg-rose-50 border border-rose-200 text-rose-600 px-3.5 py-2 rounded-xl text-[10px] font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse"
                  >
                    <AlertCircle size={12} /> {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Form */}
              <form onSubmit={handleSubmitLogin} autoComplete="off" className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={13} /></span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="buyer@gmail.com"
                      autoComplete="off"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5] transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Password</label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
                    >
                      {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, backgroundColor: "#4338CA" }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-[11px] uppercase rounded-lg border-0 shadow-sm cursor-pointer transition-colors mt-2"
                >
                  Sign In to Account
                </motion.button>
              </form>
            </div>
          ) : (
            /* Buyer Registration Form */
            <div className="flex flex-col gap-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>Create Buyer Account</h2>
                <p className="text-slate-400 mt-0.5">Please sign up to configure checkout settings.</p>
              </div>

              <form onSubmit={handleSubmitBuyerRegister} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#0F172A] font-bold uppercase tracking-wider">Store / Buyer Nickname *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Building2 size={13} /></span>
                    <input
                      type="text"
                      value={buyerStoreName}
                      onChange={(e) => setBuyerStoreName(e.target.value)}
                      required
                      placeholder="e.g. Saif Retail Store"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Buyer Full Name *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={13} /></span>
                    <input
                      type="text"
                      value={buyerContactName}
                      onChange={(e) => setBuyerContactName(e.target.value)}
                      required
                      placeholder="e.g. Abdullah Khan"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email Address *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={13} /></span>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      required
                      placeholder="yourname@gmail.com"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Create Password *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, backgroundColor: "#4338CA" }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-[11px] uppercase rounded-lg border-0 shadow-sm cursor-pointer transition-all mt-2"
                >
                  Create Retail Profile
                </motion.button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
