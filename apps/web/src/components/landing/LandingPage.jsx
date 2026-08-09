import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingCart,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  LogIn,
  Store,
  Globe,
  Tag,
  Info,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  SlidersHorizontal,
  X,
  Star,
  Warehouse,
  Check,
  CheckCircle
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import Modal from "@/components/Modal";

export default function LandingPage({ onGetStarted, onRegisterClick }) {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    clearCart,
    currentUser,
    warehouses
  } = useStore();

  const [marketMode, setMarketMode] = useState("b2c"); // "b2c" = Retail, "b2b" = Wholesale
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categorySearch, setCategorySearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All");
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // B2B Wholesale guest states
  const [activeProductForQuote, setActiveProductForQuote] = useState(null);
  const [quoteQuantity, setQuoteQuantity] = useState(1);
  const [customProposedPrice, setCustomProposedPrice] = useState("");
  const [activeProductForDirectOrder, setActiveProductForDirectOrder] = useState(null);
  const [directOrderQuantity, setDirectOrderQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState("");

  const handleAddToQuote = (product) => {
    const minQty = product.min_wholesale_qty || 1;
    const availableQty = (product.inventory || []).reduce((sum, inv) => sum + (inv.quantity || 0), 0);
    
    if (availableQty <= 0) {
      alert("This product is currently out of stock.");
      return;
    }
    
    if (minQty > availableQty) {
      alert(`Warning: The minimum wholesale quantity (${minQty}) is greater than the total available warehouse stock (${availableQty}).`);
      return;
    }

    setActiveProductForQuote(product);
    setQuoteQuantity(minQty);
    setCustomProposedPrice((product.prices.DISTRIBUTOR || product.prices.RETAIL).toString());
  };

  const handleConfirmAddToQuote = () => {
    if (!activeProductForQuote) return;

    const minQty = activeProductForQuote.min_wholesale_qty || 1;
    const availableQty = (activeProductForQuote.inventory || []).reduce((sum, inv) => sum + (inv.quantity || 0), 0);
    const qty = parseInt(quoteQuantity);

    if (isNaN(qty) || qty < minQty) {
      alert(`Minimum wholesale requirement is ${minQty} units.`);
      return;
    }
    if (qty > availableQty) {
      alert(`Only ${availableQty} units available in stock.`);
      return;
    }

    const currentPrice = activeProductForQuote.prices.DISTRIBUTOR || activeProductForQuote.prices.RETAIL;
    const maxDiscPercent = activeProductForQuote.max_discount !== undefined ? activeProductForQuote.max_discount : 10;
    const proposed = parseFloat(customProposedPrice);
    if (isNaN(proposed) || proposed <= 0) {
      alert("Please enter a valid proposed unit price.");
      return;
    }

    if (proposed > currentPrice) {
      alert(`Proposed price cannot be higher than the current Distributor Rate (Rs ${currentPrice.toLocaleString()}).`);
      return;
    }

    const minAllowedPrice = currentPrice * (1 - maxDiscPercent / 100);
    if (proposed < minAllowedPrice) {
      alert("Proposed price exceeds the maximum allowed discount limit. Please enter a price above Rs " + minAllowedPrice.toLocaleString());
      return;
    }

    const savedDraftStr = localStorage.getItem("ciq_b2b_draft_items");
    let currentDraft = [];
    try {
      currentDraft = savedDraftStr ? JSON.parse(savedDraftStr) : [];
      if (!Array.isArray(currentDraft)) currentDraft = [];
    } catch(e) {
      currentDraft = [];
    }

    const existingIdx = currentDraft.findIndex(item => item.product_id === activeProductForQuote.product_id);
    if (existingIdx > -1) {
      const newQty = Math.min(currentDraft[existingIdx].qty + qty, availableQty);
      currentDraft[existingIdx] = { ...currentDraft[existingIdx], qty: newQty, price: proposed };
    } else {
      currentDraft.push({
        product_id: activeProductForQuote.product_id,
        name: activeProductForQuote.product_name,
        price: proposed,
        qty: qty,
        min_wholesale_qty: minQty,
        available_qty: availableQty
      });
    }

    localStorage.setItem("ciq_b2b_draft_items", JSON.stringify(currentDraft));

    setToastMessage(`Added ${activeProductForQuote.product_name} to B2B draft. Sign in to submit!`);
    setTimeout(() => setToastMessage(""), 4000);
    setActiveProductForQuote(null);
  };

  const handleDirectOrder = (product) => {
    const minQty = product.min_wholesale_qty || 1;
    const availableQty = (product.inventory || []).reduce((sum, inv) => sum + (inv.quantity || 0), 0);
    
    if (availableQty <= 0) {
      alert("This product is currently out of stock.");
      return;
    }
    
    if (minQty > availableQty) {
      alert(`Warning: The minimum wholesale quantity (${minQty}) is greater than the total available warehouse stock (${availableQty}).`);
      return;
    }

    setActiveProductForDirectOrder(product);
    setDirectOrderQuantity(minQty);
  };

  const handleConfirmDirectOrder = () => {
    if (!activeProductForDirectOrder) return;

    const minQty = activeProductForDirectOrder.min_wholesale_qty || 1;
    const availableQty = (activeProductForDirectOrder.inventory || []).reduce((sum, inv) => sum + (inv.quantity || 0), 0);
    const qty = parseInt(directOrderQuantity);

    if (isNaN(qty) || qty < minQty) {
      alert(`Minimum wholesale requirement is ${minQty} units.`);
      return;
    }
    if (qty > availableQty) {
      alert(`Only ${availableQty} units available in stock.`);
      return;
    }

    const intent = {
      product_id: activeProductForDirectOrder.product_id,
      qty: qty
    };
    localStorage.setItem("ciq_b2b_pending_direct_order", JSON.stringify(intent));
    
    setActiveProductForDirectOrder(null);
    onGetStarted("distributor");
  };

  // Dynamic and Fallback Categories
  const defaultCategories = ["Networking", "Storage", "Computer Accessories", "Monitors", "Power Backup", "Cables & Connectors"];
  const dynamicCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  
  const allCategories = ["All", ...new Set([...defaultCategories, ...dynamicCategories].map(cat => {
    if (!cat) return "";
    return cat.trim().split(" ")
              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(" ");
  }).filter(Boolean))];

  const filteredCategories = allCategories.filter(cat => {
    if (cat === "All") return true;
    return cat.toLowerCase().includes(categorySearch.toLowerCase());
  });

  // Dynamic filter logic
  const filteredProducts = products.filter(p => {
    if (p.status !== "ACTIVE") return false;

    // Search query
    const matchSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) || 
                        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                        (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));

    // Category match (case-insensitive & trimmed safety checks)
    const matchCategory = selectedCategory === "All" || 
                          (p.category && p.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());

    // Price Range based on Retail or Wholesale Mode
    const priceVal = marketMode === "b2c" ? p.prices.RETAIL : (p.prices.DISTRIBUTOR || p.prices.RETAIL);
    const minVal = priceMin ? parseFloat(priceMin) : 0;
    const maxVal = priceMax ? parseFloat(priceMax) : Infinity;
    const matchPrice = priceVal >= minVal && priceVal <= maxVal;

    // Warehouse availability
    const matchWh = selectedWarehouse === "All" || (Array.isArray(p.inventory) && p.inventory.some(inv => inv.warehouse_id === selectedWarehouse && inv.quantity > 0));

    // Free shipping
    const matchesShipping = !freeShippingOnly || priceVal > 25000;

    return matchSearch && matchCategory && matchPrice && matchWh && matchesShipping;
  });

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => {
    const priceVal = marketMode === "b2c" ? item.product.prices.RETAIL : (item.product.prices.DISTRIBUTOR || item.product.prices.RETAIL);
    return sum + priceVal * item.qty;
  }, 0);

  // Validate Minimum Wholesale Qty (MOQ) for all items in the B2B cart
  const b2bMinQtyError = marketMode === "b2b" && cart.some(item => item.qty < (item.product.min_wholesale_qty || 1));

  const handleCheckout = () => {
    if (b2bMinQtyError) {
      alert("Please adjust quantities to meet the minimum wholesale requirements before checking out.");
      return;
    }
    // Redirection to Login
    onGetStarted(marketMode === "b2b" ? "distributor" : "buyer");
  };

  const isGuest = !currentUser || currentUser.user_id === "guest";

  return (
    <div className="min-h-screen bg-[#F4F5F8] text-[#0F172A] flex flex-col font-sans selection:bg-[#4F46E5] selection:text-white text-xs">
      
      {/* AliExpress-Style Premium Header in Indigo Theme */}
      <header className="sticky top-0 z-40 bg-[#4F46E5] text-white shadow-md">
        {/* Top Info Ribbon */}
        <div className="bg-[#3730A3] text-[10px] px-6 py-1.5 flex justify-between items-center tracking-wider text-white/90">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Globe size={11} /> Shipping to Pakistan (PKR)</span>
            <span>Welcome to CommerceIQ B2B & Retail Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="cursor-pointer hover:underline">Help & Contact</span>
            <span className="cursor-pointer hover:underline">Seller Channel</span>
          </div>
        </div>

        {/* Main Header bar */}
        <div className="h-16 px-6 sm:px-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => { setSelectedCategory("All"); setSearch(""); }}>
            <div className="w-9 h-9 bg-white text-[#4F46E5] rounded-lg flex items-center justify-center font-black text-lg shadow-md">
              IQ
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight leading-none">CommerceIQ</div>
              <div className="text-[8px] text-white/80 font-bold tracking-widest uppercase mt-0.5">Wholesale & Retail</div>
            </div>
          </div>

          {/* Centered Search Bar */}
          <div className="flex-1 max-w-xl relative flex items-center">
            <input
              type="text"
              placeholder="Search by product name, SKU code, or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#3730A3] shadow-md placeholder:text-slate-400"
            />
            <button className="absolute right-1 w-9 h-7 bg-[#222222] hover:bg-[#333] text-white rounded-full flex items-center justify-center transition-colors">
              <Search size={14} />
            </button>
          </div>

          {/* Actions & Account Dropdown */}
          <div className="flex items-center gap-6 shrink-0">
            {/* Market Mode Selector Tabs */}
            <div className="bg-white/10 p-0.5 rounded-full flex gap-0.5 border border-white/20">
              <button
                onClick={() => { setMarketMode("b2c"); clearCart(); }}
                className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase transition-all ${marketMode === "b2c" ? "bg-white text-[#4F46E5] shadow-sm" : "text-white hover:bg-white/10"}`}
              >
                🛒 Retail
              </button>
              <button
                onClick={() => { setMarketMode("b2b"); clearCart(); }}
                className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase transition-all ${marketMode === "b2b" ? "bg-white text-[#4F46E5] shadow-sm" : "text-white hover:bg-white/10"}`}
              >
                🏢 Wholesale
              </button>
            </div>

            {/* Auth Indicator */}
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onGetStarted(marketMode === "b2b" ? "distributor" : "buyer")}>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
                {isGuest ? <LogIn size={14} /> : <UserCheck size={14} />}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-[10px] text-white/80 leading-none">Hello, {isGuest ? "Guest" : currentUser.first_name}</div>
                <div className="font-bold text-[11px] leading-tight mt-0.5">{isGuest ? "Sign In / Register" : "Go to Portal"}</div>
              </div>
            </div>

            {/* Shopping Cart Trigger */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors border-0 text-white cursor-pointer"
            >
              <ShoppingCart size={16} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-slate-900 rounded-full flex items-center justify-center font-bold text-[9px] shadow-sm animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* AliExpress Layout Grid */}
      <main className="max-w-[1400px] mx-auto px-6 py-6 flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
        
        {/* Left Filter Sidebar */}
        <aside className="md:col-span-1 surface-premium p-5 flex flex-col gap-6 self-start sticky top-4 animate-[fadeInUp_0.5s_var(--ease-premium)_both]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-bold text-sm tracking-tight flex items-center gap-1.5"><SlidersHorizontal size={14} /> Filters & Specs</span>
            <button 
              onClick={() => { setSelectedCategory("All"); setPriceMin(""); setPriceMax(""); setSelectedWarehouse("All"); setFreeShippingOnly(false); }}
              className="text-[10px] text-slate-500 hover:text-[#4F46E5] hover:underline bg-transparent border-0 cursor-pointer"
            >
              Reset All
            </button>
          </div>

          {/* Category List */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[10px]">Product Categories</h4>
            
            {/* Category Search Input */}
            <div className="relative mb-2.5 flex items-center">
              <input
                type="text"
                placeholder="Search category..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-2.5 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[10px] focus:outline-none focus:border-[#4F46E5]"
              />
              <span className="absolute right-2.5 text-slate-400">
                <Search size={11} />
              </span>
            </div>

            <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1 select-none">
              {filteredCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors border-0 cursor-pointer text-xs flex justify-between items-center ${selectedCategory === cat ? "bg-indigo-50 text-[#4F46E5]" : "bg-transparent text-slate-600 hover:bg-slate-50"}`}
                >
                  <span>{cat}</span>
                  <ChevronRight size={12} className={selectedCategory === cat ? "text-[#4F46E5]" : "text-slate-400"} />
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2.5 uppercase tracking-wider text-[10px]">Price Filter (PKR)</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>

          {/* Warehouse Availability Filter */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2.5 uppercase tracking-wider text-[10px]">Depot / Warehouse Location</h4>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs cursor-pointer focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="All">All Registered Warehouses</option>
              {warehouses.map(wh => (
                <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
              ))}
            </select>
          </div>

          {/* Toggle Rule Toggles */}
          <div className="flex flex-col gap-2 pt-2">
            <label className="flex items-center gap-2.5 text-slate-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={freeShippingOnly}
                onChange={(e) => setFreeShippingOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
              />
              <span>Free Shipping Offers</span>
            </label>
          </div>

          {/* B2B Onboarding info card */}
          <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[#4F46E5] font-bold">
              <Sparkles size={14} />
              <span className="tracking-tight">B2B Wholesale Channel</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              Register as a partner distributor to unlock credit ledgers, dynamic price tiers, and seed stock across Islamabad, Lahore, and Karachi depots.
            </p>
            <button
              onClick={() => onRegisterClick("distributor")}
              className="mt-2 w-full py-2 bg-[#4F46E5] text-white font-bold text-[10px] rounded-lg border-0 cursor-pointer shadow-xs hover:bg-[#4338CA] transition-colors"
            >
              Become a Partner
            </button>
          </div>
        </aside>

        {/* Right Catalog Feed */}
        <section className="md:col-span-3 flex flex-col gap-6">
          {/* Banner Hero */}
          <div className="surface-deep relative rounded-2xl overflow-hidden p-8 text-white min-h-[180px] flex flex-col justify-center gap-2 shadow-xl animate-[fadeInUp_0.6s_var(--ease-premium)_both]">
            {/* Two drifting light sources give the panel dimension instead of a flat wash. */}
            <div className="absolute -top-1/2 right-0 w-2/3 h-[200%] bg-[#4F46E5]/25 rounded-full blur-[80px] animate-[floatSoft_8s_ease-in-out_infinite] pointer-events-none" />
            <div className="absolute -bottom-1/2 -left-1/4 w-1/2 h-[200%] bg-[#0D9488]/20 rounded-full blur-[90px] animate-[floatSoft_11s_ease-in-out_infinite] pointer-events-none" />
            <span className="gradient-brand text-[9px] font-extrabold uppercase px-3 py-1.5 rounded-full tracking-widest self-start shadow-lg relative">
              {marketMode === "b2c" ? "B2C Retail Super Deals" : "B2B Wholesale Hub"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 relative" style={{ fontFamily: "Outfit, sans-serif" }}>
              {marketMode === "b2c" ? "Premium Electronics at Retail Rates" : "Direct Factory Distributor Ledgers"}
            </h2>
            <p className="text-slate-300/90 max-w-xl text-[11px] leading-relaxed relative">
              {marketMode === "b2c" 
                ? "Get single unit items delivered immediately to your doorstep with certified secure checkouts." 
                : "Unlock special commercial rates, customized bulk payment terms, and direct inventory warehousing options."}
            </p>
          </div>

          {/* Product Cards Grid */}
          {filteredProducts.length === 0 ? (
            <div className="surface-premium p-16 text-center flex flex-col items-center justify-center gap-3 animate-[scaleIn_0.4s_var(--ease-spring)_both]">
              <ShoppingBag size={48} className="text-slate-300" />
              <h3 className="font-bold text-slate-800 text-sm">No Products Found</h3>
              <p className="text-slate-500 text-[11px]">We couldn't find any products matching your search filters.</p>
            </div>
          ) : (
            <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(p => {
                const totalStock = Array.isArray(p.inventory) ? p.inventory.reduce((sum, inv) => sum + inv.quantity, 0) : 0;
                const isOutOfStock = totalStock === 0;

                // Price selection
                const retailPrice = p.prices.RETAIL;
                const wholesalePrice = p.prices.DISTRIBUTOR || retailPrice;

                return (
                  <motion.div
                    key={p.product_id}
                    layout
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    className="surface-premium hover-lift overflow-hidden flex flex-col group cursor-default"
                  >
                    {/* Image Box */}
                    <div className="h-44 bg-slate-100 relative flex items-center justify-center p-4 border-b border-slate-100 overflow-hidden">
                      <img
                        src={p.image_url || "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&fit=crop&q=60"}
                        alt={p.product_name}
                        className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-slate-900 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col gap-2.5">
                      {/* Category & Brand */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span>{p.category}</span>
                        <span>{p.brand}</span>
                      </div>

                      {/* Name */}
                      <h3 className="font-extrabold text-slate-800 hover:text-[#4F46E5] transition-colors line-clamp-2 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                        {p.product_name}
                      </h3>


                      {/* Warehouse Stock listing (for B2B view only) */}
                      {marketMode === "b2b" && Array.isArray(p.inventory) && (
                        <div className="bg-slate-50 rounded-lg p-2 flex flex-col gap-1 border border-slate-100 text-[10px]">
                          <span className="font-bold text-slate-500 flex items-center gap-1"><Warehouse size={11} /> Depot Stock:</span>
                          <div className="grid grid-cols-2 gap-1 font-semibold text-slate-700">
                            {p.inventory.map(inv => (
                              <span key={inv.warehouse_id} className={inv.quantity === 0 ? "text-slate-400" : "text-slate-800"}>
                                {inv.city}: <span className="font-extrabold">{inv.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prices & Action Row */}
                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div>
                          {marketMode === "b2c" ? (
                            <div>
                              <div className="text-[15px] font-black text-[#4F46E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {formatCurrency(retailPrice)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-[15px] font-black text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {formatCurrency(wholesalePrice)} <span className="text-[9px] text-slate-500 font-bold uppercase">Wholesale</span>
                              </div>
                              {p.min_wholesale_qty && (
                                <div className="text-[9px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                                  <Info size={10} className="text-red-500" /> MOQ: {p.min_wholesale_qty} Units
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Cart Trigger / B2B Actions */}
                        {marketMode === "b2c" ? (
                          <button
                            onClick={() => {
                              addToCart(p.product_id);
                            }}
                            disabled={isOutOfStock}
                            className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-extrabold text-[10px] uppercase rounded-full shadow-sm cursor-pointer border-0 transition-colors"
                          >
                            Add to Cart
                          </button>
                        ) : (
                          <div className="flex gap-2 w-full max-w-[220px]">
                            <button
                              onClick={() => handleAddToQuote(p)}
                              disabled={isOutOfStock}
                              className="flex-1 py-2 bg-slate-50 border border-[#E2E8F0] text-blue-600 rounded-lg text-[10px] font-extrabold hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer active:scale-[0.98] text-center"
                            >
                              Request Quote
                            </button>
                            <button
                              onClick={() => handleDirectOrder(p)}
                              disabled={isOutOfStock}
                              className="flex-1 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-extrabold hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer active:scale-[0.98] text-center"
                            >
                              Direct Order
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Product Details Drawer */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
                <span className="font-extrabold text-slate-800 text-sm">Product Specifications</span>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 border-0 bg-transparent cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 text-xs text-slate-600">
                {/* Image */}
                <div className="h-56 bg-slate-50 rounded-2xl flex items-center justify-center p-4 border border-slate-100">
                  <img
                    src={selectedProduct.image_url || "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&fit=crop&q=60"}
                    alt={selectedProduct.product_name}
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                </div>

                {/* Info titles */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-[#4F46E5] font-bold uppercase tracking-wider bg-indigo-50 self-start px-2 py-0.5 rounded">
                    {selectedProduct.category}
                  </span>
                  <h2 className="text-base font-black text-slate-800 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {selectedProduct.product_name}
                  </h2>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-1.5 uppercase tracking-wider text-[10px]">Short Description</h4>
                  <p className="leading-relaxed text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedProduct.description || "No product description provided."}
                  </p>
                </div>

                {/* Stock per Warehouse breakdown */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[10px] flex items-center gap-1"><Warehouse size={11} /> Warehouse Availability</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.isArray(selectedProduct.inventory) && selectedProduct.inventory.map(inv => (
                      <div key={inv.warehouse_id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800">{inv.warehouse_name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{inv.city}, {inv.country}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-sm text-slate-800">{inv.quantity}</div>
                          <div className="text-[10px] text-slate-400">Units</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specs List */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[10px]">Specifications Detail</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {[
                      { label: "SKU Reference", value: selectedProduct.sku || "N/A" },
                      { label: "UPC Barcode", value: selectedProduct.barcode || "N/A" },
                      { label: "Brand Origin", value: selectedProduct.brand || "N/A" },
                      { label: "Product Unit", value: selectedProduct.unit || "PCS" },
                      { label: "Unit Weight", value: selectedProduct.weight ? `${selectedProduct.weight} kg` : "N/A" },
                      { label: "Max Discount Allowed", value: selectedProduct.max_discount ? `${selectedProduct.max_discount}%` : "0%" },
                      { label: "Min Wholesale MOQ", value: selectedProduct.min_wholesale_qty ? `${selectedProduct.min_wholesale_qty} Units` : "1 Unit" }
                    ].map((spec, index) => (
                      <div key={index} className="flex justify-between items-center px-4 py-2.5">
                        <span className="font-semibold text-slate-400">{spec.label}</span>
                        <span className="font-bold text-slate-700">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Price Estimate</div>
                  <div className="text-lg font-black text-[#4F46E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {formatCurrency(marketMode === "b2c" ? selectedProduct.prices.RETAIL : (selectedProduct.prices.DISTRIBUTOR || selectedProduct.prices.RETAIL))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      addToCart(selectedProduct.product_id);
                      if (marketMode === "b2b" && selectedProduct.min_wholesale_qty > 1) {
                        setTimeout(() => {
                          updateCartQty(selectedProduct.product_id, selectedProduct.min_wholesale_qty - 1);
                        }, 50);
                      }
                      setSelectedProduct(null);
                    }}
                    className="px-6 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-[11px] uppercase rounded-full shadow-md cursor-pointer border-0 transition-colors"
                  >
                    Add To Cart
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AliExpress-Style Cart Drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
                <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5"><ShoppingCart size={15} /> Your Shopping Cart ({cartCount})</span>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 border-0 bg-transparent cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                    <ShoppingCart size={40} className="text-slate-300" />
                    <span>Your cart is empty.</span>
                  </div>
                ) : (
                  cart.map(item => {
                    const priceVal = marketMode === "b2c" ? item.product.prices.RETAIL : (item.product.prices.DISTRIBUTOR || item.product.prices.RETAIL);
                    const moq = marketMode === "b2b" ? (item.product.min_wholesale_qty || 1) : 1;
                    const belowMoq = item.qty < moq;

                    return (
                      <div key={item.product.product_id} className={`flex flex-col gap-2 p-3.5 border rounded-xl transition-colors ${belowMoq ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                        <div className="flex gap-3">
                          {/* Image Thumbnail */}
                          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0 p-1.5">
                            <img src={item.product.image_url} alt={item.product.product_name} className="max-h-full max-w-full object-contain" />
                          </div>
                          {/* Product Details */}
                          <div className="flex-1 flex flex-col gap-1 min-w-0">
                            <h4 className="font-bold text-slate-800 line-clamp-1">{item.product.product_name}</h4>
                            <span className="text-[10px] text-slate-400">SKU: {item.product.sku}</span>
                            <div className="font-extrabold text-slate-800 mt-1">{formatCurrency(priceVal)}</div>
                          </div>
                        </div>

                        {/* MOQ Validation Alerts */}
                        {belowMoq && (
                          <div className="flex items-center gap-1.5 text-red-600 font-bold text-[9px] bg-red-100/55 p-1.5 rounded-lg border border-red-200/50">
                            <AlertTriangle size={11} />
                            <span>Wholesale Minimum MOQ is {moq} units! (Current: {item.qty})</span>
                          </div>
                        )}

                        {/* Qty Adjustment Row */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400">Change Quantity:</span>
                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button
                              onClick={() => updateCartQty(item.product.product_id, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-white transition-colors border-0 bg-transparent cursor-pointer"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="w-8 text-center font-extrabold text-slate-800 text-[11px]">{item.qty}</span>
                            <button
                              onClick={() => updateCartQty(item.product.product_id, 1)}
                              disabled={item.qty >= (item.product.inventory || []).reduce((sum, i) => sum + (i.available_quantity !== undefined ? i.available_quantity : Math.max(0, (i.quantity || 0) - (i.reserved_quantity || 0))), 0)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-white transition-colors border-0 bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Cart Drawer Footer */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500">Estimated Total:</span>
                    <span className="text-base font-black text-[#4F46E5]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={b2bMinQtyError}
                    className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-xs uppercase rounded-full shadow-md cursor-pointer border-0 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={13} />
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full py-2 bg-transparent text-slate-400 hover:text-red-500 font-semibold text-[10px] uppercase cursor-pointer border-0 hover:underline"
                  >
                    Clear All Cart Items
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AliExpress-Style Homepage Grid Sections */}
      <section className="bg-white border-t border-b border-slate-200 py-12 px-6 mt-8">
        <div className="max-w-[1200px] mx-auto text-center flex flex-col gap-8">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
            Why Partner with CommerceIQ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: <Warehouse className="text-[#4F46E5]" size={20} />,
                title: "Flexible Depot Network",
                desc: "Real-time sync across Karachi, Lahore, and Islamabad terminal locations."
              },
              {
                icon: <Tag className="text-[#4F46E5]" size={20} />,
                title: "Multi-Tier B2B Pricing",
                desc: "Get factory-direct distributor, wholesale, VIP, and customized dealer rates."
              },
              {
                icon: <ShieldCheck className="text-[#4F46E5]" size={20} />,
                title: "Safe Credit Lines",
                desc: "Certified B2B ledger balances with secure payment Allocations."
              }
            ].map((card, idx) => (
              <div key={idx} className="surface-premium hover-lift-sm p-6 flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  {card.icon}
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm mt-1">{card.title}</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6 mt-auto">
        <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-4 text-center">
          <div className="flex gap-6 text-[11px] font-semibold text-slate-300">
            <a href="#" className="hover:text-white transition-colors">Products</a>
            <a href="#" className="hover:text-white transition-colors">Company</a>
            <a href="#" className="hover:text-white transition-colors">Legal Terms</a>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            © 2026 CommerceIQ. Created for B2B Inventory Management & Ledgers. PKR.
          </p>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 bg-[#0F172A] text-white px-5 py-3 rounded-lg shadow-2xl animate-fade-down z-[100] flex items-center gap-3">
          <CheckCircle size={16} className="text-emerald-400" />
          <span className="font-medium text-xs tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Request Quote Modal */}
      <Modal
        open={activeProductForQuote !== null}
        onClose={() => setActiveProductForQuote(null)}
        title="Configure Quote Request Item"
      >
        {activeProductForQuote && (() => {
          const minQty = activeProductForQuote.min_wholesale_qty || 1;
          const availableQty = (activeProductForQuote.inventory || []).reduce((sum, inv) => sum + (inv.quantity || 0), 0);
          const unitPrice = activeProductForQuote.prices.DISTRIBUTOR || activeProductForQuote.prices.RETAIL;
          
          return (
            <div className="flex flex-col gap-6 text-xs text-[#64748B]">
              <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-[#CBD5E1] flex-shrink-0 flex items-center justify-center">
                  <img
                    src={activeProductForQuote.image_url || "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop"}
                    alt={activeProductForQuote.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {activeProductForQuote.category}
                  </span>
                  <h4 className="font-bold text-[#0F172A] mt-1.5 text-sm truncate">{activeProductForQuote.product_name}</h4>
                  <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                    Product Code: {activeProductForQuote.sku}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-[#F0FDF4] p-3 rounded-lg border border-emerald-100">
                  <p className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Distributor Rate</p>
                  <p className="text-base font-extrabold text-[#16A34A]">{formatCurrency(unitPrice)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-[#E2E8F0]">
                  <p className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Available Stock</p>
                  <p className="text-base font-extrabold text-[#0F172A]">
                    {availableQty.toLocaleString()} {activeProductForQuote.unit || "PCS"}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#0F172A] text-xs">Wholesale Quantity</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">
                      Required MOQ: {minQty} {activeProductForQuote.unit || "PCS"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuoteQuantity(prev => Math.max(minQty, prev - 1))}
                      disabled={quoteQuantity <= minQty}
                      className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 disabled:opacity-30"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      className="w-16 h-8 text-center font-mono font-bold text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:border-blue-500"
                      value={quoteQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) setQuoteQuantity(val);
                        else setQuoteQuantity("");
                      }}
                      onBlur={() => {
                        const val = parseInt(quoteQuantity);
                        if (isNaN(val) || val < minQty) setQuoteQuantity(minQty);
                        else if (val > availableQty) setQuoteQuantity(availableQty);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setQuoteQuantity(prev => Math.min(availableQty, prev + 1))}
                      disabled={quoteQuantity >= availableQty}
                      className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-blue-100/50 pt-2.5 mt-1 text-[10px] text-[#64748B]">
                  <span>Subtotal Value</span>
                  <span className="font-mono font-extrabold text-[#0F172A] text-sm">
                    {formatCurrency((parseFloat(customProposedPrice) || unitPrice) * (quoteQuantity || 0))}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-[#0F172A] text-xs">Propose Custom Unit Price</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#64748B]">Rs</span>
                    <input
                      type="number"
                      className="w-28 h-8 px-2 text-right font-mono font-bold text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:border-blue-500"
                      value={customProposedPrice}
                      onChange={(e) => setCustomProposedPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setActiveProductForQuote(null)}
                  className="px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddToQuote}
                  className="px-5 py-2 bg-[#4F46E5] border-0 text-white rounded-lg text-xs font-bold hover:bg-[#4338CA] transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  Confirm & Add
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Direct Order Modal */}
      <Modal
        open={activeProductForDirectOrder !== null}
        onClose={() => setActiveProductForDirectOrder(null)}
        title="Place Direct Purchase Order"
      >
        {activeProductForDirectOrder && (() => {
          const availableQty = (activeProductForDirectOrder.inventory || []).reduce((sum, inv) => sum + (inv.quantity || 0), 0);
          const minQty = activeProductForDirectOrder.min_wholesale_qty || 1;
          const unitPrice = activeProductForDirectOrder.prices.DISTRIBUTOR || activeProductForDirectOrder.prices.RETAIL;
          
          return (
            <div className="flex flex-col gap-5 text-xs text-[#64748B]">
              <p className="text-slate-500">
                Skip the quotation request and buy this product directly at the current pre-approved distributor rate.
              </p>
              <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-[#CBD5E1] flex-shrink-0 flex items-center justify-center">
                  <img
                    src={activeProductForDirectOrder.image_url || "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop"}
                    alt={activeProductForDirectOrder.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {activeProductForDirectOrder.category}
                  </span>
                  <h4 className="font-bold text-[#0F172A] mt-1.5 text-sm truncate">{activeProductForDirectOrder.product_name}</h4>
                  <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                    Product Code: {activeProductForDirectOrder.sku}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-[#F0FDF4] p-3 rounded-lg border border-emerald-100">
                  <p className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Distributor Rate</p>
                  <p className="text-base font-extrabold text-[#16A34A]">{formatCurrency(unitPrice)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-[#E2E8F0]">
                  <p className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Available Stock</p>
                  <p className="text-base font-extrabold text-[#0F172A]">
                    {availableQty.toLocaleString()} {activeProductForDirectOrder.unit || "PCS"}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#0F172A] text-xs">Order Quantity</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">
                      Required MOQ: {minQty} {activeProductForDirectOrder.unit || "PCS"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDirectOrderQuantity(prev => Math.max(minQty, prev - 1))}
                      disabled={directOrderQuantity <= minQty}
                      className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 disabled:opacity-30"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      className="w-16 h-8 text-center font-mono font-bold text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:border-blue-500"
                      value={directOrderQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) setDirectOrderQuantity(val);
                        else setDirectOrderQuantity("");
                      }}
                      onBlur={() => {
                        const val = parseInt(directOrderQuantity);
                        if (isNaN(val) || val < minQty) setDirectOrderQuantity(minQty);
                        else if (val > availableQty) setDirectOrderQuantity(availableQty);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setDirectOrderQuantity(prev => Math.min(availableQty, prev + 1))}
                      disabled={directOrderQuantity >= availableQty}
                      className="w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-blue-100/50 pt-2.5 mt-1 text-[10px] text-[#64748B]">
                  <span>Total Order Value</span>
                  <span className="font-mono font-extrabold text-[#0F172A] text-sm">
                    {formatCurrency(unitPrice * (directOrderQuantity || 0))}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setActiveProductForDirectOrder(null)}
                  className="px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDirectOrder}
                  className="px-5 py-2 bg-emerald-600 border-0 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  Proceed to Login & Order
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

    </div>
  );
}
