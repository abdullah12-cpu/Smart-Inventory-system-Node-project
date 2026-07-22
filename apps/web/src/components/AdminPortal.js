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
  Database,
  Receipt,
  MessageSquare,
  Sparkles,
  Send,
  Paperclip
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/data";
import {
  motion,
  AnimatePresence,
  useReducedMotion
} from "framer-motion";
import {
  CountUp,
  Typewriter,
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
}

function SidebarLink({ id, label, icon: Icon, activeTab, setActiveTab, shouldReduceMotion }) {
  const isActive = activeTab === id;
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick: () => setActiveTab(id),
      className: `sidebar-link w-full text-left border-0 bg-transparent relative flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors duration-200 cursor-pointer overflow-hidden ${
        isActive ? "text-white" : "text-[#94A3B8] hover:text-white"
      }`,
      style: { background: "transparent" },
      children: [
        isActive && /* @__PURE__ */ jsx(motion.div, {
          layoutId: "sidebar-active-pill",
          className: "absolute inset-0 bg-[#4F46E5] rounded-lg -z-10",
          initial: shouldReduceMotion ? { opacity: 1 } : { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.2 }
        }),
        isActive && /* @__PURE__ */ jsx(motion.div, {
          layoutId: "sidebar-active-line",
          className: "absolute left-0 top-0 bottom-0 w-[2.5px] bg-white rounded-r-md",
          initial: shouldReduceMotion ? { y: 0 } : { y: -40 },
          animate: { y: 0 },
          transition: { type: "spring", stiffness: 300, damping: 25 }
        }),
        !isActive && /* @__PURE__ */ jsx(motion.div, {
          whileHover: shouldReduceMotion ? {} : { opacity: 0.05 },
          className: "absolute inset-0 bg-white opacity-0 rounded-lg -z-10"
        }),
        /* @__PURE__ */ jsxs(motion.div, {
          whileHover: shouldReduceMotion || isActive ? {} : { x: 3 },
          transition: { duration: 0.15 },
          className: "flex items-center gap-3 w-full",
          children: [
            /* @__PURE__ */ jsx(Icon, { size: 18, className: isActive ? "text-white" : "text-[#94A3B8] group-hover:text-white" }),
            /* @__PURE__ */ jsx("span", { children: label })
          ]
        })
      ]
    }
  );
}

