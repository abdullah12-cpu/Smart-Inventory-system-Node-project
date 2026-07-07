import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  LayoutDashboard,
  Box,
  Users,
  Settings,
  LogOut,
  Check,
  ChevronDown,
  Plus,
  MapPin,
  Database
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/data";
import {
  OrderStatusBadge,
  InvoiceStatusBadge,
  LatePaymentRiskBadge,
  ReliabilityRating,
  Badge
} from "@/components/ui";
import AdminDashboard from "./admin/AdminDashboard";
const AVAILABLE_USER_ROLES = [
  {
    user_id: "u-1",
    first_name: "Saif",
    last_name: "Shahzad",
    email: "saif@commerceiq.com",
    phone: "+92 300 1234567",
    profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop",
    role_name: "Super Admin",
    is_active: true
  }
];
function PaymentMethodIcon({ method }) {
  if (method === "JAZZCASH") {
    return /* @__PURE__ */ jsx("span", { className: "inline-flex items-center justify-center font-extrabold text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded scale-90 border border-amber-600", children: "JazzCash" });
  }
  if (method === "EASYPAISA") {
    return /* @__PURE__ */ jsx("span", { className: "inline-flex items-center justify-center font-extrabold text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded scale-90 border border-emerald-700", children: "EasyPaisa" });
  }
  return /* @__PURE__ */ jsx("span", { className: "inline-flex items-center justify-center font-semibold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded", children: method.replace("_", " ") });
}
export default function AdminPortal({ onLogout }) {
  const {
    notifications,
    currentUser,
    setCurrentUser,
    markNotificationRead,
    orders,
    invoices,
    payments,
    suppliers,
    stockMovements,
    auditLogs,
    recordPaymentAllocation,
    dispatchOrder,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    approveOrder,
    quotations,
    updateQuotationStatus
  } = useStore();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [notifBounce, setNotifBounce] = useState(false);
  const [notifFilter, setNotifFilter] = useState("ALL");
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierReliabilityFilter, setSupplierReliabilityFilter] = useState("all");
  const [supplierLeadTimeFilter, setSupplierLeadTimeFilter] = useState("all");
  const [supplierCountryFilter, setSupplierCountryFilter] = useState("all");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [ordersTypeFilter, setOrdersTypeFilter] = useState("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [supplierToast, setSupplierToast] = useState("");
  const [sCompany, setSCompany] = useState("");
  const [sContact, setSContact] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sCity, setSCity] = useState("");
  const [sCountry, setSCountry] = useState("Pakistan");
  const [sLeadTime, setSLeadTime] = useState("7");
  const [sReliability, setSReliability] = useState("80");
  const [allocInvoiceId, setAllocInvoiceId] = useState("");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocMethod, setAllocMethod] = useState("JAZZCASH");
  const [allocRef, setAllocRef] = useState("");
  const [allocSuccess, setAllocSuccess] = useState("");
  const notifRef = useRef(null);
  const roleRef = useRef(null);
  const unreadNotifications = notifications.filter((n) => !n.is_read);
  useEffect(() => {
    if (unreadNotifications.length > 0) {
      setNotifBounce(true);
      const timer = setTimeout(() => setNotifBounce(false), 600);
      return () => clearTimeout(timer);
    }
  }, [notifications.length]);
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target))
        setRoleSwitcherOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.is_read) markNotificationRead(n.notification_id);
    });
  };
  const canAccessSuppliers = currentUser.role_name === "Super Admin" || currentUser.role_name === "Inventory Manager" || currentUser.role_name === "Analyst";
  const canAccessBilling = currentUser.role_name === "Super Admin" || currentUser.role_name === "Accountant";
  useEffect(() => {
    if (activeTab === "suppliers" && !canAccessSuppliers) {
      setActiveTab("dashboard");
    }
    if (activeTab === "orders" && !canAccessBilling) {
      setActiveTab("dashboard");
    }
  }, [currentUser.role_name, activeTab, canAccessSuppliers, canAccessBilling]);
  useEffect(() => {
    const openInvoices = invoices.filter((i) => i.status !== "PAID");
    if (openInvoices.length > 0 && !allocInvoiceId) {
      setAllocInvoiceId(openInvoices[0].invoice_id);
    }
  }, [invoices, allocInvoiceId]);

  const handleApproveOrder = async (orderId) => {
    const success = await approveOrder(orderId);
    if (success) {
      alert("Order approved successfully!");
    } else {
      alert("Failed to approve order.");
    }
  };

  const handleShipOrder = async (orderId) => {
    try {
      await dispatchOrder(orderId);
      alert("Order shipped successfully! Invoice generated.");
    } catch (e) {
      alert("Failed to ship order.");
    }
  };
  useEffect(() => {
    if (allocInvoiceId) {
      const selectedInv = invoices.find((i) => i.invoice_id === allocInvoiceId);
      if (selectedInv) {
        const remaining = selectedInv.total_amount - selectedInv.amount_paid;
        setAllocAmount(remaining.toString());
        setAllocRef(`TXN-${Math.floor(1e5 + Math.random() * 9e5)}`);
      }
    }
  }, [allocInvoiceId, invoices]);
  const handleRecordAllocationSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(allocAmount);
    if (isNaN(amt) || amt <= 0 || !allocInvoiceId) return;
    recordPaymentAllocation(allocInvoiceId, amt, allocMethod, allocRef);
    setAllocSuccess(
      `Payment of Rs ${amt.toLocaleString()} recorded & allocated successfully.`
    );
    setTimeout(() => setAllocSuccess(""), 4e3);
  };
  const severityStyles = {
    INFO: "border-l-4 border-blue-500 bg-blue-50/50",
    WARNING: "border-l-4 border-amber-500 bg-amber-50/50",
    CRITICAL: "border-l-4 border-rose-500 bg-rose-50/50"
  };
  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === "CRITICAL") return n.severity === "CRITICAL";
    if (notifFilter === "WARNING") return n.severity === "WARNING";
    return true;
  });
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-[#F8FAFC] overflow-hidden text-xs", children: [
    /* @__PURE__ */ jsxs("aside", { className: "w-[260px] bg-[#0F172A] flex flex-col border-r border-[#1E293B] flex-shrink-0 relative z-20", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-6 flex items-center gap-3 border-b border-[#1E293B]", children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "w-8 h-8 bg-[#4F46E5] rounded-md flex items-center justify-center text-white font-extrabold text-sm logo-box",
            style: { fontFamily: "Outfit, sans-serif" },
            children: "IQ"
          }
        ),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: "text-white font-bold text-[16px] tracking-tight block",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "CommerceIQ"
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#94A3B8] font-bold block tracking-wider uppercase mt-0.5", children: "Admin Command" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("nav", { className: "flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto relative", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("dashboard"),
            className: `sidebar-link w-full text-left border-0 bg-transparent ${activeTab === "dashboard" ? "active" : ""}`,
            children: [
              /* @__PURE__ */ jsx(LayoutDashboard, { size: 18 }),
              /* @__PURE__ */ jsx("span", { children: "Dashboard Hub" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("products"),
            className: `sidebar-link w-full text-left border-0 bg-transparent ${activeTab === "products" ? "active" : ""}`,
            children: [
              /* @__PURE__ */ jsx(Box, { size: 18 }),
              /* @__PURE__ */ jsx("span", { children: "My Products" })
            ]
          }
        ),
        canAccessSuppliers && /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("suppliers"),
            className: `sidebar-link w-full text-left border-0 bg-transparent ${activeTab === "suppliers" ? "active" : ""}`,
            children: [
              /* @__PURE__ */ jsx(Users, { size: 18 }),
              /* @__PURE__ */ jsx("span", { children: "Suppliers Directory" })
            ]
          }
        ),
        canAccessBilling && /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("orders"),
            className: `sidebar-link w-full text-left border-0 bg-transparent ${activeTab === "orders" ? "active" : ""}`,
            children: [
              /* @__PURE__ */ jsx(Database, { size: 18 }),
              /* @__PURE__ */ jsx("span", { children: "Orders & Ledgers" })
            ]
          }
        ),
        canAccessBilling && /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("negotiations"),
            className: `sidebar-link w-full text-left border-0 bg-transparent ${activeTab === "negotiations" ? "active" : ""}`,
            children: [
              /* @__PURE__ */ jsx(Database, { size: 18 }),
              /* @__PURE__ */ jsx("span", { children: "Quote Negotiations" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("settings"),
            className: `sidebar-link w-full text-left border-0 bg-transparent ${activeTab === "settings" ? "active" : ""}`,
            children: [
              /* @__PURE__ */ jsx(Settings, { size: 18 }),
              /* @__PURE__ */ jsx("span", { children: "System Settings" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-4 border-t border-[#1E293B] relative", ref: roleRef, children: [
        roleSwitcherOpen && /* @__PURE__ */ jsxs("div", { className: "absolute bottom-[calc(100%+8px)] left-4 right-4 bg-[#1E293B] border border-[#334155] rounded-xl p-2 shadow-2xl z-50 animate-dropdown text-white flex flex-col gap-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#94A3B8] font-bold px-2 py-1 uppercase tracking-wider", children: "Switch System Role" }),
          AVAILABLE_USER_ROLES.map((roleUser) => /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => {
                setCurrentUser(roleUser);
                setRoleSwitcherOpen(false);
              },
              className: `w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-colors border-0 text-left cursor-pointer text-xs text-white ${currentUser.role_name === roleUser.role_name ? "bg-[#4F46E5]" : "bg-transparent"}`,
              children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("span", { className: "font-semibold block", children: [
                    roleUser.first_name,
                    " ",
                    roleUser.last_name
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "text-[9px] text-slate-300 block", children: roleUser.role_name })
                ] }),
                currentUser.role_name === roleUser.role_name && /* @__PURE__ */ jsx(Check, { size: 14, className: "text-white" })
              ]
            },
            roleUser.user_id
          ))
        ] }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            onClick: () => setRoleSwitcherOpen(!roleSwitcherOpen),
            className: "flex items-center justify-between px-2.5 py-2 mb-3 bg-[#1E293B]/40 hover:bg-[#1E293B]/80 rounded-lg cursor-pointer border border-transparent hover:border-[#4F46E5]/40 transition-all",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 overflow-hidden", children: [
                /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: currentUser.profile_image,
                    alt: "Profile",
                    className: "w-9 h-9 rounded-full object-cover border border-[#4F46E5]"
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "overflow-hidden", children: [
                  /* @__PURE__ */ jsxs("div", { className: "text-xs font-bold text-white truncate", children: [
                    currentUser.first_name,
                    " ",
                    currentUser.last_name
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "mt-0.5", children: /* @__PURE__ */ jsx(
                    Badge,
                    {
                      text: currentUser.role_name,
                      variant: "info",
                      className: "scale-[0.8] origin-left py-0.5"
                    }
                  ) })
                ] })
              ] }),
              /* @__PURE__ */ jsx(ChevronDown, { size: 14, className: "text-[#94A3B8]" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: onLogout,
            className: "sidebar-link w-full text-[#EF4444] hover:bg-red-950/20 hover:text-[#EF4444] border-0 bg-transparent",
            children: [
              /* @__PURE__ */ jsx(LogOut, { size: 16 }),
              " Log out"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxs("header", { className: "h-[70px] bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 flex-shrink-0 relative z-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative w-[320px]", children: [
          /* @__PURE__ */ jsx(
            Search,
            {
              size: 16,
              className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              className: "w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] transition-colors",
              placeholder: "Search catalog, suppliers, or reference...",
              value: search,
              onChange: (e) => setSearch(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative", ref: notifRef, children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  setNotifOpen(!notifOpen);
                },
                className: `relative w-9 h-9 flex items-center justify-center border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors cursor-pointer ${notifOpen ? "bg-[#F8FAFC] border-[#4F46E5]" : ""}`,
                children: [
                  /* @__PURE__ */ jsx(
                    Bell,
                    {
                      size: 18,
                      className: notifBounce ? "animate-bell-bounce" : ""
                    }
                  ),
                  unreadNotifications.length > 0 && /* @__PURE__ */ jsx("span", { className: "absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none", children: unreadNotifications.length })
                ]
              }
            ),
            notifOpen && /* @__PURE__ */ jsxs("div", { className: "absolute right-0 top-[calc(100%+6px)] w-[360px] bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden animate-dropdown", children: [
              /* @__PURE__ */ jsxs("div", { className: "p-4 border-b border-[#E2E8F0] flex items-center justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-[#0F172A]", children: "Notifications Center" }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: handleMarkAllRead,
                    className: "text-[10px] font-bold text-[#4F46E5] hover:text-[#4338CA] transition-colors border-0 bg-transparent cursor-pointer",
                    children: "Mark all as read"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 bg-slate-50 border-b border-[#E2E8F0] flex gap-2", children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setNotifFilter("ALL"),
                    className: `px-2 py-0.5 rounded text-[9px] font-bold border-0 cursor-pointer ${notifFilter === "ALL" ? "bg-[#4F46E5] text-white" : "bg-transparent text-slate-500 hover:text-slate-900"}`,
                    children: "ALL"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setNotifFilter("CRITICAL"),
                    className: `px-2 py-0.5 rounded text-[9px] font-bold border-0 cursor-pointer ${notifFilter === "CRITICAL" ? "bg-red-500 text-white" : "bg-transparent text-slate-500 hover:text-slate-900"}`,
                    children: "CRITICAL"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setNotifFilter("WARNING"),
                    className: `px-2 py-0.5 rounded text-[9px] font-bold border-0 cursor-pointer ${notifFilter === "WARNING" ? "bg-amber-500 text-white" : "bg-transparent text-slate-500 hover:text-slate-900"}`,
                    children: "WARNING"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("div", { className: "max-h-[300px] overflow-y-auto divide-y divide-[#E2E8F0]", children: filteredNotifications.length === 0 ? /* @__PURE__ */ jsx("div", { className: "p-8 text-center text-xs text-[#94A3B8] font-medium", children: "No alerts matches this filter criteria." }) : filteredNotifications.map((n) => /* @__PURE__ */ jsxs(
                "div",
                {
                  onClick: () => markNotificationRead(n.notification_id),
                  className: `p-4 transition-colors hover:bg-[#F8FAFC] cursor-pointer ${n.is_read ? "opacity-60" : ""} ${severityStyles[n.severity]}`,
                  children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start gap-2", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-[#0F172A]", children: n.title }),
                      /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#94A3B8] whitespace-nowrap", children: formatDate(n.created_at) })
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-[11px] text-[#64748B] mt-1 leading-normal", children: n.message }),
                    /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5 mt-2", children: [
                      /* @__PURE__ */ jsx(
                        Badge,
                        {
                          text: n.trigger_type,
                          variant: "neutral",
                          className: "scale-90 origin-left"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        Badge,
                        {
                          text: n.severity,
                          variant: n.severity === "CRITICAL" ? "danger" : n.severity === "WARNING" ? "warning" : "blue",
                          className: "scale-90 origin-left"
                        }
                      )
                    ] })
                  ]
                },
                n.notification_id
              )) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 pl-2 border-l border-[#E2E8F0]", children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: currentUser.profile_image,
                alt: "Profile",
                className: "w-9 h-9 rounded-full object-cover border border-[#E2E8F0]"
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "hidden sm:block text-left", children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs font-bold text-[#0F172A]", children: currentUser.first_name }),
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] font-medium", children: currentUser.role_name })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("main", { className: "flex-1 overflow-y-auto", children: [
        activeTab === "dashboard" && /* @__PURE__ */ jsxs("div", { className: "animate-cross-fade flex flex-col gap-6", children: [
          /* @__PURE__ */ jsx(AdminDashboard, { search, mode: "dashboard" }),
          /* @__PURE__ */ jsx("div", { className: "px-8 pb-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden", children: [
            /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Live Inventory Stock Movements Ledger" }),
                /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: "Real-time ledger audit log tracking all warehouse adjustments, transfers, and additions" })
              ] }),
              /* @__PURE__ */ jsx(Badge, { text: "Append-Only Log", variant: "info" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
              /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Date & Time" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Product Name" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Warehouse" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Action Type" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Adjustment" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Operator / Performed By" })
              ] }) }),
              /* @__PURE__ */ jsx("tbody", { children: stockMovements.slice(0, 5).map((m) => /* @__PURE__ */ jsxs(
                "tr",
                {
                  className: "border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors",
                  children: [
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3 text-[#64748B] font-medium", children: formatDate(m.created_at) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3 font-bold text-[#0F172A]", children: m.product_name }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3 text-[#64748B]", children: m.warehouse_name }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3", children: /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: `inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${m.movement_type === "IN" ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#FEF2F2] text-[#EF4444]"}`,
                        children: m.movement_type
                      }
                    ) }),
                    /* @__PURE__ */ jsx(
                      "td",
                      {
                        className: `px-6 py-3 text-right font-extrabold ${m.quantity > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`,
                        children: m.quantity > 0 ? `+${m.quantity}` : m.quantity
                      }
                    ),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3 text-slate-500 font-semibold", children: m.performed_by })
                  ]
                },
                m.movement_id
              )) })
            ] }) })
          ] }) })
        ] }),
        activeTab === "products" && /* @__PURE__ */ jsx(AdminDashboard, { search, mode: "products" }),
        activeTab === "suppliers" && /* @__PURE__ */ jsxs("div", { className: "page-container animate-cross-fade", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(
                "h1",
                {
                  className: "text-2xl font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "Suppliers & Vendors Directory"
                }
              ),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-[#64748B] mt-1", children: [
                suppliers.length,
                " active vendor relationships \xB7 Avg lead time",
                " ",
                Math.round(
                  suppliers.reduce((a, s) => a + s.lead_time_days, 0) / (suppliers.length || 1)
                ),
                " ",
                "days"
              ] })
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => {
                  setEditingSupplier(null);
                  setSCompany("");
                  setSContact("");
                  setSEmail("");
                  setSPhone("");
                  setSCity("");
                  setSCountry("Pakistan");
                  setSLeadTime("7");
                  setSReliability("80");
                  setSupplierModalOpen(true);
                },
                className: "flex items-center gap-2 bg-[#4F46E5] text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-[#4338CA] transition-colors cursor-pointer border-0 shadow-sm",
                children: [
                  /* @__PURE__ */ jsx(Plus, { size: 15 }),
                  " Add Supplier"
                ]
              }
            )
          ] }),
          supplierToast && /* @__PURE__ */ jsxs("div", { className: "bg-[#ECFDF5] border border-emerald-200 px-4 py-3 rounded-lg flex items-center gap-2 text-[11px] font-bold text-emerald-700 animate-fade-up", children: [
            /* @__PURE__ */ jsx(Check, { size: 14 }),
            " ",
            supplierToast
          ] }),
          (() => {
            const supplierCountries = Array.from(
              new Set(suppliers.map((s) => s.country))
            );
            const filteredSuppliers = suppliers.filter((s) => {
              const q = supplierSearch.toLowerCase();
              const matchSearch = !supplierSearch || s.company_name.toLowerCase().includes(q) || s.contact_person.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.city.toLowerCase().includes(q);
              let matchReliability = true;
              if (supplierReliabilityFilter === "excellent")
                matchReliability = s.reliability_score >= 90;
              else if (supplierReliabilityFilter === "good")
                matchReliability = s.reliability_score >= 80 && s.reliability_score < 90;
              else if (supplierReliabilityFilter === "average")
                matchReliability = s.reliability_score >= 70 && s.reliability_score < 80;
              else if (supplierReliabilityFilter === "poor")
                matchReliability = s.reliability_score < 70;
              let matchLeadTime = true;
              if (supplierLeadTimeFilter === "short")
                matchLeadTime = s.lead_time_days <= 5;
              else if (supplierLeadTimeFilter === "medium")
                matchLeadTime = s.lead_time_days > 5 && s.lead_time_days <= 10;
              else if (supplierLeadTimeFilter === "long")
                matchLeadTime = s.lead_time_days > 10;
              const matchCountry = supplierCountryFilter === "all" || s.country === supplierCountryFilter;
              return matchSearch && matchReliability && matchLeadTime && matchCountry;
            });
            return /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4 flex-wrap animate-fade-up", children: [
                  /* @__PURE__ */ jsxs("div", { className: "relative flex-1 max-w-xs", children: [
                    /* @__PURE__ */ jsx(
                      Search,
                      {
                        size: 14,
                        className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        placeholder: "Search company, contact, city...",
                        value: supplierSearch,
                        onChange: (e) => setSupplierSearch(e.target.value)
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "flex gap-3 text-xs", children: [
                    {
                      label: "Total",
                      val: suppliers.length,
                      color: "text-[#4F46E5]"
                    },
                    {
                      label: "High Reliability",
                      val: suppliers.filter(
                        (s) => s.reliability_score >= 85
                      ).length,
                      color: "text-emerald-600"
                    },
                    {
                      label: "Filtered",
                      val: filteredSuppliers.length,
                      color: "text-indigo-600 font-bold"
                    }
                  ].map((stat) => /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: "bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-center",
                      children: [
                        /* @__PURE__ */ jsx(
                          "div",
                          {
                            className: `font-extrabold text-sm ${stat.color}`,
                            children: stat.val
                          }
                        ),
                        /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B]", children: stat.label })
                      ]
                    },
                    stat.label
                  )) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 flex-wrap pt-3 border-t border-[#F1F5F9] text-xs", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Reliability:" }),
                    /* @__PURE__ */ jsxs(
                      "select",
                      {
                        value: supplierReliabilityFilter,
                        onChange: (e) => setSupplierReliabilityFilter(e.target.value),
                        className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        children: [
                          /* @__PURE__ */ jsx("option", { value: "all", children: "All Tiers" }),
                          /* @__PURE__ */ jsx("option", { value: "excellent", children: "Excellent (>=90%)" }),
                          /* @__PURE__ */ jsx("option", { value: "good", children: "Good (80-89%)" }),
                          /* @__PURE__ */ jsx("option", { value: "average", children: "Average (70-79%)" }),
                          /* @__PURE__ */ jsx("option", { value: "poor", children: "Needs Attention (<70%)" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Lead Time:" }),
                    /* @__PURE__ */ jsxs(
                      "select",
                      {
                        value: supplierLeadTimeFilter,
                        onChange: (e) => setSupplierLeadTimeFilter(e.target.value),
                        className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        children: [
                          /* @__PURE__ */ jsx("option", { value: "all", children: "All Lead Times" }),
                          /* @__PURE__ */ jsx("option", { value: "short", children: "Fast (<= 5 days)" }),
                          /* @__PURE__ */ jsx("option", { value: "medium", children: "Standard (6-10 days)" }),
                          /* @__PURE__ */ jsx("option", { value: "long", children: "Long (> 10 days)" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Country:" }),
                    /* @__PURE__ */ jsxs(
                      "select",
                      {
                        value: supplierCountryFilter,
                        onChange: (e) => setSupplierCountryFilter(e.target.value),
                        className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        children: [
                          /* @__PURE__ */ jsx("option", { value: "all", children: "All Countries" }),
                          supplierCountries.map((country) => /* @__PURE__ */ jsx("option", { value: country, children: country }, country))
                        ]
                      }
                    )
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
                /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Company Name" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Contact Person" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Email & Phone" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Location" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Lead Time" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Reliability" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Actions" })
                ] }) }),
                /* @__PURE__ */ jsxs("tbody", { children: [
                  filteredSuppliers.map((s) => /* @__PURE__ */ jsxs(
                    "tr",
                    {
                      className: "data-row border-b border-[#E2E8F0] group",
                      children: [
                        /* @__PURE__ */ jsxs("td", { className: "px-6 py-4", children: [
                          /* @__PURE__ */ jsx("div", { className: "font-bold text-[#0F172A]", children: s.company_name }),
                          /* @__PURE__ */ jsxs("div", { className: "text-[9px] text-[#94A3B8] mt-0.5", children: [
                            "ID: ",
                            s.supplier_id
                          ] })
                        ] }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-4 font-medium text-[#64748B]", children: s.contact_person }),
                        /* @__PURE__ */ jsxs("td", { className: "px-6 py-4", children: [
                          /* @__PURE__ */ jsx("div", { className: "text-[#64748B]", children: s.email }),
                          /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#94A3B8]", children: s.phone })
                        ] }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-[#64748B]", children: [
                          /* @__PURE__ */ jsx(
                            MapPin,
                            {
                              size: 11,
                              className: "text-[#94A3B8] flex-shrink-0"
                            }
                          ),
                          s.city,
                          ", ",
                          s.country
                        ] }) }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxs(
                          "span",
                          {
                            className: `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${s.lead_time_days <= 5 ? "bg-emerald-50 text-emerald-700" : s.lead_time_days <= 10 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`,
                            children: [
                              s.lead_time_days,
                              "d"
                            ]
                          }
                        ) }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx(
                          ReliabilityRating,
                          {
                            score: s.reliability_score
                          }
                        ) }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-center", children: deleteConfirmId === s.supplier_id ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 justify-center", children: [
                          /* @__PURE__ */ jsx("span", { className: "text-[9px] text-red-600 font-bold", children: "Confirm?" }),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              onClick: () => {
                                deleteSupplier(s.supplier_id);
                                setDeleteConfirmId(null);
                                setSupplierToast(
                                  `${s.company_name} removed from vendor directory.`
                                );
                                setTimeout(
                                  () => setSupplierToast(""),
                                  3e3
                                );
                              },
                              className: "px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded cursor-pointer border-0 hover:bg-red-600",
                              children: "Yes"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              onClick: () => setDeleteConfirmId(null),
                              className: "px-2 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded cursor-pointer border-0 hover:bg-slate-300",
                              children: "No"
                            }
                          )
                        ] }) : /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 justify-center opacity-0 group-hover:opacity-100 transition-opacity", children: [
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              onClick: () => {
                                setEditingSupplier(s);
                                setSCompany(s.company_name);
                                setSContact(s.contact_person);
                                setSEmail(s.email);
                                setSPhone(s.phone);
                                setSCity(s.city);
                                setSCountry(s.country);
                                setSLeadTime(
                                  s.lead_time_days.toString()
                                );
                                setSReliability(
                                  s.reliability_score.toString()
                                );
                                setSupplierModalOpen(true);
                              },
                              className: "px-2.5 py-1 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold rounded cursor-pointer border-0 hover:bg-indigo-200",
                              children: "Edit"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              onClick: () => setDeleteConfirmId(s.supplier_id),
                              className: "px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded cursor-pointer border-0 hover:bg-red-100",
                              children: "Delete"
                            }
                          )
                        ] }) })
                      ]
                    },
                    s.supplier_id
                  )),
                  filteredSuppliers.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsxs(
                    "td",
                    {
                      colSpan: 7,
                      className: "text-center py-10 text-xs text-[#94A3B8] font-medium",
                      children: [
                        "No suppliers match your search.",
                        " ",
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            onClick: () => setSupplierModalOpen(true),
                            className: "text-[#4F46E5] font-bold underline cursor-pointer border-0 bg-transparent",
                            children: "Add one now"
                          }
                        ),
                        "."
                      ]
                    }
                  ) })
                ] })
              ] }) }) }),
              supplierModalOpen && /* @__PURE__ */ jsx(
                "div",
                {
                  className: "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",
                  onClick: (e) => {
                    if (e.target === e.currentTarget)
                      setSupplierModalOpen(false);
                  },
                  children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-[#E2E8F0] overflow-hidden animate-dropdown", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0]", children: [
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx(
                          "h3",
                          {
                            className: "text-sm font-bold text-[#0F172A]",
                            style: { fontFamily: "Outfit, sans-serif" },
                            children: editingSupplier ? "Edit Supplier Profile" : "Onboard New Supplier"
                          }
                        ),
                        /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: editingSupplier ? `Updating: ${editingSupplier.company_name}` : "Register a new vendor in the supplier directory" })
                      ] }),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => setSupplierModalOpen(false),
                          className: "w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] border-0 bg-transparent cursor-pointer text-lg leading-none",
                          children: "\xD7"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxs(
                      "form",
                      {
                        className: "p-6 flex flex-col gap-4 text-xs",
                        onSubmit: (e) => {
                          e.preventDefault();
                          const data = {
                            company_name: sCompany,
                            contact_person: sContact,
                            email: sEmail,
                            phone: sPhone,
                            city: sCity,
                            country: sCountry,
                            lead_time_days: parseInt(sLeadTime) || 7,
                            reliability_score: Math.min(
                              100,
                              Math.max(0, parseInt(sReliability) || 80)
                            )
                          };
                          if (editingSupplier) {
                            updateSupplier({ ...editingSupplier, ...data });
                            setSupplierToast(
                              `${sCompany} profile updated successfully.`
                            );
                          } else {
                            addSupplier(data);
                            setSupplierToast(
                              `${sCompany} onboarded as a new supplier.`
                            );
                          }
                          setSupplierModalOpen(false);
                          setTimeout(() => setSupplierToast(""), 3500);
                        },
                        children: [
                          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Company Name *" }),
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  className: "input-field py-2 text-xs",
                                  placeholder: "e.g. Cisco Distribution PK",
                                  value: sCompany,
                                  onChange: (e) => setSCompany(e.target.value),
                                  required: true
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Contact Person *" }),
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  className: "input-field py-2 text-xs",
                                  placeholder: "e.g. Ahmed Khan",
                                  value: sContact,
                                  onChange: (e) => setSContact(e.target.value),
                                  required: true
                                }
                              )
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Email Address *" }),
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  className: "input-field py-2 text-xs",
                                  type: "email",
                                  placeholder: "contact@company.pk",
                                  value: sEmail,
                                  onChange: (e) => setSEmail(e.target.value),
                                  required: true
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Phone Number" }),
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  className: "input-field py-2 text-xs",
                                  placeholder: "+92 21 XXXXXXXX",
                                  value: sPhone,
                                  onChange: (e) => setSPhone(e.target.value)
                                }
                              )
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "City" }),
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  className: "input-field py-2 text-xs",
                                  placeholder: "e.g. Karachi",
                                  value: sCity,
                                  onChange: (e) => setSCity(e.target.value)
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Country" }),
                              /* @__PURE__ */ jsxs(
                                "select",
                                {
                                  className: "input-field py-2 text-xs",
                                  value: sCountry,
                                  onChange: (e) => setSCountry(e.target.value),
                                  children: [
                                    /* @__PURE__ */ jsx("option", { children: "Pakistan" }),
                                    /* @__PURE__ */ jsx("option", { children: "China" }),
                                    /* @__PURE__ */ jsx("option", { children: "UAE" }),
                                    /* @__PURE__ */ jsx("option", { children: "USA" }),
                                    /* @__PURE__ */ jsx("option", { children: "Germany" }),
                                    /* @__PURE__ */ jsx("option", { children: "India" })
                                  ]
                                }
                              )
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Lead Time (days)" }),
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  className: "input-field py-2 text-xs",
                                  type: "number",
                                  min: "1",
                                  max: "365",
                                  value: sLeadTime,
                                  onChange: (e) => setSLeadTime(e.target.value)
                                }
                              )
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Reliability Score (0\u2013100)" }),
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  className: "input-field py-2 text-xs",
                                  type: "number",
                                  min: "0",
                                  max: "100",
                                  value: sReliability,
                                  onChange: (e) => setSReliability(e.target.value)
                                }
                              )
                            ] })
                          ] }),
                          /* @__PURE__ */ jsx(
                            "button",
                            {
                              type: "submit",
                              className: "w-full py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg transition-colors border-0 cursor-pointer mt-2",
                              children: editingSupplier ? "Save Changes" : "Onboard Supplier"
                            }
                          )
                        ]
                      }
                    )
                  ] })
                }
              )
            ] });
          })()
        ] }),
        activeTab === "orders" && /* @__PURE__ */ jsxs("div", { className: "page-container animate-cross-fade flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(
              "h1",
              {
                className: "text-2xl font-bold text-[#0F172A]",
                style: { fontFamily: "Outfit, sans-serif" },
                children: "Wholesale Order & Financial Invoices"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Accounts receivable ledger tracking B2B/B2C purchase orders, credit term statuses, and payment probability scores." })
          ] }),
          (() => {
            const filteredOrders = orders.filter((o) => {
              const q = ordersSearch.toLowerCase();
              const matchSearch = !ordersSearch || o.order_number.toLowerCase().includes(q);
              const matchType = ordersTypeFilter === "all" || o.order_type === ordersTypeFilter;
              let matchInvoiceStatus = true;
              if (invoiceStatusFilter !== "all") {
                const orderSuffix = o.order_id.replace("o-", "");
                const associatedInvoice = invoices.find(
                  (i) => i.invoice_id.replace("inv-", "") === orderSuffix
                );
                matchInvoiceStatus = associatedInvoice ? associatedInvoice.status === invoiceStatusFilter : false;
              }
              return matchSearch && matchType && matchInvoiceStatus;
            });
            const filteredInvoices = invoices.filter((inv) => {
              const q = ordersSearch.toLowerCase();
              const matchSearch = !ordersSearch || inv.invoice_number.toLowerCase().includes(q);
              const matchStatus = invoiceStatusFilter === "all" || inv.status === invoiceStatusFilter;
              let matchType = true;
              if (ordersTypeFilter !== "all") {
                const invSuffix = inv.invoice_id.replace("inv-", "");
                const associatedOrder = orders.find(
                  (o) => o.order_id.replace("o-", "") === invSuffix
                );
                matchType = associatedOrder ? associatedOrder.order_type === ordersTypeFilter : false;
              }
              let matchRisk = true;
              if (riskFilter === "low")
                matchRisk = inv.late_payment_probability < 0.2;
              else if (riskFilter === "medium")
                matchRisk = inv.late_payment_probability >= 0.2 && inv.late_payment_probability <= 0.5;
              else if (riskFilter === "high")
                matchRisk = inv.late_payment_probability > 0.5;
              return matchSearch && matchStatus && matchType && matchRisk;
            });
            return /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4 flex-wrap", children: [
                  /* @__PURE__ */ jsxs("div", { className: "relative flex-1 max-w-xs animate-fade-up", children: [
                    /* @__PURE__ */ jsx(
                      Search,
                      {
                        size: 14,
                        className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        placeholder: "Search order or invoice number...",
                        value: ordersSearch,
                        onChange: (e) => setOrdersSearch(e.target.value)
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        setOrdersSearch("");
                        setOrdersTypeFilter("all");
                        setInvoiceStatusFilter("all");
                        setRiskFilter("all");
                      },
                      className: "px-3.5 py-2 border border-[#E2E8F0] hover:bg-slate-50 rounded-lg text-xs text-[#64748B] hover:text-[#0F172A] bg-white cursor-pointer transition-colors",
                      children: "Clear Filters"
                    }
                  ) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 flex-wrap pt-3 border-t border-[#F1F5F9] text-xs", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Order Type:" }),
                    /* @__PURE__ */ jsxs(
                      "select",
                      {
                        value: ordersTypeFilter,
                        onChange: (e) => setOrdersTypeFilter(e.target.value),
                        className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        children: [
                          /* @__PURE__ */ jsx("option", { value: "all", children: "All Types" }),
                          /* @__PURE__ */ jsx("option", { value: "B2B", children: "B2B Wholesale" }),
                          /* @__PURE__ */ jsx("option", { value: "B2C", children: "B2C Retail" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Invoice:" }),
                    /* @__PURE__ */ jsxs(
                      "select",
                      {
                        value: invoiceStatusFilter,
                        onChange: (e) => setInvoiceStatusFilter(e.target.value),
                        className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        children: [
                          /* @__PURE__ */ jsx("option", { value: "all", children: "All Statuses" }),
                          /* @__PURE__ */ jsx("option", { value: "PAID", children: "Paid" }),
                          /* @__PURE__ */ jsx("option", { value: "PARTIALLY_PAID", children: "Partially Paid" }),
                          /* @__PURE__ */ jsx("option", { value: "UNPAID", children: "Unpaid" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Late Probability Risk:" }),
                    /* @__PURE__ */ jsxs(
                      "select",
                      {
                        value: riskFilter,
                        onChange: (e) => setRiskFilter(e.target.value),
                        className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
                        children: [
                          /* @__PURE__ */ jsx("option", { value: "all", children: "All Risk Tiers" }),
                          /* @__PURE__ */ jsx("option", { value: "low", children: "Low Risk (<20%)" }),
                          /* @__PURE__ */ jsx("option", { value: "medium", children: "Medium Risk (20-50%)" }),
                          /* @__PURE__ */ jsx("option", { value: "high", children: "High Risk Alert (>50%)" })
                        ]
                      }
                    )
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
                /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: [
                  /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50", children: [
                    /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Purchase Orders Ledger" }),
                    /* @__PURE__ */ jsx(
                      Badge,
                      {
                        text: `${filteredOrders.length} Orders`,
                        variant: "neutral"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "overflow-x-auto flex-1", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
                    /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Order No" }),
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Type" }),
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Status" }),
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Total Amount" }),
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Actions" })
                    ] }) }),
                    /* @__PURE__ */ jsx("tbody", { children: filteredOrders.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
                      "td",
                      {
                        colSpan: 5,
                        className: "text-center py-8 text-xs text-[#94A3B8] font-medium",
                        children: "No orders match filter."
                      }
                    ) }) : filteredOrders.map((o) => /* @__PURE__ */ jsxs(
                      "tr",
                      {
                        className: "data-row border-b border-[#E2E8F0]",
                        children: [
                          /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsxs("div", { children: [
                            /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: o.order_number }),
                            /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-[#64748B] font-medium mt-0.5", children: [
                              o.order_type === "B2C" ? "Buyer Request: " : "Distributor Request: ",
                              o.customer_email || "demo@commerceiq.com"
                            ] }),
                            /* @__PURE__ */ jsx("div", { className: "text-[9px] text-[#94A3B8] mt-0.5", children: formatDate(o.order_date) })
                          ] }) }),
                          /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsx(
                            Badge,
                            {
                              text: o.order_type,
                              variant: o.order_type === "B2B" ? "info" : "gray"
                            }
                          ) }),
                          /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsx(OrderStatusBadge, { status: o.status }) }),
                          /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-right font-bold text-[#0F172A]", children: formatCurrency(o.total_amount) }),
                          /* @__PURE__ */ jsxs("td", { className: "px-6 py-3.5 text-center flex justify-center gap-1.5", children: [
                            o.status === "PENDING" && (
                              /* @__PURE__ */ jsx("button", {
                                onClick: () => handleApproveOrder(o.order_id),
                                className: "px-2.5 py-1 bg-[#10B981] hover:bg-[#059669] text-white border-0 rounded text-[10px] font-bold cursor-pointer transition-colors shadow-sm",
                                children: "Approve"
                              })
                            ),
                            (o.status === "CONFIRMED" || o.status === "PROCESSING") && (
                              /* @__PURE__ */ jsx("button", {
                                onClick: () => handleShipOrder(o.order_id),
                                className: "px-2.5 py-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white border-0 rounded text-[10px] font-bold cursor-pointer transition-colors shadow-sm",
                                children: "Ship"
                              })
                            )
                          ] })
                        ]
                      },
                      o.order_id
                    )) })
                  ] }) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: [
                  /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50", children: [
                    /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Receivable Invoices" }),
                    /* @__PURE__ */ jsx(
                      Badge,
                      {
                        text: `${filteredInvoices.length} Invoices`,
                        variant: "neutral"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "overflow-x-auto flex-1", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
                    /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Invoice No" }),
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Status" }),
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Total" }),
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Payment Allocation" }),
                      /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Late Probability" })
                    ] }) }),
                    /* @__PURE__ */ jsx("tbody", { children: filteredInvoices.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
                      "td",
                      {
                        colSpan: 5,
                        className: "text-center py-8 text-xs text-[#94A3B8] font-medium",
                        children: "No invoices match filter."
                      }
                    ) }) : filteredInvoices.map((inv) => {
                      const allocationPct = inv.total_amount > 0 ? inv.amount_paid / inv.total_amount * 100 : 0;
                      return /* @__PURE__ */ jsxs(
                        "tr",
                        {
                          className: "data-row border-b border-[#E2E8F0]",
                          children: [
                            /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: inv.invoice_number }),
                              /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-[#94A3B8] mt-0.5", children: [
                                "Due: ",
                                formatDate(inv.due_date)
                              ] })
                            ] }) }),
                            /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsx(
                              InvoiceStatusBadge,
                              {
                                status: inv.status
                              }
                            ) }),
                            /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-right font-bold text-[#0F172A]", children: formatCurrency(inv.total_amount) }),
                            /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsxs("div", { className: "w-[100px]", children: [
                              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[9px] text-[#64748B] font-bold mb-0.5", children: [
                                /* @__PURE__ */ jsx("span", { children: "Paid:" }),
                                /* @__PURE__ */ jsxs("span", { children: [
                                  Math.round(allocationPct),
                                  "%"
                                ] })
                              ] }),
                              /* @__PURE__ */ jsx("div", { className: "h-1 bg-slate-100 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                                "div",
                                {
                                  className: "h-full bg-emerald-500 rounded-full transition-all duration-500",
                                  style: {
                                    width: `${allocationPct}%`
                                  }
                                }
                              ) })
                            ] }) }),
                            /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsx(
                              LatePaymentRiskBadge,
                              {
                                probability: inv.late_payment_probability
                              }
                            ) })
                          ]
                        },
                        inv.invoice_id
                      );
                    }) })
                  ] }) })
                ] })
              ] })
            ] });
          })(),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col gap-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Simulate Payment Allocation" }),
                /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: "Allocate cash transfers, checks or mobile wallet transactions to outstanding B2B invoices" })
              ] }),
              /* @__PURE__ */ jsxs(
                "form",
                {
                  onSubmit: handleRecordAllocationSubmit,
                  className: "flex flex-col gap-3",
                  children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Select Open Invoice" }),
                      /* @__PURE__ */ jsx(
                        "select",
                        {
                          className: "input-field py-2 text-xs",
                          value: allocInvoiceId,
                          onChange: (e) => setAllocInvoiceId(e.target.value),
                          required: true,
                          children: invoices.filter((inv) => inv.status !== "PAID").map((inv) => /* @__PURE__ */ jsxs("option", { value: inv.invoice_id, children: [
                            inv.invoice_number,
                            " (Unpaid:",
                            " ",
                            formatCurrency(
                              inv.total_amount - inv.amount_paid
                            ),
                            ")"
                          ] }, inv.invoice_id))
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Method" }),
                        /* @__PURE__ */ jsxs(
                          "select",
                          {
                            className: "input-field py-2 text-xs",
                            value: allocMethod,
                            onChange: (e) => setAllocMethod(e.target.value),
                            required: true,
                            children: [
                              /* @__PURE__ */ jsx("option", { value: "JAZZCASH", children: "JazzCash" }),
                              /* @__PURE__ */ jsx("option", { value: "EASYPAISA", children: "EasyPaisa" }),
                              /* @__PURE__ */ jsx("option", { value: "BANK_TRANSFER", children: "Bank Transfer" }),
                              /* @__PURE__ */ jsx("option", { value: "CARD", children: "Credit Card" })
                            ]
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Allocation (Rs)" }),
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            type: "number",
                            className: "input-field py-2 text-xs",
                            value: allocAmount,
                            onChange: (e) => setAllocAmount(e.target.value),
                            required: true
                          }
                        )
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Transaction Ref Code" }),
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "text",
                          className: "input-field py-2 text-xs",
                          value: allocRef,
                          onChange: (e) => setAllocRef(e.target.value),
                          required: true
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "submit",
                        className: "w-full py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg transition-colors cursor-pointer border-0",
                        children: "Submit Allocation & Reconcile"
                      }
                    )
                  ]
                }
              ),
              allocSuccess && /* @__PURE__ */ jsxs("div", { className: "bg-emerald-50 border border-emerald-300/40 p-3 rounded-lg flex items-start gap-2 animate-fade-up text-emerald-800 text-[11px] font-medium leading-normal", children: [
                /* @__PURE__ */ jsx(
                  Check,
                  {
                    size: 14,
                    className: "text-[#10B981] flex-shrink-0 mt-0.5"
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: allocSuccess })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden lg:col-span-2 flex flex-col", children: [
              /* @__PURE__ */ jsx("div", { className: "px-6 py-4 border-b border-[#E2E8F0]", children: /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-[#0F172A]", children: "Settlement & Reconciled Payments Logs" }) }),
              /* @__PURE__ */ jsx("div", { className: "overflow-x-auto flex-1", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
                /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Payment Reference" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Customer Name" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Amount Received" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Method" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Settlement status" })
                ] }) }),
                /* @__PURE__ */ jsx("tbody", { children: payments.map((p) => /* @__PURE__ */ jsxs(
                  "tr",
                  {
                    className: "data-row border-b border-[#E2E8F0]",
                    children: [
                      /* @__PURE__ */ jsx("td", { className: "px-6 py-3", children: /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: p.reference_no }),
                        /* @__PURE__ */ jsx("div", { className: "text-[9px] text-[#94A3B8] mt-0.5", children: formatDate(p.payment_date) })
                      ] }) }),
                      /* @__PURE__ */ jsx("td", { className: "px-6 py-3 font-semibold text-[#0F172A]", children: p.customer_name }),
                      /* @__PURE__ */ jsx("td", { className: "px-6 py-3 text-right font-bold text-emerald-600", children: formatCurrency(p.amount) }),
                      /* @__PURE__ */ jsx("td", { className: "px-6 py-3", children: /* @__PURE__ */ jsx(PaymentMethodIcon, { method: p.payment_method }) }),
                      /* @__PURE__ */ jsx("td", { className: "px-6 py-3", children: /* @__PURE__ */ jsx(
                        "span",
                        {
                          className: `inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${p.status === "RECONCILED" ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#EEF2FF] text-[#4F46E5]"}`,
                          children: p.status
                        }
                      ) })
                    ]
                  },
                  p.payment_id
                )) })
              ] }) })
            ] })
          ] })
        ] }),
        activeTab === "negotiations" && /* @__PURE__ */ jsxs("div", { className: "page-container animate-cross-fade flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(
              "h1",
              {
                className: "text-2xl font-bold text-[#0F172A]",
                style: { fontFamily: "Outfit, sans-serif" },
                children: "Wholesale Quotations & Negotiations"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Review incoming quotes from distributors, approve standard submissions, reject requests, or propose counter pricing." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: [
            /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Quotations Registry" }),
              /* @__PURE__ */ jsx(
                Badge,
                {
                  text: `${quotations.length} Active Records`,
                  variant: "neutral"
                }
              )
            ] }),
            /* @__PURE__ */ jsx("div", { className: "overflow-x-auto flex-1", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
              /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Quote Number" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Submitted On" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Estimated Value" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Status" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Actions" })
              ] }) }),
              /* @__PURE__ */ jsx("tbody", { children: quotations.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
                "td",
                {
                  colSpan: 5,
                  className: "text-center py-10 text-[#94A3B8] font-medium",
                  children: "No quotation requests logged in database."
                }
              ) }) : quotations.map((q) => /* @__PURE__ */ jsxs(
                "tr",
                {
                  className: "data-row border-b border-[#E2E8F0]",
                  children: [
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 font-bold text-[#0F172A]", children: q.quotation_number }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-[#64748B]", children: formatDate(q.created_at) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 font-bold text-[#0F172A]", children: formatCurrency(q.total_amount) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsx(Badge, {
                      text: q.status,
                      variant: q.status === "APPROVED" || q.status === "ACCEPTED" ? "success" : q.status === "NEGOTIATING" ? "warning" : q.status === "REJECTED" ? "danger" : "neutral"
                    }) }),
                    /* @__PURE__ */ jsxs("td", { className: "px-6 py-3.5 text-center flex justify-center gap-2", children: [
                      (q.status === "DRAFT" || q.status === "NEGOTIATING") && /* @__PURE__ */ jsxs(Fragment, { children: [
                        /* @__PURE__ */ jsx("button", {
                          onClick: () => {
                            if (confirm(`Approve quotation ${q.quotation_number} for Rs ${q.total_amount.toLocaleString()}?`)) {
                              updateQuotationStatus(q.quotation_id, "APPROVED");
                            }
                          },
                          className: "px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors border-0 shadow-sm",
                          children: "Approve"
                        }),
                        /* @__PURE__ */ jsx("button", {
                          onClick: () => {
                            const val = prompt(`Propose counter-offer for quotation ${q.quotation_number} (Current: Rs ${q.total_amount.toLocaleString()}):`);
                            if (val) {
                              const parsed = parseFloat(val);
                              if (!isNaN(parsed) && parsed > 0) {
                                updateQuotationStatus(q.quotation_id, "NEGOTIATING", parsed);
                              } else {
                                alert("Invalid amount entered.");
                              }
                            }
                          },
                          className: "px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold cursor-pointer transition-colors border-0 shadow-sm",
                          children: "Counter"
                        }),
                        /* @__PURE__ */ jsx("button", {
                          onClick: () => {
                            if (confirm(`Reject quotation request ${q.quotation_number}?`)) {
                              updateQuotationStatus(q.quotation_id, "REJECTED");
                            }
                          },
                          className: "px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors border-0 shadow-sm",
                          children: "Reject"
                        })
                      ] }),
                      q.status === "APPROVED" && /* @__PURE__ */ jsx("span", { className: "text-[#10B981] font-bold text-[10px]", children: "Approved & Ready" }),
                      q.status === "ACCEPTED" && /* @__PURE__ */ jsx("span", { className: "text-emerald-600 font-bold text-[10px]", children: "Accepted by Distributor" }),
                      q.status === "REJECTED" && /* @__PURE__ */ jsx("span", { className: "text-rose-600 font-bold text-[10px]", children: "Rejected" })
                    ] })
                  ]
                },
                q.quotation_id
              )) })
            ] }) })
          ] })
        ] }),
        activeTab === "settings" && /* @__PURE__ */ jsxs("div", { className: "page-container animate-cross-fade flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(
              "h1",
              {
                className: "text-2xl font-bold text-[#0F172A]",
                style: { fontFamily: "Outfit, sans-serif" },
                children: "System Settings & Audit Log"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Adjust default parameters, currency codes, and view security audit logs." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col gap-5 text-xs lg:col-span-1", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-[#0F172A] mb-3", children: "Database Connection Status" }),
                /* @__PURE__ */ jsxs("div", { className: "bg-[#ECFDF5] border border-[#10B981]/20 p-4 rounded-lg flex items-center gap-3", children: [
                  /* @__PURE__ */ jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "font-bold text-[#059669]", children: "MySQL Schema Aligned" }),
                    /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#059669] mt-0.5 leading-normal", children: "Tables verified: roles, users, categories, products, inventory, suppliers, orders, invoices, payments, notification_rules, notifications, audit_logs." })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
                /* @__PURE__ */ jsx("label", { className: "font-bold text-[#0F172A]", children: "Default System Currency" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "input-field cursor-not-allowed bg-slate-50 text-xs",
                    value: "PKR (Rs)",
                    disabled: true
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
                /* @__PURE__ */ jsx("label", { className: "font-bold text-[#0F172A]", children: "Risk Threshold Classifier (Late Payment Probability)" }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "border border-[#E2E8F0] p-2.5 rounded-lg text-center bg-emerald-50/20", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#64748B] font-bold block mb-1", children: "LOW RISK" }),
                    /* @__PURE__ */ jsx("span", { className: "text-[#10B981] font-bold text-[10px]", children: "< 30%" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "border border-[#E2E8F0] p-2.5 rounded-lg text-center bg-amber-50/20", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#64748B] font-bold block mb-1", children: "MEDIUM RISK" }),
                    /* @__PURE__ */ jsx("span", { className: "text-[#F59E0B] font-bold text-[10px]", children: "30% - 60%" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "border border-[#E2E8F0] p-2.5 rounded-lg text-center bg-red-50/20", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#64748B] font-bold block mb-1", children: "HIGH RISK" }),
                    /* @__PURE__ */ jsx("span", { className: "text-[#EF4444] font-bold text-[10px]", children: "> 60%" })
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden lg:col-span-2 flex flex-col", children: [
              /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-[#0F172A]", children: "Append-Only Security Audit Ledger" }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: "Captures a complete JSON-diff schema history tracking every operator addition, update or deletion" })
                ] }),
                /* @__PURE__ */ jsx(Badge, { text: "audit_logs", variant: "neutral" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "overflow-y-auto flex-1 max-h-[450px]", children: /* @__PURE__ */ jsx("div", { className: "flex flex-col divide-y divide-[#E2E8F0]", children: auditLogs.map((log) => /* @__PURE__ */ jsxs(
                "div",
                {
                  className: "p-4 hover:bg-[#F8FAFC] transition-colors flex items-start gap-3 text-xs",
                  children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: `w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${log.action === "UPDATE" ? "bg-[#EEF2FF] text-[#4F46E5]" : "bg-[#ECFDF5] text-[#10B981]"}`,
                        children: /* @__PURE__ */ jsx(Database, { size: 15 })
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start gap-2", children: [
                        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                          /* @__PURE__ */ jsx("span", { className: "font-extrabold text-[#0f172a]", children: log.table_name.toUpperCase() }),
                          /* @__PURE__ */ jsx(
                            Badge,
                            {
                              text: log.action,
                              variant: log.action === "UPDATE" ? "warning" : "success",
                              className: "scale-90"
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#94A3B8]", children: formatDate(log.created_at) })
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-[11px] text-[#64748B] mt-1 font-medium leading-relaxed", children: log.notes }),
                      /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-[#4F46E5] font-semibold mt-1", children: [
                        "Performed by: ",
                        log.performed_by
                      ] })
                    ] })
                  ]
                },
                log.audit_id
              )) }) })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
