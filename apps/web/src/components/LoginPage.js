import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Shield,
  User,
  Building2,
  ArrowLeft,
  CheckCircle2,
  Phone,
  MapPin,
  Search,
  Loader2,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import PortalSelector from "@/components/PortalSelector";
import { useStore } from "@/lib/store";
export default function LoginPage({
  onLogin,
  initialMode = "login",
  onBackToLanding
}) {
  const { addNotification, setCurrentUser } = useStore();
  const [mode, setMode] = useState(initialMode === "register" ? "register_distributor" : initialMode);
  const [portal, setPortal] = useState("buyer");
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("demo@commerceiq.com");
  const [password, setPassword] = useState("demopassword");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [ntnCode, setNtnCode] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [warehouseRegion, setWarehouseRegion] = useState("wh-1");
  const [creditRequest, setCreditRequest] = useState("500000");
  const [buyerStoreName, setBuyerStoreName] = useState("");
  const [buyerContactName, setBuyerContactName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerRegion, setBuyerRegion] = useState("wh-1");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [regPassword, setRegPassword] = useState("");

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
    e.preventDefault();
    if (!email || !password) return;
    setErrorMsg("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, portal }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCurrentUser(data.user);
        onLogin(portal);
      } else {
        setErrorMsg(data.message || "Invalid email or password.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to authentication service.");
    }
  };

  const handlePrefill = (role) => {
    setErrorMsg("");
    if (role === "admin") {
      setEmail("saif@commerceiq.com");
      setPortal("admin");
    } else if (role === "distributor") {
      setEmail("asim@commerceiq.com");
      setPortal("distributor");
    } else {
      setEmail("demo@commerceiq.com");
      setPortal("buyer");
    }
    setPassword("demopassword");
  };

  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    if (!businessName || !contactName || !regEmail || !regPassword) return;
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
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        addNotification({
          title: "B2B Partnership Registration Applied",
          message: `B2B partnership requested by ${businessName} (Contact: ${contactName}).`,
          severity: "INFO",
          trigger_type: "CREDIT_LIMIT_BREACH"
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
  return /* @__PURE__ */ jsxs("div", {
    className: "min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full pointer-events-none blur-[100px]",
        style: {
          background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)"
        }
      }
    ),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full pointer-events-none blur-[100px]",
        style: {
          background: "radial-gradient(circle, rgba(14,165,233,0.04) 0%, transparent 70%)"
        }
      }
    ),
    /* @__PURE__ */ jsxs("div", {
      className: "bg-white border border-[#E2E8F0] rounded-3xl shadow-xl w-full max-w-[460px] p-8 sm:p-10 z-10 flex flex-col gap-6 animate-card-entrance", children: [
        onBackToLanding && /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: onBackToLanding,
            className: "flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F172A] transition-colors border-0 bg-transparent cursor-pointer self-start -mt-2 -ml-2 p-2 rounded-lg hover:bg-[#F8FAFC]",
            children: [
            /* @__PURE__ */ jsx(ArrowLeft, { size: 14 }),
              " Back to info"
            ]
          }
        ),
      /* @__PURE__ */ jsx("div", {
          className: "flex justify-center -mt-2", children: /* @__PURE__ */ jsx(
            "div",
            {
              className: "w-12 h-12 bg-[#4F46E5] rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-[0_4px_12px_rgba(79,70,229,0.2)]",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "IQ"
            }
          )
        }),
        mode === "login" ? /* @__PURE__ */ jsxs(Fragment, {
          children: [
        /* @__PURE__ */ jsxs("div", {
            className: "text-center", children: [
          /* @__PURE__ */ jsx(
              "h1",
              {
                className: "text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight",
                style: { fontFamily: "Outfit, sans-serif" },
                children: "Sign in to CommerceIQ"
              }
            ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Enter credentials or select a fast prefill demo user" })
            ]
          }),
        /* @__PURE__ */ jsxs("div", {
            className: "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col gap-2", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[9px] text-[#4F46E5] font-bold uppercase tracking-wider", children: "Fast-track Demo Logins" }),
          /* @__PURE__ */ jsxs("div", {
              className: "grid grid-cols-3 gap-1.5", children: [
            /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handlePrefill("admin"),
                  className: "px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-[10px] font-bold rounded-lg border border-[#C7D2FE] transition-all cursor-pointer",
                  children: "Super Admin"
                }
              ),
            /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handlePrefill("distributor"),
                  className: "px-2 py-1.5 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100 transition-all cursor-pointer",
                  children: "Distributor"
                }
              ),
            /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handlePrefill("buyer"),
                  className: "px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 transition-all cursor-pointer",
                  children: "B2B Buyer"
                }
              )
              ]
            })
            ]
          }),
        errorMsg && /* @__PURE__ */ jsx("div", {
          className: "bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-[11px] font-medium text-center animate-fade-up -mt-2",
          children: errorMsg
        }),
        /* @__PURE__ */ jsxs(
            "form",
            {
              onSubmit: handleSubmitLogin,
              className: "flex flex-col gap-4 text-xs",
              children: [
              /* @__PURE__ */ jsxs("div", {
                className: "flex flex-col gap-1.5", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[11px] font-semibold text-[#475569]", children: "Select Portal Context" }),
                /* @__PURE__ */ jsx(PortalSelector, { value: portal, onChange: setPortal })
                ]
              }),
              /* @__PURE__ */ jsxs("div", {
                className: "flex flex-col gap-1.5", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[11px] font-semibold text-[#475569]", children: "Email Address" }),
                /* @__PURE__ */ jsxs("div", {
                  className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(Mail, { size: 15 }) }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                      type: "email",
                      placeholder: "you@company.com",
                      value: email,
                      onChange: (e) => setEmail(e.target.value),
                      required: true
                    }
                  )
                  ]
                })
                ]
              }),
              /* @__PURE__ */ jsxs("div", {
                className: "flex flex-col gap-1.5", children: [
                /* @__PURE__ */ jsxs("div", {
                  className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-[11px] font-semibold text-[#475569]", children: "Password" }),
                  /* @__PURE__ */ jsx(
                    "a",
                    {
                      href: "#",
                      className: "text-[10px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors",
                      children: "Forgot Password?"
                    }
                  )
                  ]
                }),
                /* @__PURE__ */ jsxs("div", {
                  className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(Lock, { size: 15 }) }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: "w-full pl-9 pr-9 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                      type: showPwd ? "text" : "password",
                      placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
                      value: password,
                      onChange: (e) => setPassword(e.target.value),
                      required: true
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setShowPwd((p) => !p),
                      className: "absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors border-0 bg-transparent cursor-pointer",
                      children: showPwd ? /* @__PURE__ */ jsx(EyeOff, { size: 15 }) : /* @__PURE__ */ jsx(Eye, { size: 15 })
                    }
                  )
                  ]
                })
                ]
              }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "submit",
                  className: "w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-lg mt-2 cursor-pointer border-0 shadow-sm transition-all",
                  children: "Sign In"
                }
              )
              ]
            }
          ),
        /* @__PURE__ */ jsxs("div", {
            className: "text-center text-xs text-[#64748B] mt-2 flex flex-col gap-2", children: [
              /* @__PURE__ */ jsxs("div", {
                children: [
                  "Register as Distributor?",
                  " ",
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => setMode("register_distributor"),
                      className: "font-semibold text-[#4F46E5] hover:underline border-0 bg-transparent cursor-pointer",
                      children: "Register B2B Account"
                    }
                  )
                ]
              }),
              /* @__PURE__ */ jsxs("div", {
                children: [
                  "Register as Buyer?",
                  " ",
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => setMode("register_buyer"),
                      className: "font-semibold text-[#10B981] hover:underline border-0 bg-transparent cursor-pointer",
                      children: "Register Buyer Account"
                    }
                  )
                ]
              }),
              /* @__PURE__ */ jsxs("div", {
                className: "mt-2 pt-2 border-t border-[#E2E8F0]",
                children: [
                  "Track B2B application?",
                  " ",
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => {
                        setErrorMsg("");
                        setMode("check_status");
                      },
                      className: "font-semibold text-[#4F46E5] hover:underline border-0 bg-transparent cursor-pointer",
                      children: "Check Application Status"
                    }
                  )
                ]
              })
            ]
          })
          ]
        }) : mode === "check_status" ? /* @__PURE__ */ jsxs(Fragment, {
          children: [
            /* @__PURE__ */ jsxs("div", {
              className: "text-center", children: [
                /* @__PURE__ */ jsx(
                  "h1",
                  {
                    className: "text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight",
                    style: { fontFamily: "Outfit, sans-serif" },
                    children: "Track B2B Application"
                  }
                ),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Enter your registered business email to check approval progress." })
              ]
            }),
            /* @__PURE__ */ jsxs(
              "form",
              {
                onSubmit: handleCheckStatus,
                className: "flex flex-col gap-3 text-xs",
                children: [
                  /* @__PURE__ */ jsxs("div", {
                    className: "flex flex-col gap-1.5", children: [
                      /* @__PURE__ */ jsx("label", { className: "text-[11px] font-semibold text-[#475569]", children: "Business Email" }),
                      /* @__PURE__ */ jsxs("div", {
                        className: "relative", children: [
                          /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(Mail, { size: 15 }) }),
                          /* @__PURE__ */ jsx(
                            "input",
                            {
                              className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                              type: "email",
                              placeholder: "b2b@company.com",
                              value: statusEmail,
                              onChange: (e) => setStatusEmail(e.target.value),
                              required: true
                            }
                          )
                        ]
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "submit",
                      disabled: statusLoading,
                      className: "w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-lg mt-1 cursor-pointer border-0 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70",
                      children: [
                        statusLoading ? /* @__PURE__ */ jsx(Loader2, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ jsx(Search, { size: 14 }),
                        "Find Application"
                      ]
                    }
                  )
                ]
              }
            ),
            statusError && /* @__PURE__ */ jsxs("div", {
              className: "bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-[11px] font-medium flex items-start gap-2.5 animate-fade-up",
              children: [
                /* @__PURE__ */ jsx(AlertCircle, { size: 15, className: "mt-0.5 shrink-0" }),
                /* @__PURE__ */ jsx("span", { children: statusError })
              ]
            }),
            statusResult && /* @__PURE__ */ jsxs("div", {
              className: "bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4 flex flex-col gap-4 animate-fade-up",
              children: [
                /* @__PURE__ */ jsxs("div", {
                  className: "border-b border-[#E2E8F0] pb-2.5 flex flex-col gap-0.5",
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider", children: "Application Profile" }),
                    /* @__PURE__ */ jsx("h4", { className: "font-bold text-xs text-[#0F172A]", children: statusResult.business_name }),
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#64748B]", children: statusResult.email })
                  ]
                }),
                /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-4",
                  children: [
                    /* @__PURE__ */ jsxs("div", {
                      className: "flex gap-3",
                      children: [
                        /* @__PURE__ */ jsx("div", {
                          className: "w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200 text-xs font-semibold",
                          children: "1"
                        }),
                        /* @__PURE__ */ jsxs("div", {
                          className: "flex flex-col gap-0.5",
                          children: [
                            /* @__PURE__ */ jsx("h5", { className: "font-bold text-xs text-[#0F172A]", children: "B2B Application Submitted" }),
                            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B]", children: "Wholesale license detail received." })
                          ]
                        })
                      ]
                    }),
                    /* @__PURE__ */ jsxs("div", {
                      className: "flex gap-3",
                      children: [
                        /* @__PURE__ */ jsx("div", {
                          className: `w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                            statusResult.status === "PENDING_APPROVAL"
                              ? "bg-blue-100 text-blue-600 border border-blue-200"
                              : "bg-emerald-100 text-emerald-600 border border-emerald-200"
                          }`,
                          children: statusResult.status === "PENDING_APPROVAL" ? /* @__PURE__ */ jsx(Loader2, { size: 10, className: "animate-spin" }) : "2"
                        }),
                        /* @__PURE__ */ jsxs("div", {
                          className: "flex flex-col gap-0.5",
                          children: [
                            /* @__PURE__ */ jsx("h5", { className: "font-bold text-xs text-[#0F172A]", children: "Under Review" }),
                            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B]", children: "Verification of warehouse and credit limits." })
                          ]
                        })
                      ]
                    }),
                    /* @__PURE__ */ jsxs("div", {
                      className: "flex gap-3",
                      children: [
                        /* @__PURE__ */ jsx("div", {
                          className: `w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                            statusResult.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
                              : statusResult.status === "REJECTED"
                              ? "bg-rose-100 text-rose-600 border border-rose-200"
                              : "bg-slate-100 text-[#94A3B8] border border-slate-200"
                          }`,
                          children: statusResult.status === "ACTIVE" ? /* @__PURE__ */ jsx(CheckCircle2, { size: 12 }) : (statusResult.status === "REJECTED" ? /* @__PURE__ */ jsx(XCircle, { size: 12 }) : "3")
                        }),
                        /* @__PURE__ */ jsxs("div", {
                          className: "flex flex-col gap-0.5",
                          children: [
                            /* @__PURE__ */ jsx("h5", {
                              className: `font-bold text-xs ${
                                statusResult.status === "ACTIVE"
                                  ? "text-emerald-600"
                                  : statusResult.status === "REJECTED"
                                  ? "text-rose-600"
                                  : "text-[#64748B]"
                              }`,
                              children: statusResult.status === "ACTIVE"
                                ? "Application Approved!"
                                : statusResult.status === "REJECTED"
                                ? "Application Rejected"
                                : "Outcome Pending"
                            }),
                            /* @__PURE__ */ jsx("p", {
                              className: "text-[10px] text-[#64748B] leading-relaxed",
                              children: statusResult.status === "ACTIVE"
                                ? "Your distributor portal is fully active. You can now sign in using your credentials."
                                : statusResult.status === "REJECTED"
                                ? "Unfortunately, your application was not approved. Please contact wholesale support for inquiries."
                                : "Your status will be updated as soon as review completes."
                            })
                          ]
                        })
                      ]
                    })
                  ]
                }),
                statusResult.status === "ACTIVE" && /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => {
                      setEmail(statusResult.email);
                      setPortal("distributor");
                      setMode("login");
                    },
                    className: "w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer border-0 shadow-sm transition-all mt-1",
                    children: "Go to Login"
                  }
                )
              ]
            }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  setMode("login");
                  setStatusResult(null);
                  setStatusError("");
                },
                className: "text-center text-xs font-semibold text-[#4F46E5] hover:underline border-0 bg-transparent cursor-pointer mt-1",
                children: "Back to Sign In"
              }
            )
          ]
        }) : /* @__PURE__ */ jsx(Fragment, {
          children: registerSuccess ? /* @__PURE__ */ jsxs("div", {
            className: "text-center flex flex-col items-center gap-4 py-6 animate-fade-up", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 bg-emerald-50 text-[#10B981] rounded-2xl flex items-center justify-center border border-emerald-100", children: /* @__PURE__ */ jsx(CheckCircle2, { size: 24 }) }),
        /* @__PURE__ */ jsxs("div", {
              children: [
          /* @__PURE__ */ jsx(
                "h3",
                {
                  className: "text-lg font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: mode === "register_buyer" ? "Buyer Account Created" : "Partnership Request Received"
                }
              ),
          /* @__PURE__ */ jsxs("p", {
                className: "text-xs text-[#64748B] mt-1.5 leading-relaxed", children: mode === "register_buyer" ? [
                  "Your buyer profile for **",
                  buyerStoreName,
                  "** has been successfully registered. You can now log in using your credentials to access the wholesale catalog."
                ] : [
                  "We have received your application for **",
                  businessName,
                  "**. An Admin representative will review your partnership request shortly."
                ]
              })
              ]
            }),
        /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  setRegisterSuccess(false);
                  setMode("login");
                },
                className: "mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border-0 cursor-pointer transition-colors",
                children: "Return to Login"
              }
            )
            ]
          }) : mode === "register_buyer" ? /* @__PURE__ */ jsxs(Fragment, {
            children: [
        /* @__PURE__ */ jsxs("div", {
              className: "text-center", children: [
          /* @__PURE__ */ jsx(
                "h1",
                {
                  className: "text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "Register Buyer Account"
                }
              ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Create a buyer profile to view catalog and place orders" })
              ]
            }),
        /* @__PURE__ */ jsxs(
              "form",
              {
                onSubmit: handleSubmitBuyerRegister,
                className: "flex flex-col gap-4 text-xs",
                children: [
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Retail Store / Business Name *" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(Building2, { size: 14 }) }),
                  /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#10B981] transition-colors",
                        placeholder: "e.g. Al-Madina Super Mart",
                        value: buyerStoreName,
                        onChange: (e) => setBuyerStoreName(e.target.value),
                        required: true
                      }
                    )
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Contact Person Name *" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(User, { size: 14 }) }),
                  /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#10B981] transition-colors",
                        placeholder: "e.g. Muhammad Ali",
                        value: buyerContactName,
                        onChange: (e) => setBuyerContactName(e.target.value),
                        required: true
                      }
                    )
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Email Address *" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(Mail, { size: 14 }) }),
                  /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#10B981] transition-colors",
                        type: "email",
                        placeholder: "buyer@store.com",
                        value: buyerEmail,
                        onChange: (e) => setBuyerEmail(e.target.value),
                        required: true
                      }
                    )
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Create Password *" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(Lock, { size: 14 }) }),
                  /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#10B981] transition-colors",
                        type: "password",
                        placeholder: "••••••••",
                        value: regPassword,
                        onChange: (e) => setRegPassword(e.target.value),
                        required: true
                      }
                    )
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "submit",
                    className: "w-full py-3 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-lg mt-2 cursor-pointer border-0 shadow-sm transition-all",
                    children: "Submit Buyer Application"
                  }
                )
                ]
              }
            ),
        /* @__PURE__ */ jsxs("div", {
              className: "text-center text-xs text-[#64748B] mt-2", children: [
                "Already have a registered account?",
                " ",
          /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setMode("login"),
                    className: "font-semibold text-[#4F46E5] hover:underline border-0 bg-transparent cursor-pointer",
                    children: "Sign In instead"
                  }
                )
              ]
            })
            ]
          }) : /* @__PURE__ */ jsxs(Fragment, {
            children: [
        /* @__PURE__ */ jsxs("div", {
              className: "text-center", children: [
          /* @__PURE__ */ jsx(
                "h1",
                {
                  className: "text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "Register B2B Partnership"
                }
              ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Submit wholesale license detail to establish warehouse links" })
              ]
            }),
        /* @__PURE__ */ jsxs(
              "form",
              {
                onSubmit: handleSubmitRegister,
                className: "flex flex-col gap-4 text-xs",
                children: [
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Business Company Name *" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(Building2, { size: 14 }) }),
                  /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        placeholder: "e.g. Lahore Electronics Hub",
                        value: businessName,
                        onChange: (e) => setBusinessName(e.target.value),
                        required: true
                      }
                    )
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Contact Person Name *" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(User, { size: 14 }) }),
                  /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        placeholder: "e.g. Kashif Raza",
                        value: contactName,
                        onChange: (e) => setContactName(e.target.value),
                        required: true
                      }
                    )
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Email address *" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(Mail, { size: 14 }) }),
                  /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        type: "email",
                        placeholder: "b2b@company.com",
                        value: regEmail,
                        onChange: (e) => setRegEmail(e.target.value),
                        required: true
                      }
                    )
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Create Password *" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "relative", children: [
                  /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]", children: /* @__PURE__ */ jsx(Lock, { size: 14 }) }),
                  /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        type: "password",
                        placeholder: "••••••••",
                        value: regPassword,
                        onChange: (e) => setRegPassword(e.target.value),
                        required: true
                      }
                    )
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "submit",
                    className: "w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-lg mt-2 cursor-pointer border-0 shadow-sm transition-all",
                    children: "Submit B2B Application"
                  }
                )
                ]
              }
            ),
        /* @__PURE__ */ jsxs("div", {
              className: "text-center text-xs text-[#64748B] mt-2", children: [
                "Already have a registered account?",
                " ",
          /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setMode("login"),
                    className: "font-semibold text-[#4F46E5] hover:underline border-0 bg-transparent cursor-pointer",
                    children: "Sign In instead"
                  }
                )
              ]
            })
            ]
          })
        }),
      /* @__PURE__ */ jsxs("div", {
          className: "flex items-center justify-center gap-1.5 text-[10px] text-[#94A3B8] pt-2 border-t border-[#E2E8F0] mt-1", children: [
        /* @__PURE__ */ jsx(Shield, { size: 12 }),
        /* @__PURE__ */ jsx("span", { children: "Secured wholesale pipeline \xB7 CommerceIQ" })
          ]
        })
      ]
    })
    ]
  });
}
