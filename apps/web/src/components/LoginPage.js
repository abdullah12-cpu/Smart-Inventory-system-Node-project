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
  CheckCircle2
} from "lucide-react";
import PortalSelector from "@/components/PortalSelector";
import { useStore } from "@/lib/store";
export default function LoginPage({
  onLogin,
  initialMode = "login",
  onBackToLanding
}) {
  const { addNotification } = useStore();
  const [mode, setMode] = useState(initialMode);
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
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const handleSubmitLogin = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    onLogin(portal);
  };
  const handlePrefill = (role) => {
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
  const handleSubmitRegister = (e) => {
    e.preventDefault();
    if (!businessName || !contactName || !regEmail) return;
    addNotification({
      title: "B2B Registration Applied",
      message: `B2B partnership requested by ${businessName} (Contact: ${contactName}). Region: ${warehouseRegion === "wh-1" ? "Karachi" : "Lahore"}. Credit limit request: Rs ${parseInt(creditRequest).toLocaleString()}.`,
      severity: "INFO",
      trigger_type: "CREDIT_LIMIT_BREACH"
    });
    setRegisterSuccess(true);
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300", children: [
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
    /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-3xl shadow-xl w-full max-w-[460px] p-8 sm:p-10 z-10 flex flex-col gap-6 animate-card-entrance", children: [
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
      /* @__PURE__ */ jsx("div", { className: "flex justify-center -mt-2", children: /* @__PURE__ */ jsx(
        "div",
        {
          className: "w-12 h-12 bg-[#4F46E5] rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-[0_4px_12px_rgba(79,70,229,0.2)]",
          style: { fontFamily: "Outfit, sans-serif" },
          children: "IQ"
        }
      ) }),
      mode === "login" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsx(
            "h1",
            {
              className: "text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "Sign in to CommerceIQ"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Enter credentials or select a fast prefill demo user" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col gap-2", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[9px] text-[#4F46E5] font-bold uppercase tracking-wider", children: "Fast-track Demo Logins" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-1.5", children: [
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
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "form",
          {
            onSubmit: handleSubmitLogin,
            className: "flex flex-col gap-4 text-xs",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[11px] font-semibold text-[#475569]", children: "Select Portal Context" }),
                /* @__PURE__ */ jsx(PortalSelector, { value: portal, onChange: setPortal })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[11px] font-semibold text-[#475569]", children: "Email Address" }),
                /* @__PURE__ */ jsxs("div", { className: "relative", children: [
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
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-[11px] font-semibold text-[#475569]", children: "Password" }),
                  /* @__PURE__ */ jsx(
                    "a",
                    {
                      href: "#",
                      className: "text-[10px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors",
                      children: "Forgot Password?"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "relative", children: [
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
                ] })
              ] }),
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
        /* @__PURE__ */ jsxs("div", { className: "text-center text-xs text-[#64748B] mt-2", children: [
          "Apply for distributor or buyer access?",
          " ",
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setMode("register"),
              className: "font-semibold text-[#4F46E5] hover:underline border-0 bg-transparent cursor-pointer",
              children: "Register B2B Account"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ jsx(Fragment, { children: registerSuccess ? /* @__PURE__ */ jsxs("div", { className: "text-center flex flex-col items-center gap-4 py-6 animate-fade-up", children: [
        /* @__PURE__ */ jsx("div", { className: "w-12 h-12 bg-emerald-50 text-[#10B981] rounded-2xl flex items-center justify-center border border-emerald-100", children: /* @__PURE__ */ jsx(CheckCircle2, { size: 24 }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "h3",
            {
              className: "text-lg font-bold text-[#0F172A]",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "Partnership Request Received"
            }
          ),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-[#64748B] mt-1.5 leading-relaxed", children: [
            "We have received your application for **",
            businessName,
            "**. An Admin representative will review your credit request of **Rs",
            " ",
            parseInt(creditRequest).toLocaleString(),
            "** shortly."
          ] })
        ] }),
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
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsx(
            "h1",
            {
              className: "text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "Register B2B Partnership"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Submit wholesale license detail to establish warehouse links" })
        ] }),
        /* @__PURE__ */ jsxs(
          "form",
          {
            onSubmit: handleSubmitRegister,
            className: "flex flex-col gap-4 text-xs",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Business Company Name *" }),
                /* @__PURE__ */ jsxs("div", { className: "relative", children: [
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
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Contact Person Name *" }),
                /* @__PURE__ */ jsxs("div", { className: "relative", children: [
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
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "NTN Code *" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: "w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                      placeholder: "e.g. 772819-A",
                      value: ntnCode,
                      onChange: (e) => setNtnCode(e.target.value),
                      required: true
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Email address *" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: "w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                      type: "email",
                      placeholder: "b2b@company.com",
                      value: regEmail,
                      onChange: (e) => setRegEmail(e.target.value),
                      required: true
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Primary Depot Link" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      className: "w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                      value: warehouseRegion,
                      onChange: (e) => setWarehouseRegion(e.target.value),
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "wh-1", children: "Karachi Depot" }),
                        /* @__PURE__ */ jsx("option", { value: "wh-2", children: "Lahore Depot" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold uppercase tracking-wider", children: "Credit Request (Rs)" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: "w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                      type: "number",
                      value: creditRequest,
                      onChange: (e) => setCreditRequest(e.target.value)
                    }
                  )
                ] })
              ] }),
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
        /* @__PURE__ */ jsxs("div", { className: "text-center text-xs text-[#64748B] mt-2", children: [
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
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-1.5 text-[10px] text-[#94A3B8] pt-2 border-t border-[#E2E8F0] mt-1", children: [
        /* @__PURE__ */ jsx(Shield, { size: 12 }),
        /* @__PURE__ */ jsx("span", { children: "Secured wholesale pipeline \xB7 CommerceIQ" })
      ] })
    ] })
  ] });
}