function renderMessageText(text) {
  if (!text) return null;
  if (text.includes("|") && text.includes("---")) {
    const lines = text.split("\n");
    const tableLines = [];
    const beforeTable = [];
    const afterTable = [];
    let inTable = false;
    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        inTable = true;
        tableLines.push(trimmed);
      } else {
        if (inTable) {
          afterTable.push(line);
        } else {
          beforeTable.push(line);
        }
      }
    }
    if (tableLines.length >= 3) {
      const headerLine = tableLines[0];
      const headers = headerLine.split("|").slice(1, -1).map(h => h.trim());
      const rows = tableLines.slice(2).map(rowLine => {
        return rowLine.split("|").slice(1, -1).map(c => c.trim());
      });
      return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        beforeTable.length > 0 && /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-left m-0", children: beforeTable.join("\n") }),
        /* @__PURE__ */ jsx("div", { className: "overflow-x-auto my-2 border border-slate-200 rounded-lg shadow-sm bg-white", children: 
          /* @__PURE__ */ jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-[10px] text-left", children: [
            /* @__PURE__ */ jsx("thead", { className: "bg-slate-50", children: 
              /* @__PURE__ */ jsx("tr", { children: headers.map((h, idx) => /* @__PURE__ */ jsx("th", { className: "px-2 py-1.5 font-bold text-slate-500 uppercase tracking-wider", children: h }, idx)) })
            }),
            /* @__PURE__ */ jsx("tbody", { className: "bg-white divide-y divide-slate-100", children: 
              rows.map((row, rIdx) => /* @__PURE__ */ jsx("tr", { className: "hover:bg-slate-50", children: row.map((cell, cIdx) => /* @__PURE__ */ jsx("td", { className: "px-2 py-1.5 text-slate-700 font-medium whitespace-nowrap", children: cell }, cIdx)) }, rIdx))
            })
          ] })
        }),
        afterTable.length > 0 && /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-left m-0", children: afterTable.join("\n") })
      ] });
    }
  }
  return /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-left m-0", children: text });
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
    updateQuotationStatus,
    distributors,
    fetchDistributors,
    approveDistributor,
    removeDistributor,
    addNewProduct,
    warehouses
  } = useStore();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) return tab;
    return localStorage.getItem("ciq_admin_activeTab") || "dashboard";
  });
  const shouldReduceMotion = useReducedMotion();
  const [pageLoading, setPageLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [bellHovered, setBellHovered] = useState(false);
  const [userCardHovered, setUserCardHovered] = useState(false);
  const [isApproving, setIsApproving] = useState({});
  const [isRejecting, setIsRejecting] = useState({});
  const [removeHoveredId, setRemoveHoveredId] = useState(null);
  const [clearShake, setClearShake] = useState(false);

  useEffect(() => {
    localStorage.setItem("ciq_admin_activeTab", activeTab);
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== activeTab) {
      params.set("tab", activeTab);
      window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
    }
    setPageLoading(true);
    const timer = setTimeout(() => setPageLoading(false), 350);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && tab !== activeTab) {
        setActiveTab(tab);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeTab]);
  
  useEffect(() => {
    if (activeTab === "distributors") {
      fetchDistributors();
    }
  }, [activeTab, fetchDistributors]);

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
  const [shippingOrderId, setShippingOrderId] = useState(null);
  const [selectedShipWarehouse, setSelectedShipWarehouse] = useState("wh-1");
  const notifRef = useRef(null);
  const roleRef = useRef(null);
  const userCardRef = useRef(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "ai",
      text: "Hello Saif! I am your CIQ Admin Copilot. I can help you automate catalog actions. Try typing: 'Add product: Titanium Rods, category: Metals, price: 1500, stock: 100' or similar commands."
    }
  ]);
  const [chatTyping, setChatTyping] = useState(false);
  const [chatAttachedImage, setChatAttachedImage] = useState("");

  const handleChatFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatAttachedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const attachedImg = chatAttachedImage;
    setChatInput("");
    setChatAttachedImage("");
    setChatMessages((prev) => [...prev, { sender: "user", text: userText, image: attachedImg }]);
    setChatTyping(true);

    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: chatMessages.slice(1), attached_image: attachedImg })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.action_executed === "createProduct" && data.product) {
          addNewProduct(data.product);
        }
        setChatMessages((prev) => [
          ...prev,
          { sender: "ai", text: data.ai_message || "Processed." }
        ]);
      } else {
        const errText = await response.text();
        setChatMessages((prev) => [
          ...prev,
          { sender: "ai", text: `Error connecting to Copilot Service: ${errText}` }
        ]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: `Connection error: Failed to reach Copilot agent gateway. Error: ${err.message}` }
      ]);
    }
    setChatTyping(false);
  };
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
    if ((activeTab === "orders" || activeTab === "billing") && !canAccessBilling) {
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

  const handleShipOrder = (orderId) => {
    setShippingOrderId(orderId);
    setSelectedShipWarehouse("wh-1");
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

  const getOrderStockDetails = () => {
    if (!shippingOrderId) return { stocks: {}, items: [] };
    const selectedOrder = orders.find(o => o.order_id === shippingOrderId);
    if (!selectedOrder) return { stocks: {}, items: [] };

    const orderItems = typeof selectedOrder.items === "string" ? JSON.parse(selectedOrder.items) : selectedOrder.items;

    const warehouseStockInfo = {};

    warehouses.forEach(wh => {
      let minStock = Infinity;
      let hasProductInWh = false;

      orderItems.forEach(item => {
        const prod = products.find(p => p.product_id === item.product_id || p.sku === item.sku);
        if (prod) {
          const whEntry = prod.inventory.find(i => i.warehouse_id === wh.warehouse_id);
          if (whEntry) {
            hasProductInWh = true;
            if (whEntry.quantity < minStock) {
              minStock = whEntry.quantity;
            }
          } else {
            minStock = 0;
          }
        } else {
          minStock = 0;
        }
      });

      warehouseStockInfo[wh.warehouse_id] = {
        name: wh.warehouse_name,
        stock: hasProductInWh && minStock !== Infinity ? minStock : 0,
        exists: hasProductInWh
      };
    });

    return { stocks: warehouseStockInfo, items: orderItems };
  };

  return /* @__PURE__ */ jsxs("div", {
    className: "flex h-screen bg-[#F8FAFC] overflow-hidden text-xs relative", children: [
    
    // Top Route Change Progress Bar
    /* @__PURE__ */ jsx(AnimatePresence, {
      children: pageLoading && /* @__PURE__ */ jsx(motion.div, {
        className: "fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#4F46E5] via-[#818CF8] to-[#4F46E5] z-[9999] origin-left",
        initial: { scaleX: 0 },
        animate: { scaleX: 1 },
        exit: { scaleX: 1, opacity: 0 },
        transition: { duration: 0.35, ease: "easeInOut" }
      })
    }),

    /* @__PURE__ */ jsxs("aside", {
      className: "w-[260px] bg-[#0F172A] flex flex-col border-r border-[#1E293B] flex-shrink-0 relative z-20 sidebar-texture", children: [
      /* @__PURE__ */ jsxs("div", {
        className: "p-6 flex items-center gap-3 border-b border-[#1E293B]", children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "w-8 h-8 bg-[#4F46E5] rounded-md flex items-center justify-center text-white font-extrabold text-sm logo-box logo-heartbeat",
            style: { fontFamily: "Outfit, sans-serif" },
            children: "IQ"
          }
        ),
        /* @__PURE__ */ jsxs("div", {
          children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: "text-white font-bold text-[16px] tracking-tight block",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "CommerceIQ"
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#94A3B8] font-bold block tracking-wider uppercase mt-0.5", children: "Admin Command" })
          ]
        })
        ]
      }),
      /* @__PURE__ */ jsxs("nav", {
        className: "flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto relative", children: [
          /* @__PURE__ */ jsx(SidebarLink, { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, activeTab, setActiveTab, shouldReduceMotion }),
          /* @__PURE__ */ jsx(SidebarLink, { id: "products", label: "Products", icon: Box, activeTab, setActiveTab, shouldReduceMotion }),
          canAccessSuppliers && /* @__PURE__ */ jsx(SidebarLink, { id: "suppliers", label: "Suppliers", icon: Users, activeTab, setActiveTab, shouldReduceMotion }),
          canAccessBilling && /* @__PURE__ */ jsx(SidebarLink, { id: "orders", label: "Orders", icon: Database, activeTab, setActiveTab, shouldReduceMotion }),
          canAccessBilling && /* @__PURE__ */ jsx(SidebarLink, { id: "billing", label: "Billing & Payments", icon: Receipt, activeTab, setActiveTab, shouldReduceMotion }),
          canAccessBilling && /* @__PURE__ */ jsx(SidebarLink, { id: "negotiations", label: "Quotations", icon: Database, activeTab, setActiveTab, shouldReduceMotion }),
          /* @__PURE__ */ jsx(SidebarLink, { id: "distributors", label: "Distributors", icon: Users, activeTab, setActiveTab, shouldReduceMotion }),
          /* @__PURE__ */ jsx(SidebarLink, { id: "settings", label: "Settings", icon: Settings, activeTab, setActiveTab, shouldReduceMotion })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "p-4 border-t border-[#1E293B] relative", ref: roleRef, children: [
          roleSwitcherOpen && /* @__PURE__ */ jsxs("div", {
            className: "absolute bottom-[calc(100%+8px)] left-4 right-4 bg-[#1E293B] border border-[#334155] rounded-xl p-2 shadow-2xl z-50 animate-dropdown text-white flex flex-col gap-1", children: [
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
                /* @__PURE__ */ jsxs("div", {
                    children: [
                  /* @__PURE__ */ jsxs("span", {
                      className: "font-semibold block", children: [
                        roleUser.first_name,
                        " ",
                        roleUser.last_name
                      ]
                    }),
                  /* @__PURE__ */ jsx("span", { className: "text-[9px] text-slate-300 block", children: roleUser.role_name })
                    ]
                  }),
                    currentUser.role_name === roleUser.role_name && /* @__PURE__ */ jsx(Check, { size: 14, className: "text-white" })
                  ]
                },
                roleUser.user_id
              ))
            ]
          }),
        /* @__PURE__ */ jsxs(
            "div",
            {
              onClick: () => setRoleSwitcherOpen(!roleSwitcherOpen),
              onMouseEnter: () => setUserCardHovered(true),
              onMouseLeave: () => setUserCardHovered(false),
              className: "flex items-center justify-between px-2.5 py-2 mb-3 bg-[#1E293B]/40 hover:bg-[#1E293B]/80 rounded-lg cursor-pointer border border-transparent hover:border-[#4F46E5]/40 transition-all",
              children: [
              /* @__PURE__ */ jsxs("div", {
                className: "flex items-center gap-2.5 overflow-hidden", children: [
                /* @__PURE__ */ jsxs("div", {
                  className: "relative w-9 h-9 flex items-center justify-center shrink-0",
                  children: [
                    /* @__PURE__ */ jsx(motion.svg, {
                      className: "absolute inset-0 w-full h-full text-[#4F46E5] opacity-40 pointer-events-none",
                      animate: shouldReduceMotion ? {} : { rotate: 360 },
                      transition: { repeat: Infinity, duration: 8, ease: "linear" },
                      viewBox: "0 0 36 36",
                      children: /* @__PURE__ */ jsx("circle", {
                        cx: "18",
                        cy: "18",
                        r: "16",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "1.5",
                        strokeDasharray: "40 100"
                      })
                    }),
                    /* @__PURE__ */ jsx(
                      "img",
                      {
                        src: currentUser.profile_image,
                        alt: "Profile",
                        className: "w-7.5 h-7.5 rounded-full object-cover border border-[#4F46E5]"
                      }
                    )
                  ]
                }),
                /* @__PURE__ */ jsxs("div", {
                  className: "overflow-hidden", children: [
                  /* @__PURE__ */ jsxs("div", {
                    className: "text-xs font-bold text-white truncate", children: [
                      currentUser.first_name,
                      " ",
                      currentUser.last_name
                    ]
                  }),
                  /* @__PURE__ */ jsx("div", {
                    className: "mt-0.5", children: /* @__PURE__ */ jsx(
                      Badge,
                      {
                        text: currentUser.role_name,
                        variant: "info",
                        className: "scale-[0.8] origin-left py-0.5"
                      }
                    )
                  })
                  ]
                })
                ]
              }),
              /* @__PURE__ */ jsx(motion.div, {
                animate: { rotate: roleSwitcherOpen || userCardHovered ? 180 : 0 },
                transition: { duration: 0.2 },
                children: /* @__PURE__ */ jsx(ChevronDown, { size: 14, className: "text-[#94A3B8]" })
              })
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
        ]
      })
      ]
    }),
    /* @__PURE__ */ jsxs("div", {
      className: "flex-1 flex flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxs("header", {
        className: "h-[70px] bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 flex-shrink-0 relative z-10 header-shimmer", children: [
        /* @__PURE__ */ jsxs(motion.div, {
          animate: { width: isSearchFocused ? 340 : 320 },
          transition: { duration: 0.2 },
          className: "relative", children: [
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
              onFocus: () => setIsSearchFocused(true),
              onBlur: () => setIsSearchFocused(false),
              className: "w-full pl-9 pr-4 py-2 border rounded-lg text-xs bg-[#F8FAFC] focus:outline-none transition-all duration-200",
              style: {
                borderColor: isSearchFocused ? "#4F46E5" : "#E2E8F0",
                boxShadow: isSearchFocused ? "0 0 20px rgba(79, 70, 229, 0.15)" : "none"
              },
              placeholder: isSearchFocused ? "" : "Search catalog, suppliers, or reference...",
              value: search,
              onChange: (e) => setSearch(e.target.value)
            }
          )
          ]
        }),
        /* @__PURE__ */ jsxs("div", {
          className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsxs("div", {
            className: "relative", ref: notifRef, children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onMouseEnter: () => setBellHovered(true),
                onMouseLeave: () => setBellHovered(false),
                onClick: (e) => {
                  e.stopPropagation();
                  setNotifOpen(!notifOpen);
                },
                className: `relative w-9 h-9 flex items-center justify-center border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors cursor-pointer ${notifOpen ? "bg-[#F8FAFC] border-[#4F46E5]" : ""}`,
                children: [
                  /* @__PURE__ */ jsx(
                  motion.div,
                  {
                    animate: bellHovered && !shouldReduceMotion ? { rotate: [-8, 8, -8, 8, 0] } : { rotate: 0 },
                    transition: { duration: 0.35, ease: "easeInOut" },
                    children: /* @__PURE__ */ jsx(Bell, { size: 18 })
                  }
                ),
                  unreadNotifications.length > 0 && /* @__PURE__ */ jsx(
                    motion.span,
                    {
                      animate: shouldReduceMotion ? {} : { scale: [1, 1.2, 1] },
                      transition: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                      className: "absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none",
                      children: unreadNotifications.length
                    }
                  )
                ]
              }
            ),
              notifOpen && /* @__PURE__ */ jsxs("div", {
                className: "absolute right-0 top-[calc(100%+6px)] w-[360px] bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden animate-dropdown", children: [
              /* @__PURE__ */ jsxs("div", {
                  className: "p-4 border-b border-[#E2E8F0] flex items-center justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-[#0F172A]", children: "Notifications Center" }),
                /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: handleMarkAllRead,
                      className: "text-[10px] font-bold text-[#4F46E5] hover:text-[#4338CA] transition-colors border-0 bg-transparent cursor-pointer",
                      children: "Mark all as read"
                    }
                  )
                  ]
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "px-4 py-2 bg-slate-50 border-b border-[#E2E8F0] flex gap-2", children: [
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
                  ]
                }),
              /* @__PURE__ */ jsx("div", {
                  className: "max-h-[300px] overflow-y-auto divide-y divide-[#E2E8F0]", children: filteredNotifications.length === 0 ? /* @__PURE__ */ jsx("div", { className: "p-8 text-center text-xs text-[#94A3B8] font-medium", children: "No alerts matches this filter criteria." }) : filteredNotifications.map((n) => /* @__PURE__ */ jsxs(
                    "div",
                    {
                      onClick: () => markNotificationRead(n.notification_id),
                      className: `p-4 transition-colors hover:bg-[#F8FAFC] cursor-pointer ${n.is_read ? "opacity-60" : ""} ${severityStyles[n.severity]}`,
                      children: [
                    /* @__PURE__ */ jsxs("div", {
                        className: "flex justify-between items-start gap-2", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-[#0F172A]", children: n.title }),
                      /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#94A3B8] whitespace-nowrap", children: formatDate(n.created_at) })
                        ]
                      }),
                    /* @__PURE__ */ jsx("p", { className: "text-[11px] text-[#64748B] mt-1 leading-normal", children: n.message }),
                    /* @__PURE__ */ jsxs("div", {
                        className: "flex gap-1.5 mt-2", children: [
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
                        ]
                      })
                      ]
                    },
                    n.notification_id
                  ))
                })
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            className: "flex items-center gap-2.5 pl-2 border-l border-[#E2E8F0]", children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: currentUser.profile_image,
                alt: "Profile",
                className: "w-9 h-9 rounded-full object-cover border border-[#E2E8F0]"
              }
            ),
            /* @__PURE__ */ jsxs("div", {
              className: "hidden sm:block text-left", children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs font-bold text-[#0F172A]", children: currentUser.first_name }),
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] font-medium", children: currentUser.role_name })
              ]
            })
            ]
          })
          ]
        })
        ]
      }),
      /* @__PURE__ */ jsx("main", {
        className: "flex-1 overflow-y-auto relative", children: 
        /* @__PURE__ */ jsx(AnimatePresence, { mode: "wait", children: 
          /* @__PURE__ */ jsxs(motion.div, {
            key: activeTab,
            initial: shouldReduceMotion ? {} : { opacity: 0, x: 15 },
            animate: { opacity: 1, x: 0 },
            exit: shouldReduceMotion ? {} : { opacity: 0, x: -15 },
            transition: { duration: 0.22, ease: "easeOut" },
            className: "w-full min-h-full",
            children: [
              activeTab === "dashboard" && /* @__PURE__ */ jsxs("div", {
                className: "animate-cross-fade flex flex-col gap-6", children: [
              /* @__PURE__ */ jsx(AdminDashboard, { search, mode: "dashboard" }),
          /* @__PURE__ */ jsx("div", {
              className: "px-8 pb-8", children: /* @__PURE__ */ jsxs("div", {
                className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden", children: [
            /* @__PURE__ */ jsxs("div", {
                  className: "px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between", children: [
              /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-[#10B981] dot-pulse-green shrink-0" }),
                      /* @__PURE__ */ jsxs("div", {
                            children: [
                        /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Live Inventory Stock Movements Ledger" }),
                        /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: "Real-time ledger audit log tracking all warehouse adjustments, transfers, and additions" })
                            ]
                          })
                    ]
                  }),
              /* @__PURE__ */ jsx(motion.div, {
                whileHover: shouldReduceMotion ? {} : { scale: 1.03 },
                className: "cursor-pointer select-none",
                children: /* @__PURE__ */ jsx(Badge, { text: "Append-Only Log", variant: "info" })
              })
                  ]
                }),
            /* @__PURE__ */ jsx("div", {
                  className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", {
                    className: "w-full text-left border-collapse text-xs", children: [
              /* @__PURE__ */ jsx("thead", {
                      children: /* @__PURE__ */ jsxs("tr", {
                        className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                          ["Date & Time", "Product Name", "Warehouse", "Action Type", "Adjustment", "Operator / Performed By"].map((header, hIdx) => (
                            /* @__PURE__ */ jsx(motion.th, {
                              initial: shouldReduceMotion ? {} : { opacity: 0 },
                              animate: { opacity: 1 },
                              transition: { delay: hIdx * 0.06 },
                              className: `px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider ${hIdx === 4 ? "text-right" : ""}`,
                              children: header
                            }, hIdx)
                          ))
                        ]
                      })
                    }),
              /* @__PURE__ */ jsx("tbody", {
                      children: stockMovements.slice(0, 5).map((m, idx) => /* @__PURE__ */ jsxs(
                        motion.tr,
                        {
                          initial: shouldReduceMotion ? {} : { opacity: 0, y: -10 },
                          animate: { opacity: 1, y: 0 },
                          transition: { duration: 0.25, ease: "easeOut", delay: idx * 0.05 },
                          className: "border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors data-row",
                          children: [
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3 text-[#64748B] font-medium", children: formatDate(m.created_at) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3 font-bold text-[#0F172A]", children: m.product_name }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3 text-[#64748B]", children: m.warehouse_name }),
                    /* @__PURE__ */ jsx("td", {
                            className: "px-6 py-3", children: /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: `inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${m.movement_type === "IN" ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#FEF2F2] text-[#EF4444]"}`,
                                children: m.movement_type
                              }
                            )
                          }),
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
                      ))
                    })
                    ]
                  })
                })
                ]
              })
            })
            ]
          }),
          activeTab === "products" && /* @__PURE__ */ jsx(AdminDashboard, { search, mode: "products" }),
          activeTab === "suppliers" && /* @__PURE__ */ jsxs("div", {
            className: "page-container animate-cross-fade", children: [
          /* @__PURE__ */ jsxs("div", {
              className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", {
                children: [
              /* @__PURE__ */ jsx(
                  "h1",
                  {
                    className: "text-2xl font-bold text-[#0F172A]",
                    style: { fontFamily: "Outfit, sans-serif" },
                    children: "Suppliers & Vendors Directory"
                  }
                ),
              /* @__PURE__ */ jsxs("p", {
                  className: "text-xs text-[#64748B] mt-1", children: [
                    suppliers.length,
                    " active vendor relationships \xB7 Avg lead time",
                    " ",
                    Math.round(
                      suppliers.reduce((a, s) => a + s.lead_time_days, 0) / (suppliers.length || 1)
                    ),
                    " ",
                    "days"
                  ]
                })
                ]
              }),
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
              ]
            }),
              supplierToast && /* @__PURE__ */ jsxs("div", {
                className: "bg-[#ECFDF5] border border-emerald-200 px-4 py-3 rounded-lg flex items-center gap-2 text-[11px] font-bold text-emerald-700 animate-fade-up", children: [
            /* @__PURE__ */ jsx(Check, { size: 14 }),
                  " ",
                  supplierToast
                ]
              }),
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
                return /* @__PURE__ */ jsxs(Fragment, {
                  children: [
              /* @__PURE__ */ jsxs("div", {
                    className: "flex flex-col gap-4 bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm", children: [
                /* @__PURE__ */ jsxs("div", {
                      className: "flex items-center justify-between gap-4 flex-wrap animate-fade-up", children: [
                  /* @__PURE__ */ jsxs("div", {
                        className: "relative flex-1 max-w-xs", children: [
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
                        ]
                      }),
                  /* @__PURE__ */ jsx("div", {
                        className: "flex gap-3 text-xs", children: [
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
                        ))
                      })
                      ]
                    }),
                /* @__PURE__ */ jsxs("div", {
                      className: "flex items-center gap-4 flex-wrap pt-3 border-t border-[#F1F5F9] text-xs", children: [
                  /* @__PURE__ */ jsxs("div", {
                        className: "flex items-center gap-1.5", children: [
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
                        ]
                      }),
                  /* @__PURE__ */ jsxs("div", {
                        className: "flex items-center gap-1.5", children: [
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
                        ]
                      }),
                  /* @__PURE__ */ jsxs("div", {
                        className: "flex items-center gap-1.5", children: [
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
                        ]
                      })
                      ]
                    })
                    ]
                  }),
              /* @__PURE__ */ jsx("div", {
                    className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden", children: /* @__PURE__ */ jsx("div", {
                      className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", {
                        className: "w-full text-left border-collapse text-xs", children: [
                /* @__PURE__ */ jsx("thead", {
                          children: /* @__PURE__ */ jsxs("tr", {
                            className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Company Name" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Contact Person" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Email & Phone" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Location" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Lead Time" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Reliability" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Actions" })
                            ]
                          })
                        }),
                /* @__PURE__ */ jsxs("tbody", {
                          children: [
                            filteredSuppliers.map((s) => /* @__PURE__ */ jsxs(
                              "tr",
                              {
                                className: "data-row border-b border-[#E2E8F0] group",
                                children: [
                        /* @__PURE__ */ jsxs("td", {
                                  className: "px-6 py-4", children: [
                          /* @__PURE__ */ jsx("div", { className: "font-bold text-[#0F172A]", children: s.company_name }),
                          /* @__PURE__ */ jsxs("div", {
                                    className: "text-[9px] text-[#94A3B8] mt-0.5", children: [
                                      "ID: ",
                                      s.supplier_id
                                    ]
                                  })
                                  ]
                                }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-4 font-medium text-[#64748B]", children: s.contact_person }),
                        /* @__PURE__ */ jsxs("td", {
                                  className: "px-6 py-4", children: [
                          /* @__PURE__ */ jsx("div", { className: "text-[#64748B]", children: s.email }),
                          /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#94A3B8]", children: s.phone })
                                  ]
                                }),
                        /* @__PURE__ */ jsx("td", {
                                  className: "px-6 py-4", children: /* @__PURE__ */ jsxs("div", {
                                    className: "flex items-center gap-1 text-[#64748B]", children: [
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
                                    ]
                                  })
                                }),
                        /* @__PURE__ */ jsx("td", {
                                  className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsxs(
                                    "span",
                                    {
                                      className: `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${s.lead_time_days <= 5 ? "bg-emerald-50 text-emerald-700" : s.lead_time_days <= 10 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`,
                                      children: [
                                        s.lead_time_days,
                                        "d"
                                      ]
                                    }
                                  )
                                }),
                        /* @__PURE__ */ jsx("td", {
                                  className: "px-6 py-4", children: /* @__PURE__ */ jsx(
                                    ReliabilityRating,
                                    {
                                      score: s.reliability_score
                                    }
                                  )
                                }),
                        /* @__PURE__ */ jsx("td", {
                                  className: "px-6 py-4 text-center", children: deleteConfirmId === s.supplier_id ? /* @__PURE__ */ jsxs("div", {
                                    className: "flex items-center gap-1 justify-center", children: [
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
                                    ]
                                  }) : /* @__PURE__ */ jsxs("div", {
                                    className: "flex items-center gap-1.5 justify-center opacity-0 group-hover:opacity-100 transition-opacity", children: [
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
                                    ]
                                  })
                                })
                                ]
                              },
                              s.supplier_id
                            )),
                             filteredSuppliers.length === 0 && /* @__PURE__ */ jsx("tr", {
                               children: /* @__PURE__ */ jsx(
                                 "td",
                                 {
                                   colSpan: 7,
                                   className: "text-center py-12 text-xs text-[#94A3B8] font-medium",
                                   children: /* @__PURE__ */ jsxs("div", {
                                     className: "flex flex-col items-center justify-center gap-3",
                                     children: [
                                       /* @__PURE__ */ jsx(motion.div, {
                                         animate: shouldReduceMotion ? {} : { y: [0, -4, 0] },
                                         transition: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                                         className: "text-[#EF4444] opacity-80",
                                         children: /* @__PURE__ */ jsx(MapPin, { size: 32 })
                                       }),
                                       /* @__PURE__ */ jsxs("p", {
                                         children: [
                                           "No suppliers match your search. ",
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
                                       })
                                     ]
                                   })
                                 }
                               )
                             })
                          ]
                        })
                        ]
                      })
                    })
                  }),
                    supplierModalOpen && /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",
                        onClick: (e) => {
                          if (e.target === e.currentTarget)
                            setSupplierModalOpen(false);
                        },
                        children: /* @__PURE__ */ jsxs("div", {
                          className: "bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-[#E2E8F0] overflow-hidden animate-dropdown", children: [
                    /* @__PURE__ */ jsxs("div", {
                            className: "flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0]", children: [
                      /* @__PURE__ */ jsxs("div", {
                              children: [
                        /* @__PURE__ */ jsx(
                                "h3",
                                {
                                  className: "text-sm font-bold text-[#0F172A]",
                                  style: { fontFamily: "Outfit, sans-serif" },
                                  children: editingSupplier ? "Edit Supplier Profile" : "Onboard New Supplier"
                                }
                              ),
                        /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: editingSupplier ? `Updating: ${editingSupplier.company_name}` : "Register a new vendor in the supplier directory" })
                              ]
                            }),
                      /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => setSupplierModalOpen(false),
                                className: "w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] border-0 bg-transparent cursor-pointer text-lg leading-none",
                                children: "\xD7"
                              }
                            )
                            ]
                          }),
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
                          /* @__PURE__ */ jsxs("div", {
                                className: "grid grid-cols-2 gap-3", children: [
                            /* @__PURE__ */ jsxs("div", {
                                  children: [
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
                                  ]
                                }),
                            /* @__PURE__ */ jsxs("div", {
                                  children: [
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
                                  ]
                                })
                                ]
                              }),
                          /* @__PURE__ */ jsxs("div", {
                                className: "grid grid-cols-2 gap-3", children: [
                            /* @__PURE__ */ jsxs("div", {
                                  children: [
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
                                  ]
                                }),
                            /* @__PURE__ */ jsxs("div", {
                                  children: [
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
                                  ]
                                })
                                ]
                              }),
                          /* @__PURE__ */ jsxs("div", {
                                className: "grid grid-cols-2 gap-3", children: [
                            /* @__PURE__ */ jsxs("div", {
                                  children: [
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
                                  ]
                                }),
                            /* @__PURE__ */ jsxs("div", {
                                  children: [
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
                                  ]
                                })
                                ]
                              }),
                          /* @__PURE__ */ jsxs("div", {
                                className: "grid grid-cols-2 gap-3", children: [
                            /* @__PURE__ */ jsxs("div", {
                                  children: [
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
                                  ]
                                }),
                            /* @__PURE__ */ jsxs("div", {
                                  children: [
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
                                  ]
                                })
                                ]
                              }),
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
                          ]
                        })
                      }
                    )
                  ]
                });
              })()
            ]
          }),
          activeTab === "orders" && /* @__PURE__ */ jsxs("div", {
            className: "page-container animate-cross-fade flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", {
              children: [
            /* @__PURE__ */ jsx(
                "h1",
                {
                  className: "text-2xl font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "Buyer & Distributor Orders"
                }
              ),
              /* @__PURE__ */ jsx(motion.div, {
                initial: shouldReduceMotion ? { width: "100%" } : { width: 0 },
                animate: { width: "100%" },
                transition: { duration: 0.4, ease: "easeOut" },
                className: "h-[2px] bg-[#E2E8F0] mt-1"
              }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1.5", children: "Track incoming buyer and distributor orders, shipment status, and details." })
              ]
            }),
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
                const buyerOrders = filteredOrders.filter((o) => o.order_type === "B2C");
                const distributorOrders = filteredOrders.filter((o) => o.order_type === "B2B");
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
                return /* @__PURE__ */ jsxs(Fragment, {
                  children: [
              /* @__PURE__ */ jsxs("div", {
                    className: "flex flex-col gap-4 bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm", children: [
                /* @__PURE__ */ jsxs("div", {
                      className: "flex items-center justify-between gap-4 flex-wrap", children: [
                  /* @__PURE__ */ jsxs("div", {
                        className: "relative flex-1 max-w-xs animate-fade-up", children: [
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
                        ]
                      }),
                  /* @__PURE__ */ jsx("div", {
                        className: "flex gap-2", children: /* @__PURE__ */ jsx(
                          motion.button,
                          {
                            type: "button",
                            animate: clearShake && !shouldReduceMotion ? { x: [-3, 3, -3, 3, 0] } : { x: 0 },
                            transition: { duration: 0.2 },
                            onClick: () => {
                              setClearShake(true);
                              setTimeout(() => {
                                setClearShake(false);
                                setOrdersSearch("");
                                setOrdersTypeFilter("all");
                                setInvoiceStatusFilter("all");
                                setRiskFilter("all");
                              }, 200);
                            },
                            className: "px-3.5 py-2 border border-[#E2E8F0] hover:border-rose-400 hover:text-rose-600 rounded-lg text-xs text-[#64748B] bg-white cursor-pointer transition-colors duration-150 font-semibold",
                            children: "Clear Filters"
                          }
                        )
                      })
                      ]
                    }),
                /* @__PURE__ */ jsxs("div", {
                      className: "flex items-center gap-4 flex-wrap pt-3 border-t border-[#F1F5F9] text-xs", children: [
                  /* @__PURE__ */ jsxs("div", {
                        className: "flex items-center gap-1.5", children: [
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
                        ]
                      }),
                  /* @__PURE__ */ jsxs("div", {
                        className: "flex items-center gap-1.5", children: [
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
                        ]
                      }),
                  /* @__PURE__ */ jsxs("div", {
                        className: "flex items-center gap-1.5", children: [
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
                        ]
                      })
                      ]
                    })
                    ]
                  }),
              // Buyer Orders
              /* @__PURE__ */ jsxs("div", {
                    className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: [
                /* @__PURE__ */ jsxs("div", {
                      className: "px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50", children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Buyer Orders" }),
                  /* @__PURE__ */ jsx(motion.div, {
                    initial: shouldReduceMotion ? {} : { scale: 0.8 },
                    animate: { scale: 1 },
                    transition: { type: "spring", stiffness: 350, damping: 15 },
                    children: /* @__PURE__ */ jsx(
                      Badge,
                      {
                        text: `${buyerOrders.length} Orders`,
                        variant: "neutral"
                      }
                    )
                  })
                      ]
                    }),
                /* @__PURE__ */ jsx("div", {
                      className: "overflow-x-auto flex-1", children: /* @__PURE__ */ jsxs("table", {
                        className: "w-full text-left border-collapse text-xs", children: [
                  /* @__PURE__ */ jsx("thead", {
                          children: /* @__PURE__ */ jsxs("tr", {
                            className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Products Ordered" }),
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Order No & Details" }),
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Status" }),
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Total Amount" }),
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Actions" })
                            ]
                          })
                        }),
                  /* @__PURE__ */ jsx("tbody", {
                          children: buyerOrders.length === 0 ? [1, 2, 3].map((k) => /* @__PURE__ */ jsxs("tr", {
                            key: k,
                            className: "border-b border-[#E2E8F0] animate-pulse",
                            children: [
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-28 h-3 bg-slate-100 rounded shimmer-skeleton" }) }),
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-20 h-3 bg-slate-100 rounded shimmer-skeleton" }) }),
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-12 h-3 bg-slate-100 rounded shimmer-skeleton mx-auto" }) }),
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-16 h-3 bg-slate-100 rounded shimmer-skeleton ml-auto" }) }),
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-14 h-3 bg-slate-100 rounded shimmer-skeleton mx-auto" }) })
                            ]
                          }, k)) : buyerOrders.map((o) => /* @__PURE__ */ jsxs(
                            "tr",
                            {
                              className: "data-row border-b border-[#E2E8F0]",
                              children: [
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 font-bold text-[#0F172A] max-w-xs truncate", children: o.items_summary || "No items summary" }),
                        /* @__PURE__ */ jsx("td", {
                                className: "px-6 py-3.5", children: /* @__PURE__ */ jsxs("div", {
                                  children: [
                          /* @__PURE__ */ jsx("span", { className: "bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono text-[#0F172A] font-semibold text-[10px]", children: o.order_number }),
                          /* @__PURE__ */ jsxs("div", {
                                    className: "text-[10px] text-[#64748B] font-medium mt-0.5", children: [
                                      "Buyer: ",
                                      o.customer_email || "demo@commerceiq.com"
                                    ]
                                  }),
                          /* @__PURE__ */ jsx("div", { className: "text-[9px] text-[#94A3B8] mt-0.5", children: formatDate(o.order_date) })
                                  ]
                                })
                              }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-center", children: /* @__PURE__ */ jsx(OrderStatusBadge, { status: o.status }) }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-right font-bold text-[#0F172A]", children: formatCurrency(o.total_amount) }),
                        /* @__PURE__ */ jsxs("td", {
                                className: "px-6 py-3.5 text-center flex justify-center gap-1.5", children: [
                                  (o.status === "PROCEED" || o.status === "PENDING" || o.status === "CONFIRMED" || o.status === "PROCESSING") && (
                            /* @__PURE__ */ jsx("button", {
                                    onClick: () => handleShipOrder(o.order_id),
                                    className: "px-2.5 py-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white border-0 rounded text-[10px] font-bold cursor-pointer transition-colors shadow-sm",
                                    children: "Ship"
                                  })
                                  )
                                ]
                              })
                              ]
                            },
                            o.order_id
                          ))
                        })
                        ]
                      })
                    })
                    ]
                  }),
              // Distributor Orders
              /* @__PURE__ */ jsxs("div", {
                    className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: [
                /* @__PURE__ */ jsxs("div", {
                      className: "px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50", children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Distributor Orders" }),
                  /* @__PURE__ */ jsx(motion.div, {
                    initial: shouldReduceMotion ? {} : { scale: 0.8 },
                    animate: { scale: 1 },
                    transition: { type: "spring", stiffness: 350, damping: 15 },
                    children: /* @__PURE__ */ jsx(
                      Badge,
                      {
                        text: `${distributorOrders.length} Orders`,
                        variant: "neutral"
                      }
                    )
                  })
                      ]
                    }),
                /* @__PURE__ */ jsx("div", {
                      className: "overflow-x-auto flex-1", children: /* @__PURE__ */ jsxs("table", {
                        className: "w-full text-left border-collapse text-xs", children: [
                  /* @__PURE__ */ jsx("thead", {
                          children: /* @__PURE__ */ jsxs("tr", {
                            className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Products Ordered" }),
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Order No & Details" }),
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Status" }),
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Total Amount" }),
                    /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Actions" })
                            ]
                          })
                        }),
                  /* @__PURE__ */ jsx("tbody", {
                          children: distributorOrders.length === 0 ? [1, 2, 3].map((k) => /* @__PURE__ */ jsxs("tr", {
                            key: k,
                            className: "border-b border-[#E2E8F0] animate-pulse",
                            children: [
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-28 h-3 bg-slate-100 rounded shimmer-skeleton" }) }),
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-20 h-3 bg-slate-100 rounded shimmer-skeleton" }) }),
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-12 h-3 bg-slate-100 rounded shimmer-skeleton mx-auto" }) }),
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-16 h-3 bg-slate-100 rounded shimmer-skeleton ml-auto" }) }),
                              /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-14 h-3 bg-slate-100 rounded shimmer-skeleton mx-auto" }) })
                            ]
                          }, k)) : distributorOrders.map((o) => /* @__PURE__ */ jsxs(
                            "tr",
                            {
                              className: "data-row border-b border-[#E2E8F0]",
                              children: [
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 font-bold text-[#0F172A] max-w-xs truncate", children: o.items_summary || "No items summary" }),
                        /* @__PURE__ */ jsx("td", {
                                className: "px-6 py-3.5", children: /* @__PURE__ */ jsxs("div", {
                                  children: [
                          /* @__PURE__ */ jsx("span", { className: "bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono text-[#0F172A] font-semibold text-[10px]", children: o.order_number }),
                          /* @__PURE__ */ jsxs("div", {
                                    className: "text-[10px] text-[#64748B] font-medium mt-0.5", children: [
                                      "Distributor: ",
                                      o.customer_email || "demo@commerceiq.com"
                                    ]
                                  }),
                          /* @__PURE__ */ jsx("div", { className: "text-[9px] text-[#94A3B8] mt-0.5", children: formatDate(o.order_date) })
                                  ]
                                })
                              }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-center", children: /* @__PURE__ */ jsx(OrderStatusBadge, { status: o.status }) }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-right font-bold text-[#0F172A]", children: formatCurrency(o.total_amount) }),
                        /* @__PURE__ */ jsxs("td", {
                                className: "px-6 py-3.5 text-center flex justify-center gap-1.5", children: [
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
                                ]
                              })
                              ]
                            },
                            o.order_id
                          ))
                        })
                        ]
                      })
                    })
                    ]
                  })
                  ]
                });
              })()
            ]
          }),
          activeTab === "billing" && /* @__PURE__ */ jsxs("div", {
            className: "page-container animate-cross-fade flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", {
              children: [
            /* @__PURE__ */ jsx(
                "h1",
                {
                  className: "text-2xl font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "Billing & Reconciliations"
                }
              ),
              /* @__PURE__ */ jsx(motion.div, {
                initial: shouldReduceMotion ? { width: "100%" } : { width: 0 },
                animate: { width: "100%" },
                transition: { duration: 0.4, ease: "easeOut" },
                className: "h-[2px] bg-[#E2E8F0] mt-1"
              }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1.5", children: "Reconcile cash allocations, check status of pending invoices, and review reconciled payment logs." })
              ]
            }),
          /* @__PURE__ */ jsxs("div", {
              className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
            /* @__PURE__ */ jsxs("div", {
                className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden lg:col-span-2 flex flex-col", children: [
              /* @__PURE__ */ jsxs("div", {
                  className: "px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50", children: [
                /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Receivable Invoices" }),
                /* @__PURE__ */ jsx(motion.div, {
                  initial: shouldReduceMotion ? {} : { scale: 0.8 },
                  animate: { scale: 1 },
                  transition: { type: "spring", stiffness: 350, damping: 15 },
                  children: /* @__PURE__ */ jsx(
                    Badge,
                    {
                      text: `${invoices.length} Invoices`,
                      variant: "neutral"
                    }
                  )
                })
                  ]
                }),
              /* @__PURE__ */ jsx("div", {
                  className: "overflow-x-auto flex-1", children: /* @__PURE__ */ jsxs("table", {
                    className: "w-full text-left border-collapse text-xs", children: [
                /* @__PURE__ */ jsx("thead", {
                      children: /* @__PURE__ */ jsxs("tr", {
                        className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Invoice No" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Status" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Total" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Payment Allocation" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Late Probability" })
                        ]
                      })
                    }),
                /* @__PURE__ */ jsx("tbody", {
                      children: invoices.length === 0 ? /* @__PURE__ */ jsx("tr", {
                        children: /* @__PURE__ */ jsx(
                          "td",
                          {
                            colSpan: 5,
                            className: "text-center py-8 text-xs text-[#94A3B8] font-medium",
                            children: "No invoices match filter."
                          }
                        )
                      }) : invoices.map((inv, idx) => {
                        const allocationPct = inv.total_amount > 0 ? inv.amount_paid / inv.total_amount * 100 : 0;
                        return /* @__PURE__ */ jsxs(
                          motion.tr,
                          {
                            initial: shouldReduceMotion ? {} : { opacity: 0, y: 10 },
                            animate: { opacity: 1, y: 0 },
                            transition: { duration: 0.22, delay: idx * 0.04 },
                            className: "data-row border-b border-[#E2E8F0]",
                            children: [
                        /* @__PURE__ */ jsx("td", {
                              className: "px-6 py-3.5", children: /* @__PURE__ */ jsxs("div", {
                                children: [
                          /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: inv.invoice_number }),
                          /* @__PURE__ */ jsxs("div", {
                                  className: "text-[10px] text-[#94A3B8] mt-0.5", children: [
                                    "Due: ",
                                    formatDate(inv.due_date)
                                  ]
                                })
                                ]
                              })
                            }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5", children: /* @__PURE__ */ jsx(InvoiceStatusBadge, { status: inv.status }) }),
                        /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-right font-bold text-[#0F172A]", children: formatCurrency(inv.total_amount) }),
                        /* @__PURE__ */ jsxs("td", {
                              className: "px-6 py-3.5", children: [
                          /* @__PURE__ */ jsxs("div", {
                                className: "flex justify-between items-center text-[10px] text-[#64748B] mb-1 font-semibold", children: [
                            /* @__PURE__ */ jsxs("span", { children: [
                              formatCurrency(inv.amount_paid),
                              " paid"
                            ] }),
                            /* @__PURE__ */ jsxs("span", { children: [
                              Math.round(allocationPct),
                              "%"
                            ] })
                                ]
                              }),
                          /* @__PURE__ */ jsx("div", {
                                className: "w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                                  "div",
                                  {
                                    className: "h-full bg-emerald-500 rounded-full transition-all duration-500",
                                    style: {
                                      width: `${allocationPct}%`
                                    }
                                  }
                                )
                              })
                              ]
                            }),
                        /* @__PURE__ */ jsx("td", {
                              className: "px-6 py-3.5", children: /* @__PURE__ */ jsx(
                                LatePaymentRiskBadge,
                                {
                                  probability: inv.late_payment_probability
                                }
                              )
                            })
                            ]
                          },
                          inv.invoice_id
                        );
                      })
                    })
                    ]
                  })
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col gap-4", children: [
                /* @__PURE__ */ jsxs("div", {
                    children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Simulate Payment Allocation" }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: "Allocate cash transfers, checks or mobile wallet transactions to outstanding B2B invoices" })
                    ]
                  }),
                /* @__PURE__ */ jsxs(
                    "form",
                    {
                      onSubmit: handleRecordAllocationSubmit,
                      className: "flex flex-col gap-3",
                      children: [
                      /* @__PURE__ */ jsxs(motion.div, {
                        initial: shouldReduceMotion ? {} : { y: 8, opacity: 0 },
                        animate: { y: 0, opacity: 1 },
                        transition: { delay: 0.05, duration: 0.25 },
                        children: [
                        /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Select Open Invoice" }),
                        /* @__PURE__ */ jsx(
                          "select",
                          {
                            className: "input-field py-2 text-xs",
                            value: allocInvoiceId,
                            onChange: (e) => setAllocInvoiceId(e.target.value),
                            required: true,
                            children: invoices.filter((inv) => inv.status !== "PAID").map((inv) => /* @__PURE__ */ jsxs("option", {
                              value: inv.invoice_id, children: [
                                inv.invoice_number,
                                " (Unpaid:",
                                " ",
                                formatCurrency(
                                  inv.total_amount - inv.amount_paid
                                ),
                                ")"
                              ]
                            }, inv.invoice_id))
                          }
                        )
                        ]
                      }),
                      /* @__PURE__ */ jsxs(motion.div, {
                        initial: shouldReduceMotion ? {} : { y: 8, opacity: 0 },
                        animate: { y: 0, opacity: 1 },
                        transition: { delay: 0.1, duration: 0.25 },
                        className: "grid grid-cols-2 gap-2", children: [
                        /* @__PURE__ */ jsxs("div", {
                          children: [
                          /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Method" }),
                          /* @__PURE__ */ jsxs("div", {
                            className: "relative",
                            children: [
                              allocMethod === "JAZZCASH" && /* @__PURE__ */ jsx("span", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 font-extrabold text-[8px] bg-amber-500 text-black px-1.5 py-0.5 rounded border border-amber-600 pointer-events-none scale-90", children: "JazzCash" }),
                              allocMethod === "EASYPAISA" && /* @__PURE__ */ jsx("span", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 font-extrabold text-[8px] bg-emerald-600 text-white px-1.5 py-0.5 rounded border border-emerald-700 pointer-events-none scale-90", children: "EasyPaisa" }),
                              allocMethod === "BANK_TRANSFER" && /* @__PURE__ */ jsx("span", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded pointer-events-none scale-90", children: "Bank" }),
                              allocMethod === "CARD" && /* @__PURE__ */ jsx("span", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded pointer-events-none scale-90", children: "Card" }),
                              /* @__PURE__ */ jsxs(
                                "select",
                                {
                                  className: "input-field py-2 text-xs",
                                  style: { paddingLeft: allocMethod ? "68px" : "10px" },
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
                            ]
                          })
                          ]
                        }),
                        /* @__PURE__ */ jsxs("div", {
                          children: [
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
                          ]
                        })
                        ]
                      }),
                      /* @__PURE__ */ jsxs(motion.div, {
                        initial: shouldReduceMotion ? {} : { y: 8, opacity: 0 },
                        animate: { y: 0, opacity: 1 },
                        transition: { delay: 0.15, duration: 0.25 },
                        children: [
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
                        ]
                      }),
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
                    allocSuccess && /* @__PURE__ */ jsxs("div", {
                      className: "bg-emerald-50 border border-emerald-300/40 p-3 rounded-lg flex items-start gap-2 animate-fade-up text-emerald-800 text-[11px] font-medium leading-normal", children: [
                  /* @__PURE__ */ jsx(
                        Check,
                        {
                          size: 14,
                          className: "text-[#10B981] flex-shrink-0 mt-0.5"
                        }
                      ),
                  /* @__PURE__ */ jsx("span", { children: allocSuccess })
                      ]
                    })
                  ]
                })
                ]
              }),
            /* @__PURE__ */ jsxs(motion.div, {
                initial: shouldReduceMotion ? {} : { x: 30, opacity: 0 },
                animate: { x: 0, opacity: 1 },
                transition: { duration: 0.35, ease: "easeOut", delay: 0.2 },
                className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: [
              /* @__PURE__ */ jsx("div", { className: "px-6 py-4 border-b border-[#E2E8F0]", children: /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-[#0F172A]", children: "Settlement & Reconciled Payments Logs" }) }),
              /* @__PURE__ */ jsx("div", {
                  className: "overflow-x-auto flex-1", children: /* @__PURE__ */ jsxs("table", {
                    className: "w-full text-left border-collapse text-xs", children: [
                /* @__PURE__ */ jsx("thead", {
                      children: /* @__PURE__ */ jsxs("tr", {
                        className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Payment Reference" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Customer Name" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Amount Received" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Method" }),
                  /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Settlement status" })
                        ]
                      })
                    }),
                /* @__PURE__ */ jsx("tbody", {
                      children: payments.map((p) => /* @__PURE__ */ jsxs(
                        "tr",
                        {
                          className: "data-row border-b border-[#E2E8F0]",
                          children: [
                      /* @__PURE__ */ jsx("td", {
                            className: "px-6 py-3", children: /* @__PURE__ */ jsxs("div", {
                              children: [
                        /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: p.reference_no }),
                        /* @__PURE__ */ jsx("div", { className: "text-[9px] text-[#94A3B8] mt-0.5", children: formatDate(p.payment_date) })
                              ]
                            })
                          }),
                      /* @__PURE__ */ jsx("td", { className: "px-6 py-3 font-semibold text-[#0F172A]", children: p.customer_name }),
                      /* @__PURE__ */ jsx("td", { className: "px-6 py-3 text-right font-bold text-emerald-600", children: formatCurrency(p.amount) }),
                      /* @__PURE__ */ jsx("td", { className: "px-6 py-3", children: /* @__PURE__ */ jsx(PaymentMethodIcon, { method: p.payment_method }) }),
                      /* @__PURE__ */ jsx("td", {
                            className: "px-6 py-3", children: /* @__PURE__ */ jsx(
                              "span",
                              {
                                className: `inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${p.status === "RECONCILED" ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#EEF2FF] text-[#4F46E5]"}`,
                                children: p.status
                              }
                            )
                          })
                          ]
                        },
                        p.payment_id
                      ))
                    })
                    ]
                  })
                })
                ]
              })
              ]
            })
            ]
          }),
          activeTab === "negotiations" && /* @__PURE__ */ jsxs("div", {
            className: "page-container animate-cross-fade flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", {
              children: [
            /* @__PURE__ */ jsx(
                "h1",
                {
                  className: "text-2xl font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "Wholesale Quotations & Negotiations"
                }
              ),
              /* @__PURE__ */ jsx(motion.div, {
                initial: shouldReduceMotion ? { width: "100%" } : { width: 0 },
                animate: { width: "100%" },
                transition: { duration: 0.4, ease: "easeOut" },
                className: "h-[2px] bg-[#E2E8F0] mt-1"
              }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1.5", children: "Review incoming quotes from distributors, approve standard submissions, reject requests, or propose counter pricing." })
              ]
            }),
          /* @__PURE__ */ jsxs("div", {
              className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: [
            /* @__PURE__ */ jsxs("div", {
                className: "px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] uppercase tracking-wider", children: "Quotations Registry" }),
              /* @__PURE__ */ jsx(motion.div, {
                initial: shouldReduceMotion ? {} : { scale: 0.8 },
                animate: { scale: 1 },
                transition: { type: "spring", stiffness: 350, damping: 15 },
                children: /* @__PURE__ */ jsx(
                  Badge,
                  {
                    text: `${quotations.length} Active Records`,
                    variant: "neutral"
                  }
                )
              })
                ]
              }),
            /* @__PURE__ */ jsx("div", {
                className: "overflow-x-auto flex-1", children: /* @__PURE__ */ jsxs("table", {
                  className: "w-full text-left border-collapse text-xs", children: [
              /* @__PURE__ */ jsx("thead", {
                    children: /* @__PURE__ */ jsxs("tr", {
                      className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Quote Number" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Submitted On" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Estimated Value" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Status" }),
                /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Actions" })
                      ]
                    })
                  }),
              /* @__PURE__ */ jsx("tbody", {
                    children: quotations.length === 0 ? /* @__PURE__ */ jsx("tr", {
                      children: /* @__PURE__ */ jsx(
                        "td",
                        {
                          colSpan: 5,
                          className: "text-center py-10 text-[#94A3B8] font-medium",
                          children: /* @__PURE__ */ jsxs("div", {
                            className: "flex flex-col items-center justify-center py-6 max-w-sm mx-auto",
                            children: [
                              /* @__PURE__ */ jsxs("div", {
                                className: "flex flex-col items-center relative py-4 w-full gap-6 opacity-30",
                                children: [
                                  /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] bg-slate-300 border-dashed border-l" }),
                                  [1, 2, 3].map((node) => (
                                    /* @__PURE__ */ jsxs("div", {
                                      key: node,
                                      className: "flex items-center justify-center gap-3 z-10 w-full",
                                      children: [
                                        /* @__PURE__ */ jsx("div", { className: "w-4 h-4 rounded-full border border-slate-400 bg-white" }),
                                        /* @__PURE__ */ jsx("div", { className: "h-2 w-20 bg-slate-300 rounded" })
                                      ]
                                    }, node)
                                  ))
                                ]
                              }),
                              /* @__PURE__ */ jsx("p", { className: "text-xs text-[#94A3B8] font-semibold mt-2", children: "No quotation requests logged in database." })
                            ]
                          })
                        }
                      )
                    }) : quotations.map((q) => /* @__PURE__ */ jsxs(
                      "tr",
                      {
                        className: "data-row border-b border-[#E2E8F0]",
                        children: [
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 font-bold text-[#0F172A]", children: q.quotation_number }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-[#64748B]", children: formatDate(q.created_at) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 font-bold text-[#0F172A]", children: /* @__PURE__ */ jsx(CountUp, { value: q.total_amount }) }),
                    /* @__PURE__ */ jsx("td", {
                          className: "px-6 py-3.5", children: /* @__PURE__ */ jsxs("div", {
                            className: "flex items-center", children: [
                              (() => {
                                if (q.status === "APPROVED" || q.status === "ACCEPTED") {
                                  return /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-[#10B981] dot-pulse-green shrink-0 mr-1.5 inline-block" });
                                }
                                if (q.status === "NEGOTIATING" || q.status === "DRAFT") {
                                  return /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-[#F59E0B] dot-pulse-amber shrink-0 mr-1.5 inline-block" });
                                }
                                if (q.status === "REJECTED") {
                                  return /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-[#EF4444] dot-pulse-red shrink-0 mr-1.5 inline-block" });
                                }
                                return null;
                              })(),
                              /* @__PURE__ */ jsx(Badge, {
                                text: q.status,
                                variant: q.status === "APPROVED" || q.status === "ACCEPTED" ? "success" : q.status === "NEGOTIATING" ? "warning" : q.status === "REJECTED" ? "danger" : "neutral"
                              })
                            ]
                          })
                        }),
                    /* @__PURE__ */ jsxs("td", {
                          className: "px-6 py-3.5 text-center flex justify-center gap-2", children: [
                            (q.status === "DRAFT" || q.status === "NEGOTIATING") && /* @__PURE__ */ jsxs(Fragment, {
                              children: [
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
                              ]
                            }),
                            q.status === "APPROVED" && /* @__PURE__ */ jsx("span", { className: "text-[#10B981] font-bold text-[10px]", children: "Approved & Ready" }),
                            q.status === "ACCEPTED" && /* @__PURE__ */ jsx("span", { className: "text-emerald-600 font-bold text-[10px]", children: "Accepted by Distributor" }),
                            q.status === "REJECTED" && /* @__PURE__ */ jsx("span", { className: "text-rose-600 font-bold text-[10px]", children: "Rejected" })
                          ]
                        })
                        ]
                      },
                      q.quotation_id
                    ))
                  })
                  ]
                })
              })
              ]
            })
            ]
          }),
          activeTab === "settings" && /* @__PURE__ */ jsxs("div", {
            className: "page-container animate-cross-fade flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", {
              children: [
            /* @__PURE__ */ jsx(
                "h1",
                {
                  className: "text-2xl font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "System Settings & Audit Log"
                }
              ),
              /* @__PURE__ */ jsx(motion.div, {
                initial: shouldReduceMotion ? { width: "100%" } : { width: 0 },
                animate: { width: "100%" },
                transition: { duration: 0.4, ease: "easeOut" },
                className: "h-[2px] bg-[#E2E8F0] mt-1"
              }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1.5", children: "Adjust default parameters, currency codes, and view security audit logs." })
              ]
            }),
          /* @__PURE__ */ jsxs("div", {
              className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
            /* @__PURE__ */ jsxs("div", {
                className: "bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col gap-5 text-xs lg:col-span-1", children: [
              /* @__PURE__ */ jsxs("div", {
                  children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-[#0F172A] mb-3", children: "Database Connection Status" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "bg-[#ECFDF5] border border-[#10B981]/20 p-4 rounded-lg flex items-center gap-3 db-status-border", children: [
                  /* @__PURE__ */ jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" }),
                  /* @__PURE__ */ jsxs("div", {
                      children: [
                    /* @__PURE__ */ jsx("p", { className: "font-bold text-[#059669]", children: "MySQL Schema Aligned" }),
                    /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#059669] mt-0.5 leading-normal", children: /* @__PURE__ */ jsx(Typewriter, { text: "Tables verified: roles, users, categories, products, inventory, suppliers, orders, invoices, payments, notification_rules, notifications, audit_logs." }) })
                      ]
                    })
                    ]
                  })
                  ]
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-2", children: [
                /* @__PURE__ */ jsx("label", { className: "font-bold text-[#0F172A]", children: "Default System Currency" }),
                /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: "input-field cursor-not-allowed bg-slate-50 text-xs",
                      value: "PKR (Rs)",
                      disabled: true
                    }
                  )
                  ]
                }),
              /* @__PURE__ */ jsxs("div", {
                  className: "flex flex-col gap-2", children: [
                /* @__PURE__ */ jsx("label", { className: "font-bold text-[#0F172A]", children: "Risk Threshold Classifier (Late Payment Probability)" }),
                /* @__PURE__ */ jsxs("div", {
                    className: "grid grid-cols-3 gap-2", children: [
                      [
                        { label: "LOW RISK", value: "< 30%", bg: "bg-emerald-50/20", text: "text-[#10B981]" },
                        { label: "MEDIUM RISK", value: "30% - 60%", bg: "bg-amber-50/20", text: "text-[#F59E0B]" },
                        { label: "HIGH RISK", value: "> 60%", bg: "bg-red-50/20", text: "text-[#EF4444]" }
                      ].map((risk, idx) => (
                        /* @__PURE__ */ jsxs(
                          motion.div,
                          {
                            initial: shouldReduceMotion ? {} : { scale: 0.85, opacity: 0 },
                            animate: { scale: 1, opacity: 1 },
                            transition: { type: "spring", stiffness: 300, damping: 15, delay: idx * 0.1 },
                            className: `border border-[#E2E8F0] p-2.5 rounded-lg text-center ${risk.bg}`,
                            children: [
                              /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#64748B] font-bold block mb-1", children: risk.label }),
                              /* @__PURE__ */ jsx("span", { className: `${risk.text} font-bold text-[10px]`, children: risk.value })
                            ]
                          },
                          risk.label
                        ))
                      )
                    ]
                  })
                  ]
                })
                ]
              }),
            /* @__PURE__ */ jsxs(motion.div, {
                initial: shouldReduceMotion ? {} : { x: 20, opacity: 0 },
                animate: { x: 0, opacity: 1 },
                transition: { duration: 0.35, ease: "easeOut" },
                className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden lg:col-span-2 flex flex-col", children: [
              /* @__PURE__ */ jsxs("div", {
                  className: "px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between", children: [
                /* @__PURE__ */ jsxs("div", {
                    children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-[#0F172A]", children: "Append-Only Security Audit Ledger" }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: "Captures a complete JSON-diff schema history tracking every operator addition, update or deletion" })
                    ]
                  }),
                /* @__PURE__ */ jsx(Badge, { text: "audit_logs", variant: "neutral" })
                  ]
                }),
              /* @__PURE__ */ jsx("div", {
                  className: "overflow-y-auto flex-1 max-h-[450px]", children: /* @__PURE__ */ jsx("div", {
                    className: "flex flex-col divide-y divide-[#E2E8F0]", children: auditLogs.map((log, idx) => /* @__PURE__ */ jsxs(
                      motion.div,
                      {
                        initial: shouldReduceMotion ? {} : { x: 15, opacity: 0 },
                        animate: { x: 0, opacity: 1 },
                        transition: { duration: 0.35, ease: "easeOut", delay: idx * 0.08 },
                        className: "p-4 hover:bg-[#F8FAFC] transition-colors flex items-start gap-3 text-xs group",
                        children: [
                        /* @__PURE__ */ jsx(motion.div, {
                          animate: shouldReduceMotion ? {} : { rotate: 360 },
                          transition: { repeat: Infinity, duration: 8, ease: "linear" },
                          className: `w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${log.action === "UPDATE" ? "bg-[#EEF2FF] text-[#4F46E5]" : "bg-[#ECFDF5] text-[#10B981]"}`,
                          children: /* @__PURE__ */ jsx(Database, { size: 15 })
                        }),
                        /* @__PURE__ */ jsxs("div", {
                              className: "flex-1 min-w-0", children: [
                          /* @__PURE__ */ jsxs("div", {
                                className: "flex justify-between items-start gap-2", children: [
                            /* @__PURE__ */ jsxs("div", {
                                  className: "flex items-center gap-2", children: [
                              /* @__PURE__ */ jsx("span", { className: "font-extrabold text-[#0f172a]", children: log.table_name.toUpperCase() }),
                              /* @__PURE__ */ jsx(
                                    Badge,
                                    {
                                      text: log.action,
                                      variant: log.action === "UPDATE" ? "warning" : "success",
                                      className: "scale-90"
                                    }
                                  )
                                  ]
                                }),
                            /* @__PURE__ */ jsx(motion.span, {
                              initial: { opacity: 0 },
                              animate: { opacity: 1 },
                              transition: { delay: (idx * 0.08) + 0.1, duration: 0.2 },
                              className: "text-[9px] text-[#94A3B8]",
                              children: formatDate(log.created_at)
                            })
                                ]
                              }),
                          /* @__PURE__ */ jsx("div", { className: "text-[11px] text-[#64748B] mt-1 font-medium leading-relaxed", children: /* @__PURE__ */ jsx(Typewriter, { text: log.notes }) }),
                          /* @__PURE__ */ jsxs("p", {
                                className: "text-[10px] text-[#4F46E5] font-semibold mt-1 opacity-70 group-hover:opacity-100 transition-opacity duration-200", children: [
                                  "Performed by: ",
                                  log.performed_by
                                ]
                              })
                              ]
                            })
                            ]
                          },
                          log.audit_id
                        ))
                      })
                    })
                    ]
                  })
                  ]
                })
                ]
              }),
          activeTab === "distributors" && /* @__PURE__ */ jsxs("div", {
            className: "page-container animate-cross-fade flex flex-col gap-6", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "h1",
                  {
                    className: "text-2xl font-bold text-[#0F172A]",
                    style: { fontFamily: "Outfit, sans-serif" },
                    children: "Distributor Registrations & Approval Page"
                  }
                ),
                /* @__PURE__ */ jsx(motion.div, {
                  initial: shouldReduceMotion ? { width: "100%" } : { width: 0 },
                  animate: { width: "100%" },
                  transition: { duration: 0.4, ease: "easeOut" },
                  className: "h-[2px] bg-[#E2E8F0] mt-1"
                }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1.5", children: "Approve pending distributor applications or manage currently registered partners." })
              ] }),
              
              /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col gap-4", children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-3", children: "Pending Registration Requests" }),
                (() => {
                  const pending = (distributors || []).filter(d => d.status === "PENDING_APPROVAL");
                  if (pending.length === 0) {
                    return /* @__PURE__ */ jsx("div", { className: "text-center py-8 text-[#94A3B8] text-xs bg-slate-50 rounded-xl border border-dashed border-[#CBD5E1]", children: "No pending distributor registration requests." });
                  }
                  return /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3", children: pending.map((dist, idx) => /* @__PURE__ */ jsxs(
                    motion.div,
                    {
                      initial: shouldReduceMotion ? {} : { opacity: 0, y: 15 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.3, delay: idx * 0.08 },
                      className: "flex flex-wrap items-center justify-between gap-4 p-4 border border-[#E2E8F0] rounded-xl hover:border-blue-200 transition-colors bg-white",
                      children: [
                        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 min-w-[200px]", children: [
                          /* @__PURE__ */ jsx("h4", { className: "font-bold text-sm text-[#0F172A]", children: dist.business_name || "Unknown Business" }),
                          /* @__PURE__ */ jsxs("p", { className: "text-xs text-[#64748B]", children: [
                            "Contact Person: ",
                            /* @__PURE__ */ jsx("strong", { className: "text-[#334155]", children: dist.contact_name || "Unknown" })
                          ] }),
                          /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-[#64748B]", children: [
                            "Email: ",
                            dist.email
                          ] }),
                          /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-[#64748B]", children: [
                            "Region: ",
                            /* @__PURE__ */ jsx("strong", { className: "text-blue-600", children: dist.warehouse_region || "None" })
                          ] }),
                          /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-[#64748B]", children: [
                            "Location: ",
                            /* @__PURE__ */ jsxs("strong", { className: "text-indigo-600", children: [
                              dist.city || "Not Specified",
                              ", ",
                              dist.country || "Not Specified"
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-[#64748B] flex flex-col gap-1 mt-1", children: [
                            /* @__PURE__ */ jsxs("span", { children: [
                              "Requested Limit: ",
                              /* @__PURE__ */ jsx("strong", { className: "text-emerald-600 inline-block", children: /* @__PURE__ */ jsx(CountUp, { value: parseFloat(dist.credit_request || 0) }) })
                            ] }),
                            (() => {
                              const limitVal = parseFloat(dist.credit_request || 0);
                              const maxLimit = 5000000;
                              const pct = Math.min((limitVal / maxLimit) * 100, 100);
                              return (
                                /* @__PURE__ */ jsxs("div", {
                                  className: "w-36 mt-0.5",
                                  children: [
                                    /* @__PURE__ */ jsx("div", {
                                      className: "h-1 bg-slate-100 rounded-full overflow-hidden",
                                      children: /* @__PURE__ */ jsx(motion.div, {
                                        className: "h-full bg-emerald-500 rounded-full",
                                        initial: shouldReduceMotion ? { width: `${pct}%` } : { width: 0 },
                                        animate: { width: `${pct}%` },
                                        transition: { duration: 0.6, ease: "easeOut" }
                                      })
                                    }),
                                    /* @__PURE__ */ jsxs("div", {
                                      className: "flex justify-between text-[8px] text-[#94A3B8] mt-0.5 font-bold",
                                      children: [
                                        /* @__PURE__ */ jsx("span", { children: "Limit utilization" }),
                                        /* @__PURE__ */ jsxs("span", { children: [Math.round(pct), "%"] })
                                      ]
                                    })
                                  ]
                                })
                              );
                            })()
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                          /* @__PURE__ */ jsx(motion.button, {
                            whileHover: shouldReduceMotion ? {} : { scale: 1.04, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" },
                            whileTap: shouldReduceMotion ? {} : { scale: 0.96 },
                            onClick: async () => {
                              if (confirm(`Are you sure you want to approve distributor "${dist.business_name}"?`)) {
                                setIsApproving(prev => ({ ...prev, [dist.id]: true }));
                                setTimeout(async () => {
                                  await approveDistributor(dist.id);
                                  setIsApproving(prev => ({ ...prev, [dist.id]: false }));
                                }, 600);
                              }
                            },
                            className: "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-sm flex items-center justify-center gap-1 min-w-[76px]",
                            children: isApproving[dist.id] ? (
                              /* @__PURE__ */ jsx(motion.svg, {
                                className: "w-4 h-4 text-white",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "3",
                                children: /* @__PURE__ */ jsx(motion.path, {
                                  initial: { pathLength: 0 },
                                  animate: { pathLength: 1 },
                                  transition: { duration: 0.3 },
                                  d: "M5 13l4 4L19 7"
                                })
                              })
                            ) : "Approve"
                          }),
                          /* @__PURE__ */ jsx(motion.button, {
                            whileHover: shouldReduceMotion ? {} : { scale: 1.04, boxShadow: "0 4px 12px rgba(225, 29, 72, 0.3)" },
                            whileTap: shouldReduceMotion ? {} : { scale: 0.96 },
                            onClick: async () => {
                              if (confirm(`Are you sure you want to reject distributor application from "${dist.business_name}"?`)) {
                                setIsRejecting(prev => ({ ...prev, [dist.id]: true }));
                                setTimeout(async () => {
                                  await removeDistributor(dist.id);
                                  setIsRejecting(prev => ({ ...prev, [dist.id]: false }));
                                }, 600);
                              }
                            },
                            className: "px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-sm flex items-center justify-center gap-1 min-w-[68px]",
                            children: isRejecting[dist.id] ? (
                              /* @__PURE__ */ jsx(motion.svg, {
                                className: "w-4 h-4 text-white",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "3",
                                children: [
                                  /* @__PURE__ */ jsx(motion.path, {
                                    initial: { pathLength: 0 },
                                    animate: { pathLength: 1 },
                                    transition: { duration: 0.2 },
                                    d: "M18 6L6 18"
                                  }),
                                  /* @__PURE__ */ jsx(motion.path, {
                                    initial: { pathLength: 0 },
                                    animate: { pathLength: 1 },
                                    transition: { duration: 0.2, delay: 0.15 },
                                    d: "M6 6l12 12"
                                  })
                                ]
                              })
                            ) : "Reject"
                          })
                        ] })
                      ]
                    },
                    dist.id
                  )) });
                })()
              ] }),

              /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col gap-4", children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-3", children: "Registered Distributors" }),
                (() => {
                  const activeDists = (distributors || []).filter(d => d.status === "ACTIVE" || d.status === null || d.status === undefined);
                  if (activeDists.length === 0) {
                    return /* @__PURE__ */ jsx("div", { className: "text-center py-8 text-[#94A3B8] text-xs bg-slate-50 rounded-xl border border-dashed border-[#CBD5E1]", children: "No registered distributors on the platform." });
                  }
                  return /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3", children: activeDists.map((dist, idx) => /* @__PURE__ */ jsxs(
                    motion.div,
                    {
                      initial: shouldReduceMotion ? {} : { opacity: 0, y: 15 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.3, delay: idx * 0.06 },
                      className: "flex flex-wrap items-center justify-between gap-4 p-4 border border-[#E2E8F0] rounded-xl hover:border-slate-300 transition-colors bg-white",
                      children: [
                        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 min-w-[200px]", children: [
                          /* @__PURE__ */ jsx("h4", { className: "font-bold text-sm text-[#0F172A]", children: dist.business_name || "Unknown Business" }),
                          /* @__PURE__ */ jsxs("p", { className: "text-xs text-[#64748B]", children: [
                            "Contact Person: ",
                            /* @__PURE__ */ jsx("strong", { className: "text-[#334155]", children: dist.contact_name || "Unknown" })
                          ] }),
                          /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-[#64748B]", children: [
                            "Email: ",
                            dist.email
                          ] }),
                          /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-[#64748B]", children: [
                            "Region: ",
                            /* @__PURE__ */ jsx("strong", { className: "text-blue-600", children: dist.warehouse_region || "None" })
                          ] }),
                          /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-[#64748B]", children: [
                            "Location: ",
                            /* @__PURE__ */ jsxs("strong", { className: "text-indigo-600", children: [
                              dist.city || "Not Specified",
                              ", ",
                              dist.country || "Not Specified"
                            ] })
                          ] })
                        ] }),
                        /* @__PURE__ */ jsx("div", { children: [
                          /* @__PURE__ */ jsx(motion.button, {
                            onMouseEnter: () => setRemoveHoveredId(dist.id),
                            onMouseLeave: () => setRemoveHoveredId(null),
                            animate: removeHoveredId === dist.id && !shouldReduceMotion ? { x: [-1, 1, -1, 1, 0] } : { x: 0 },
                            transition: { duration: 0.15 },
                            onClick: async () => {
                              if (confirm(`WARNING: Are you sure you want to completely remove distributor "${dist.business_name}"?`)) {
                                await removeDistributor(dist.id);
                              }
                            },
                            className: "px-4 py-2 border border-rose-200 hover:border-rose-600 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all cursor-pointer bg-white",
                            children: "Remove Partner"
                          })
                        ] })
                      ]
                    },
                    dist.id
                  )) });
                })()
              ] })
            ]
          })
        ]
      }) }) })
      
      // Chatbot UI component
      , /* @__PURE__ */ jsxs("div", {
        className: "fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3 font-sans",
        children: [
          chatOpen && !chatMinimized && /* @__PURE__ */ jsxs(motion.div, {
            initial: { opacity: 0, scale: 0.9, y: 50 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.9, y: 50 },
            transition: { type: "spring", stiffness: 300, damping: 25 },
            className: "w-96 h-[500px] bg-white border border-[#E2E8F0] shadow-2xl rounded-2xl flex flex-col overflow-hidden font-sans",
            children: [
              /* @__PURE__ */ jsxs("div", {
                className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3.5 text-white flex items-center justify-between border-b border-indigo-950/40 relative overflow-hidden",
                children: [
                  /* @__PURE__ */ jsx("div", { className: "absolute -left-8 -top-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl animate-pulse" }),
                  /* @__PURE__ */ jsx("div", { className: "absolute -right-8 -bottom-8 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-pulse" }),
                  /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center gap-2.5 z-10",
                    children: [
                      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                        /* @__PURE__ */ jsx("div", { className: "w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-md", children:
                          /* @__PURE__ */ jsx(Sparkles, { size: 13, className: "text-white animate-spin-slow" })
                        }),
                        /* @__PURE__ */ jsx("span", { className: "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-ping" }),
                        /* @__PURE__ */ jsx("span", { className: "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "text-left", children: [
                        /* @__PURE__ */ jsx("span", { className: "font-bold text-xs tracking-wide block", children: "CIQ Admin Copilot" }),
                        /* @__PURE__ */ jsx("span", { className: "text-[9px] text-slate-400 font-semibold tracking-wider block", children: "ACTIVE AGENT" })
                      ] })
                    ]
                  }),
                  /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center gap-1.5 z-10",
                    children: [
                      /* @__PURE__ */ jsx("button", {
                        type: "button",
                        onClick: () => setChatMinimized(true),
                        className: "text-[#94A3B8] hover:text-white border-0 bg-transparent cursor-pointer font-extrabold text-sm p-1 leading-none transition-colors",
                        title: "Minimize Chat",
                        children: "−"
                      }),
                      /* @__PURE__ */ jsx("button", {
                        type: "button",
                        onClick: () => {
                          setChatOpen(false);
                          setChatMinimized(false);
                          setChatMessages([
                            {
                              sender: "ai",
                              text: "Hello Saif! I am your CIQ Admin Copilot. I can help you automate catalog actions. Try typing: 'Add product: Titanium Rods, category: Metals, price: 1500, stock: 100' or similar commands."
                            }
                          ]);
                        },
                        className: "text-[#94A3B8] hover:text-white border-0 bg-transparent cursor-pointer font-bold text-xs p-1 leading-none transition-colors",
                        title: "Close Chat (Clear History)",
                        children: "✕"
                      })
                    ]
                  })
                ]
              }),
              /* @__PURE__ */ jsxs("div", {
                className: "flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]",
                children: [
                  chatMessages.length === 1 && chatMessages[0].sender === "ai" ? (
                    /* @__PURE__ */ jsxs("div", {
                      className: "flex flex-col items-center justify-center text-center py-2 space-y-4 animate-fade-up",
                      children: [
                        /* @__PURE__ */ jsxs("div", { className: "relative my-2", children: [
                          /* @__PURE__ */ jsx("div", { className: "w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] flex items-center justify-center shadow-lg relative z-10", children:
                            /* @__PURE__ */ jsx(Sparkles, { size: 28, className: "text-white" })
                          }),
                          /* @__PURE__ */ jsx("div", { className: "absolute -inset-1.5 bg-[#4F46E5]/30 rounded-2xl blur animate-pulse" })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { children: [
                          /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-slate-800", children: "Welcome Saif! 👋" }),
                          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-500 mt-1 max-w-[85%] mx-auto leading-relaxed", children: "I can help you create, update, and audit products in your catalog instantly. Let's do something amazing!" })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "w-full space-y-2 pt-2 text-left", children: [
                          /* @__PURE__ */ jsx("p", { className: "text-[9px] uppercase font-extrabold tracking-wider text-slate-400 pl-1", children: "Quick Action Templates" }),
                          /* @__PURE__ */ jsxs("button", {
                            type: "button",
                            onClick: () => setChatInput("Add product: Wireless Router X, category: Networking, price: 5400, stock: 50"),
                            className: "w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-3 text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm flex items-start gap-3",
                            children: [
                              /* @__PURE__ */ jsx("span", { className: "text-lg mt-0.5", children: "📦" }),
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsx("div", { className: "text-[10.5px] font-bold text-slate-700", children: "Add New Product" }),
                                /* @__PURE__ */ jsx("div", { className: "text-[9px] text-slate-400 mt-0.5", children: "Create a catalog item with name, category, and pricing" })
                              ] })
                            ]
                          }),
                          /* @__PURE__ */ jsxs("button", {
                            type: "button",
                            onClick: () => setChatInput("Show all products in the Networking category"),
                            className: "w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-3 text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm flex items-start gap-3",
                            children: [
                              /* @__PURE__ */ jsx("span", { className: "text-lg mt-0.5", children: "🔍" }),
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsx("div", { className: "text-[10.5px] font-bold text-slate-700", children: "Filter Category Records" }),
                                /* @__PURE__ */ jsx("div", { className: "text-[9px] text-slate-400 mt-0.5", children: "Retrieve details of all products inside a given group" })
                              ] })
                            ]
                          }),
                          /* @__PURE__ */ jsxs("button", {
                            type: "button",
                            onClick: () => setChatInput("Find all products with low stock levels in database"),
                            className: "w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-3 text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm flex items-start gap-3",
                            children: [
                              /* @__PURE__ */ jsx("span", { className: "text-lg mt-0.5", children: "⚠️" }),
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsx("div", { className: "text-[10.5px] font-bold text-slate-700", children: "Query Low Stock Alerts" }),
                                /* @__PURE__ */ jsx("div", { className: "text-[9px] text-slate-400 mt-0.5", children: "Identify inventory currently running below threshold levels" })
                              ] })
                            ]
                          })
                        ] })
                      ]
                    })
                  ) : (
                    chatMessages.slice(1).map((msg, i) => /* @__PURE__ */ jsx(motion.div, {
                      initial: { opacity: 0, y: 12, scale: 0.97 },
                      animate: { opacity: 1, y: 0, scale: 1 },
                      transition: { duration: 0.2 },
                      className: `flex flex-col gap-1 max-w-[82%] ${msg.sender === "user" ? "ml-auto" : "mr-auto"}`,
                      children: /* @__PURE__ */ jsxs("div", {
                        className: `p-3 rounded-xl text-xs leading-relaxed ${
                          msg.sender === "user" 
                            ? "bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-br-none shadow-md" 
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm"
                        }`,
                        children: [
                          msg.image && /* @__PURE__ */ jsx("div", { className: "mb-2 rounded-lg overflow-hidden max-h-32 border border-[#FFFFFF]/25 bg-black/10", children: 
                            /* @__PURE__ */ jsx("img", { src: msg.image, alt: "Attached Preview", className: "w-full h-full object-cover" })
                          }),
                          renderMessageText(msg.text)
                        ]
                      })
                    }, i))
                  ),
                  chatTyping && /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center gap-1.5 text-[#64748B] text-[10px] bg-slate-100 px-3 py-2 rounded-lg w-max animate-pulse",
                    children: [
                      /* @__PURE__ */ jsx("span", { children: "Copilot is thinking" }),
                      /* @__PURE__ */ jsx("span", { className: "animate-bounce delay-100", children: "." }),
                      /* @__PURE__ */ jsx("span", { className: "animate-bounce delay-200", children: "." }),
                      /* @__PURE__ */ jsx("span", { className: "animate-bounce delay-300", children: "." })
                    ]
                  })
                ]
              }),
              /* @__PURE__ */ jsxs("form", {
                onSubmit: handleSendChat,
                className: "p-3 border-t border-[#E2E8F0] bg-white flex flex-col gap-2",
                children: [
                  chatAttachedImage && /* @__PURE__ */ jsxs("div", { className: "relative w-14 h-14 rounded-lg border border-[#E2E8F0] overflow-hidden bg-slate-50 flex-shrink-0 mb-1 shadow-sm group", children: [
                    /* @__PURE__ */ jsx("img", { src: chatAttachedImage, alt: "Attached Preview", className: "w-full h-full object-cover" }),
                    /* @__PURE__ */ jsx("button", {
                      type: "button",
                      onClick: () => setChatAttachedImage(""),
                      className: "absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center border-0 text-[8px] font-bold cursor-pointer shadow-sm",
                      children: "×"
                    })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2 w-full items-center", children: [
                    /* @__PURE__ */ jsxs("label", {
                      htmlFor: "chat-file-input",
                      className: "p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-sm border border-slate-200",
                      children: [
                        /* @__PURE__ */ jsx(Paperclip, { size: 14 }),
                        /* @__PURE__ */ jsx("input", {
                          type: "file",
                          accept: "image/*",
                          onChange: handleChatFileChange,
                          className: "hidden",
                          id: "chat-file-input"
                        })
                      ]
                    }),
                    /* @__PURE__ */ jsx("input", {
                      value: chatInput,
                      onChange: (e) => setChatInput(e.target.value),
                      placeholder: "Type natural instructions to perform actions...",
                      className: "flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    }),
                    /* @__PURE__ */ jsx("button", {
                      type: "submit",
                      className: "p-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-0 rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-sm",
                      children: /* @__PURE__ */ jsx(Send, { size: 14 })
                    })
                  ] })
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs(motion.button, {
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.95 },
            onClick: () => {
              if (!chatOpen) {
                setChatOpen(true);
                setChatMinimized(false);
              } else {
                setChatMinimized(!chatMinimized);
              }
            },
            className: "w-14 h-14 rounded-full bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] text-white flex items-center justify-center shadow-xl hover:shadow-indigo-500/25 transition-all cursor-pointer border-0",
            children: [
              /* @__PURE__ */ jsx(Sparkles, { size: 22 })
            ]
          }),
          shippingOrderId && (() => {
            const { stocks: orderWhStocks, items: orderWhItems } = getOrderStockDetails();
            return /* @__PURE__ */ jsx("div", {
              className: "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",
              children: /* @__PURE__ */ jsxs("div", {
                className: "bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-[#E2E8F0] overflow-hidden animate-dropdown",
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "px-5 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50", children: [
                    /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-slate-800 uppercase tracking-wider", children: "Select Shipping Depot" }),
                    /* @__PURE__ */ jsx("button", { onClick: () => setShippingOrderId(null), className: "text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer text-lg leading-none", children: "×" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "p-5 flex flex-col gap-4 text-xs", children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("label", { className: "text-[10px] text-slate-500 font-bold block mb-1.5 uppercase", children: "Choose Dispatch Warehouse *" }),
                      /* @__PURE__ */ jsx("select", {
                        value: selectedShipWarehouse,
                        onChange: (e) => setSelectedShipWarehouse(e.target.value),
                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500",
                        children: warehouses.map(wh => (
                          /* @__PURE__ */ jsx("option", { value: wh.warehouse_id, children: `${wh.warehouse_name} (Stock: ${orderWhStocks[wh.warehouse_id]?.stock ?? 0})` }, wh.warehouse_id)
                        ))
                      })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-2.5 rounded-lg border border-slate-100", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-500 font-bold block mb-1.5 uppercase", children: "Items in Order" }),
                      orderWhItems.map((item, idx) => {
                        const prod = products.find(p => p.product_id === item.product_id || p.sku === item.sku);
                        const whEntry = prod?.inventory.find(i => i.warehouse_id === selectedShipWarehouse);
                        const whStock = whEntry ? whEntry.quantity : 0;
                        const orderQty = parseInt(item.qty || item.quantity || 0);
                        const hasSufficient = whStock >= orderQty;
                        return /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center py-1 border-b border-slate-100 last:border-0", children: [
                          /* @__PURE__ */ jsxs("span", { className: "font-semibold text-slate-700 max-w-[180px] truncate", children: [item.product_name, ` (x${orderQty})`] }),
                          /* @__PURE__ */ jsxs("span", { className: `font-bold ${hasSufficient ? "text-emerald-600" : "text-rose-500"}`, children: [
                            "Stock: ",
                            whStock
                          ] })
                        ] }, idx);
                      })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex gap-2.5 pt-2", children: [
                      /* @__PURE__ */ jsx("button", {
                        onClick: () => setShippingOrderId(null),
                        className: "flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer bg-white",
                        children: "Cancel"
                      }),
                      /* @__PURE__ */ jsx("button", {
                        onClick: async () => {
                          const orderId = shippingOrderId;
                          const { stocks: whStocks, items: whItems } = getOrderStockDetails();
                          
                          let hasInsufficientStock = false;
                          let insufficientItemName = "";
                          let currentStockInWh = 0;
                          let neededQty = 0;

                          for (const item of whItems) {
                            const qty = parseInt(item.qty || item.quantity || 0);
                            const prod = products.find(p => p.product_id === item.product_id || p.sku === item.sku);
                            if (prod) {
                              const whEntry = prod.inventory.find(i => i.warehouse_id === selectedShipWarehouse);
                              const whStock = whEntry ? whEntry.quantity : 0;
                              if (whStock < qty) {
                                hasInsufficientStock = true;
                                insufficientItemName = prod.product_name;
                                currentStockInWh = whStock;
                                neededQty = qty;
                                break;
                              }
                            } else {
                              hasInsufficientStock = true;
                              insufficientItemName = item.product_name || "Unknown Product";
                              currentStockInWh = 0;
                              neededQty = qty;
                              break;
                            }
                          }

                          if (hasInsufficientStock) {
                            const matchedWh = warehouses.find(w => w.warehouse_id === selectedShipWarehouse);
                            const whName = matchedWh ? matchedWh.warehouse_name : 'selected warehouse';
                            alert(`Insufficient Stock:\n\nCannot ship "${insufficientItemName}" from ${whName}.\nAvailable stock: ${currentStockInWh} units.\nRequired quantity: ${neededQty} units.`);
                            return;
                          }

                          setShippingOrderId(null);
                          try {
                            await dispatchOrder(orderId, selectedShipWarehouse);
                            alert("Order shipped successfully! Warehouse stock updated.");
                          } catch (e) {
                            alert("Failed to ship order.");
                          }
                        },
                        className: "flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer border-0 shadow-sm",
                        children: "Confirm Shipment"
                      })
                    ] })
                  ] })
                ]
              })
            });
          })()
        ]
      })
      ]
    })
    ]
  });
}
