import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  ShoppingCart,
  LogOut,
  Package,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CheckCircle
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/data";
import { OrderStatusBadge } from "@/components/ui";
export default function BuyerPortal({ onLogout }) {
  const {
    notifications,
    products,
    orders,
    cart,
    addToCart,
    updateCartQty,
    clearCart,
    markNotificationRead,
    placeOrder,
    currentUser
  } = useStore();
  const [activeTab, setActiveTab] = useState("catalog");
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifBounce, setNotifBounce] = useState(false);
  const [notifFilter, setNotifFilter] = useState("ALL");
  const notifRef = useRef(null);
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
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.is_read) markNotificationRead(n.notification_id);
    });
  };
  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === "CRITICAL") return n.severity === "CRITICAL";
    if (notifFilter === "WARNING") return n.severity === "WARNING";
    return true;
  });
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.prices.RETAIL * item.qty,
    0
  );
  const buyerOrders = orders.filter((o) => o.order_type === "B2C");
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const tax = cartTotal * 0.18;
    const itemsSummary = cart.map(item => `${item.qty}x ${item.product.product_name}`).join(", ");
    const orderData = {
      order_id: `o-${Date.now()}`,
      order_number: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      order_type: "B2C",
      status: "PROCEED",
      subtotal: cartTotal,
      discount_total: 0,
      tax_total: tax,
      total_amount: cartTotal + tax,
      items_summary: itemsSummary,
      items: cart.map(item => ({
        product_id: item.product.product_id,
        product_name: item.product.product_name,
        price: item.product.prices.RETAIL,
        qty: item.qty
      })),
      customer_email: currentUser?.email || "demo@commerceiq.com"
    };

    const success = await placeOrder(orderData);
    if (success) {
      clearCart();
      setActiveTab("orders");
    } else {
      alert("Failed to place order. Connection error.");
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-screen bg-[#F8FAFC] overflow-hidden text-xs", children: [
    /* @__PURE__ */ jsxs("header", { className: "h-[75px] bg-[#4F46E5] flex items-center justify-between px-8 flex-shrink-0 relative z-20 text-white shadow-lg", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "w-9 h-9 bg-white text-[#4F46E5] rounded-xl flex items-center justify-center font-extrabold text-base logo-box",
            style: { fontFamily: "Outfit, sans-serif" },
            children: "IQ"
          }
        ),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: "text-white font-bold text-[17px] tracking-tight block",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "CommerceIQ Store"
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#C7D2FE] font-bold block tracking-wider uppercase mt-0.5", children: "Retail Buyer Portal" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("nav", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("catalog"),
            className: `px-4 py-2 rounded-lg font-semibold transition-all border-0 bg-transparent cursor-pointer flex items-center gap-2 ${activeTab === "catalog" ? "bg-white/15 text-white shadow" : "text-[#E0E7FF] hover:bg-white/10 hover:text-white"}`,
            children: [
              /* @__PURE__ */ jsx(ShoppingBag, { size: 15 }),
              /* @__PURE__ */ jsx("span", { children: "Browse Catalog" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("orders"),
            className: `px-4 py-2 rounded-lg font-semibold transition-all border-0 bg-transparent cursor-pointer flex items-center gap-2 ${activeTab === "orders" ? "bg-white/15 text-white shadow" : "text-[#E0E7FF] hover:bg-white/10 hover:text-white"}`,
            children: [
              /* @__PURE__ */ jsx(Package, { size: 15 }),
              /* @__PURE__ */ jsx("span", { children: "My Orders" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("cart"),
            className: `px-4 py-2 rounded-lg font-semibold transition-all border-0 bg-transparent cursor-pointer flex items-center gap-2 relative ${activeTab === "cart" ? "bg-white/15 text-white shadow" : "text-[#E0E7FF] hover:bg-white/10 hover:text-white"}`,
            children: [
              /* @__PURE__ */ jsx(ShoppingCart, { size: 15 }),
              /* @__PURE__ */ jsx("span", { children: "Shopping Cart" }),
              cartCount > 0 && /* @__PURE__ */ jsx("span", { className: "absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center", children: cartCount })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            Search,
            {
              size: 14,
              className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#C7D2FE]"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              className: "w-[200px] pl-8 pr-4 py-1.5 border border-white/20 rounded-lg text-xs bg-white/10 text-white focus:outline-none focus:bg-white focus:text-[#0F172A] focus:border-white transition-all placeholder-[#C7D2FE]",
              placeholder: "Search store catalog...",
              value: search,
              onChange: (e) => setSearch(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative", ref: notifRef, children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: (e) => {
                e.stopPropagation();
                setNotifOpen(!notifOpen);
              },
              className: "relative w-8 h-8 flex items-center justify-center border border-white/20 rounded-lg hover:bg-white/10 text-white transition-all cursor-pointer",
              children: [
                /* @__PURE__ */ jsx(
                  Bell,
                  {
                    size: 16,
                    className: notifBounce ? "animate-bell-bounce" : ""
                  }
                ),
                unreadNotifications.length > 0 && /* @__PURE__ */ jsx("span", { className: "absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center", children: unreadNotifications.length })
              ]
            }
          ),
          notifOpen && /* @__PURE__ */ jsxs("div", { className: "absolute right-0 top-[calc(100%+8px)] w-[320px] bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden text-[#0F172A] animate-dropdown", children: [
            /* @__PURE__ */ jsxs("div", { className: "p-3 border-b border-[#E2E8F0] flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs font-bold", children: "Notifications" }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: handleMarkAllRead,
                  className: "text-[10px] font-bold text-[#4F46E5] hover:text-[#4338CA] transition-colors border-0 bg-transparent cursor-pointer",
                  children: "Mark all read"
                }
              )
            ] }),
            /* @__PURE__ */ jsx("div", { className: "max-h-[250px] overflow-y-auto divide-y divide-[#E2E8F0]", children: filteredNotifications.length === 0 ? /* @__PURE__ */ jsx("div", { className: "p-6 text-center text-[#64748B] font-medium", children: "No new updates." }) : filteredNotifications.map((n) => /* @__PURE__ */ jsxs(
              "div",
              {
                className: "p-3.5 hover:bg-slate-50/50 transition-colors",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "font-semibold text-slate-800 block", children: n.title }),
                  /* @__PURE__ */ jsx("p", { className: "text-[#64748B] mt-0.5 leading-relaxed text-[11px]", children: n.message })
                ]
              },
              n.notification_id
            )) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 pl-4 border-l border-white/20", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              "img",
              {
                src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop",
                alt: "Profile",
                className: "w-7 h-7 rounded-full object-cover border border-white"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "font-bold text-xs", children: "Saif Shahzad" })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onLogout,
              className: "text-white hover:text-rose-200 border-0 bg-transparent transition-colors cursor-pointer",
              children: /* @__PURE__ */ jsx(LogOut, { size: 16 })
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("main", { className: "flex-1 overflow-y-auto p-8", children: [
      activeTab === "catalog" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "h1",
            {
              className: "text-xl font-bold text-[#0F172A]",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "Explore Store Catalog"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Get high-performance servers, active networking devices, power storage units, and cablings." })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: products.map((p) => {
          const totalQty = p.inventory.reduce(
            (sum, i) => sum + i.quantity,
            0
          );
          const cartItem = cart.find(
            (item) => item.product.product_id === p.product_id
          );
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: "bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow",
              children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("div", { className: "w-full h-36 rounded-xl overflow-hidden mb-4 bg-slate-50 border border-[#E2E8F0] flex items-center justify-center", children: /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: p.image_url || "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop",
                      alt: p.product_name,
                      className: "w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    }
                  ) }),
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start gap-2 mb-3", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] bg-[#EEF2FF] text-[#4F46E5] font-bold px-2 py-0.5 rounded-[4px]", children: p.category }),
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[4px] font-mono", children: p.sku })
                  ] }),
                  /* @__PURE__ */ jsx("h3", { className: "font-bold text-sm text-[#0F172A] mb-1", children: p.product_name }),
                  /* @__PURE__ */ jsx("p", { className: "text-[#64748B] leading-relaxed mb-4", children: p.short_description })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "border-t border-[#F1F5F9] pt-4 mt-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-4", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[#64748B]", children: "Retail Price" }),
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-base text-[#4F46E5]", children: formatCurrency(p.prices.RETAIL) })
                  ] }),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => addToCart(p.product_id),
                      disabled: totalQty <= 0,
                      className: `w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5 ${totalQty <= 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[#4F46E5] text-white hover:bg-[#4338CA] hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]"}`,
                      children: [
                        /* @__PURE__ */ jsx(ShoppingCart, { size: 14 }),
                        cartItem ? `In Cart (${cartItem.qty})` : "Add to Cart"
                      ]
                    }
                  )
                ] })
              ]
            },
            p.product_id
          );
        }) })
      ] }),
      activeTab === "orders" && /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "p-5 border-b border-[#E2E8F0]", children: /* @__PURE__ */ jsx("h3", { className: "font-bold text-sm text-[#0F172A]", children: "My Purchase History" }) }),
        /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] font-semibold", children: [
            /* @__PURE__ */ jsx("th", { className: "p-4", children: "Order Number" }),
            /* @__PURE__ */ jsx("th", { className: "p-4", children: "Items Purchase Summary" }),
            /* @__PURE__ */ jsx("th", { className: "p-4", children: "Purchase Date" }),
            /* @__PURE__ */ jsx("th", { className: "p-4", children: "Total Amount Paid" }),
            /* @__PURE__ */ jsx("th", { className: "p-4", children: "Fulfillment Status" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-[#E2E8F0] text-[#334155]", children: buyerOrders.map((o) => /* @__PURE__ */ jsxs(
            "tr",
            {
              className: "hover:bg-slate-50/50 transition-colors",
              children: [
                /* @__PURE__ */ jsx("td", { className: "p-4 font-bold text-[#4F46E5]", children: o.order_number }),
                /* @__PURE__ */ jsx("td", { className: "p-4 font-medium", children: o.items_summary }),
                /* @__PURE__ */ jsx("td", { className: "p-4 text-[#64748B]", children: formatDate(o.order_date) }),
                /* @__PURE__ */ jsx("td", { className: "p-4 font-bold", children: formatCurrency(o.total_amount) }),
                /* @__PURE__ */ jsx("td", { className: "p-4", children: /* @__PURE__ */ jsx(OrderStatusBadge, { status: o.status }) })
              ]
            },
            o.order_id
          )) })
        ] }) })
      ] }),
      activeTab === "cart" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "h1",
            {
              className: "text-xl font-bold text-[#0F172A]",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "My Shopping Cart"
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Review the selected items, update quantities, and submit secure checkout." })
        ] }),
        cart.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-2xl p-16 text-center shadow-sm", children: [
          /* @__PURE__ */ jsx(
            ShoppingBag,
            {
              size: 48,
              className: "mx-auto text-slate-300 mb-4"
            }
          ),
          /* @__PURE__ */ jsx("h3", { className: "font-bold text-sm text-slate-700", children: "Your cart is empty" }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed", children: "Browse the catalog to discover high-quality networking and hardware gear." }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setActiveTab("catalog"),
              className: "mt-6 bg-[#4F46E5] text-white font-bold py-2.5 px-6 rounded-xl border-0 hover:bg-[#4338CA] transition-colors cursor-pointer",
              children: "Return to Shop"
            }
          )
        ] }) : /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8", children: [
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2 flex flex-col gap-4", children: [
            cart.map((item) => /* @__PURE__ */ jsxs(
              "div",
              {
                className: "bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4",
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[9px] bg-[#EEF2FF] text-[#4F46E5] font-bold px-2 py-0.5 rounded-[4px]", children: item.product.category }),
                    /* @__PURE__ */ jsx("h3", { className: "font-bold text-sm text-[#0F172A] mt-1.5", children: item.product.product_name }),
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#64748B] font-mono mt-0.5 block", children: item.product.sku })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-6", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center border border-[#E2E8F0] rounded-lg overflow-hidden bg-slate-50", children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => updateCartQty(item.product.product_id, -1),
                          className: "w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors border-0 bg-transparent cursor-pointer",
                          children: /* @__PURE__ */ jsx(Minus, { size: 12 })
                        }
                      ),
                      /* @__PURE__ */ jsx("span", { className: "w-8 text-center font-bold text-slate-700 text-xs", children: item.qty }),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => updateCartQty(item.product.product_id, 1),
                          className: "w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors border-0 bg-transparent cursor-pointer",
                          children: /* @__PURE__ */ jsx(Plus, { size: 12 })
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "text-right w-[110px]", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#64748B] block", children: "Subtotal" }),
                      /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-800 text-sm", children: formatCurrency(
                        item.product.prices.RETAIL * item.qty
                      ) })
                    ] })
                  ] })
                ]
              },
              item.product.product_id
            )),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: clearCart,
                className: "text-rose-500 font-bold hover:text-rose-600 border-0 bg-transparent cursor-pointer flex items-center gap-1.5 self-start px-2 py-1 rounded hover:bg-rose-50",
                children: [
                  /* @__PURE__ */ jsx(Trash2, { size: 14 }),
                  " Clear all items"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm h-fit", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-bold text-sm text-[#0F172A] border-b border-[#F1F5F9] pb-4 mb-4", children: "Summary" }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 text-slate-600 mb-6", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsx("span", { children: "Total items" }),
                /* @__PURE__ */ jsx("span", { className: "font-semibold text-slate-800", children: cartCount })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center border-t border-[#F1F5F9] pt-3 text-sm", children: [
                /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: "Order Total" }),
                /* @__PURE__ */ jsx("span", { className: "font-extrabold text-[#4F46E5] text-base", children: formatCurrency(cartTotal) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleCheckout,
                className: "w-full py-3 bg-[#4F46E5] text-white font-bold rounded-xl text-xs hover:bg-[#4338CA] hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)] transition-all border-0 cursor-pointer flex items-center justify-center gap-2",
                children: [
                  /* @__PURE__ */ jsx(CheckCircle, { size: 15 }),
                  /* @__PURE__ */ jsx("span", { children: "Proceed to Checkout" })
                ]
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] });
}
