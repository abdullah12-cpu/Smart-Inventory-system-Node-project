import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  formatCurrency,
  computeStockAlertStatus,
  formatDate
} from "@/lib/data";
import { ProductStatusBadge, StockAlertBadge, Badge } from "@/components/ui";
import Drawer from "@/components/Drawer";
import {
  CheckCircle,
  Warehouse,
  Edit3,
  Save,
  ArrowUpCircle,
  ArrowDownCircle,
  History
} from "lucide-react";
import { useEffect } from "react";

export default function ProductDrawer({ product, open, onClose }) {
  const { adjustWarehouseStock, updateProductAlertRules, stockMovements, deleteProduct, products, updateProductDetails } = useStore();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    product.inventory[0]?.warehouse_id || ""
  );
  const [delta, setDelta] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [toast, setToast] = useState("");
  const [editingThresholds, setEditingThresholds] = useState(false);
  const [lowThreshold, setLowThreshold] = useState(product.low_stock_threshold);
  const [totalProductLimit, setTotalProductLimit] = useState(
    product.total_product_limit || 100
  );
  const [detailTab, setDetailTab] = useState("stock");

  // Edit states
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState(product.product_name || "");
  const [editCategory, setEditCategory] = useState(product.category || "");
  const [newCategory, setNewCategory] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editBrand, setEditBrand] = useState(product.brand || "");
  const [editBarcode, setEditBarcode] = useState(product.barcode || "");
  const [editDesc, setEditDesc] = useState(product.short_description || "");
  const [editUnit, setEditUnit] = useState(product.unit || "PCS");
  const [editWeight, setEditWeight] = useState(product.weight || 0);
  const [editRetailPrice, setEditRetailPrice] = useState(product.prices?.RETAIL || 0);
  const [editDistPrice, setEditDistPrice] = useState(product.prices?.DISTRIBUTOR || 0);
  const [editImageUrl, setEditImageUrl] = useState(product.image_url || "");
  const [editMinWholesaleQty, setEditMinWholesaleQty] = useState(product.min_wholesale_qty || 1);
  const [editMaxDiscount, setEditMaxDiscount] = useState(product.max_discount || 10);

  const defaultCategories = ["Networking", "Compute Cards", "Fiber Optics", "UPS & Power"];
  const allCategories = Array.from(new Set([...defaultCategories, ...(products || []).map(p => p.category).filter(Boolean)]));

  useEffect(() => {
    if (product) {
      setEditName(product.product_name || "");
      setEditCategory(product.category || "");
      setEditBrand(product.brand || "");
      setEditBarcode(product.barcode || "");
      setEditDesc(product.short_description || "");
      setEditUnit(product.unit || "PCS");
      setEditWeight(product.weight || 0);
      setEditRetailPrice(product.prices?.RETAIL || 0);
      setEditDistPrice(product.prices?.DISTRIBUTOR || 0);
      setEditImageUrl(product.image_url || "");
      setEditMinWholesaleQty(product.min_wholesale_qty || 1);
      setEditMaxDiscount(product.max_discount || 10);
      setIsCreatingCategory(false);
      setNewCategory("");
    }
  }, [product]);

  const handleCategoryChange = (val) => {
    if (val === "__NEW__") {
      setIsCreatingCategory(true);
      setEditCategory("");
    } else {
      setIsCreatingCategory(false);
      setEditCategory(val);
    }
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDetails = async () => {
    if (!editName.trim()) {
      alert("Product Name cannot be empty.");
      return;
    }
    if (!editBarcode.trim()) {
      alert("Barcode cannot be empty.");
      return;
    }
    if (!/^\d+$/.test(editBarcode.trim())) {
      alert("Barcode must contain only numbers.");
      return;
    }

    const cleanedBrand = editBrand.trim();
    if (cleanedBrand) {
      const brandRegex = /^[a-zA-Z0-9\s.\-&]+$/;
      if (!brandRegex.test(cleanedBrand) || !/[a-zA-Z]/.test(cleanedBrand)) {
        alert("Brand name must be valid (should contain letters, and no random symbols like brackets).");
        return;
      }
    }

    const pWeight = parseFloat(editWeight);
    if (isNaN(pWeight) || pWeight <= 0) {
      alert("Weight must be a positive number greater than 0.");
      return;
    }

    const pRetail = parseFloat(editRetailPrice);
    const pDist = parseFloat(editDistPrice);
    if (isNaN(pRetail) || pRetail < 0 || isNaN(pDist) || pDist < 0) {
      alert("Price values cannot be negative.");
      return;
    }

    const parsedMinWholesale = parseInt(editMinWholesaleQty);
    if (isNaN(parsedMinWholesale) || parsedMinWholesale < 1) {
      alert("Minimum Wholesale Quantity must be a positive number greater than or equal to 1.");
      return;
    }

    const finalCategory = isCreatingCategory ? newCategory.trim() : editCategory.trim();
    if (!finalCategory) {
      alert("Category cannot be empty.");
      return;
    }

    const parsedMaxDiscount = parseInt(editMaxDiscount);
    if (isNaN(parsedMaxDiscount) || parsedMaxDiscount < 0 || parsedMaxDiscount > 100) {
      alert("Max discount must be a number between 0% and 100%.");
      return;
    }

    const updated = await updateProductDetails(product.product_id, {
      product_name: editName.trim(),
      category: finalCategory,
      brand: cleanedBrand || "Generic",
      barcode: editBarcode.trim(),
      short_description: editDesc.trim(),
      unit: editUnit.trim(),
      weight: pWeight,
      prices: {
        ...product.prices,
        RETAIL: pRetail,
        DISTRIBUTOR: pDist,
        VIP: pDist,
        CUSTOM: pDist
      },
      image_url: editImageUrl,
      min_wholesale_qty: parsedMinWholesale,
      max_discount: parsedMaxDiscount
    });

    if (updated) {
      setIsEditingDetails(false);
      setToast("Product details updated successfully!");
      setTimeout(() => setToast(""), 2500);
    }
  };
  const handleAdjust = (e) => {
    e.preventDefault();
    const n = parseInt(delta);
    if (isNaN(n) || !selectedWarehouseId) return;
    adjustWarehouseStock(
      product.product_id,
      selectedWarehouseId,
      n,
      adjustNotes || "Manual inventory audit adjustment."
    );
    setDelta("");
    setAdjustNotes("");
    setToast("Ledger adjustment applied successfully!");
    setTimeout(() => setToast(""), 2500);
  };
  const handleSaveThresholds = () => {
    updateProductAlertRules(product.product_id, lowThreshold, totalProductLimit, totalProductLimit);
    setEditingThresholds(false);
    setToast("Alert thresholds and limit rules updated!");
    setTimeout(() => setToast(""), 2500);
  };
  const totalQuantity = product.inventory.reduce(
    (sum, inv) => sum + inv.quantity,
    0
  );
  const totalReserved = product.inventory.reduce(
    (sum, inv) => sum + inv.reserved_quantity,
    0
  );
  const totalAvailable = product.inventory.reduce(
    (sum, inv) => sum + inv.available_quantity,
    0
  );
  const derivedAlertStatus = computeStockAlertStatus(
    totalAvailable,
    product.low_stock_threshold,
    product.total_product_limit || 100
  );
  const productMovements = stockMovements.filter(
    (m) => m.product_id === product.product_id
  );
  const DETAIL_TABS = [
    { id: "stock", label: "Warehouse Stock" },
    { id: "prices", label: "Price Tiers" },
    { id: "history", label: "Movement Log" }
  ];
  return /* @__PURE__ */ jsxs(
    Drawer,
    {
      open,
      onClose,
      title: isEditingDetails ? `Edit Details: ${product.product_name}` : product.product_name,
      subtitle: `Product Code: ${product.sku} | Barcode: ${product.barcode}`,
      footer: isEditingDetails ? /* @__PURE__ */ jsxs("div", { className: "flex gap-2 w-full", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleSaveDetails,
            className: "flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-sm",
            children: "Save Changes"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setIsEditingDetails(false);
              setEditName(product.product_name || "");
              setEditCategory(product.category || "");
              setEditBrand(product.brand || "");
              setEditBarcode(product.barcode || "");
              setEditDesc(product.short_description || "");
              setEditUnit(product.unit || "PCS");
              setEditWeight(product.weight || 0);
              setEditRetailPrice(product.prices?.RETAIL || 0);
              setEditDistPrice(product.prices?.DISTRIBUTOR || 0);
              setEditImageUrl(product.image_url || "");
              setEditMinWholesaleQty(product.min_wholesale_qty || 1);
              setEditMaxDiscount(product.max_discount || 10);
              setIsCreatingCategory(false);
              setNewCategory("");
            },
            className: "flex-1 py-2.5 border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer bg-white",
            children: "Cancel"
          }
        )
      ] }) : /* @__PURE__ */ jsxs("div", { className: "flex gap-2 w-full", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setIsEditingDetails(true),
            className: "flex-1 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0 shadow-sm",
            children: "Edit Details"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              if (window.confirm(`Are you sure you want to permanently delete "${product.product_name}" from the inventory catalog?`)) {
                deleteProduct(product.product_id);
                onClose();
              }
            },
            className: "flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0",
            children: "Delete Product"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onClose,
            className: "flex-1 py-2.5 border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer bg-white",
            children: "Close Sheet"
          }
        )
      ] }),
      children: [
        isEditingDetails ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 text-xs animate-cross-fade", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Product Name" }),
            /* @__PURE__ */ jsx("input", {
              type: "text",
              className: "input-field py-2 text-xs",
              value: editName,
              onChange: (e) => setEditName(e.target.value)
            })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Brand" }),
              /* @__PURE__ */ jsx("input", {
                type: "text",
                className: "input-field py-2 text-xs",
                value: editBrand,
                onChange: (e) => setEditBrand(e.target.value)
              })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "UPC Barcode" }),
              /* @__PURE__ */ jsx("input", {
                type: "text",
                className: "input-field py-2 text-xs",
                value: editBarcode,
                onChange: (e) => setEditBarcode(e.target.value)
              })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Category" }),
              /* @__PURE__ */ jsxs("select", {
                className: "input-field py-2 text-xs",
                value: isCreatingCategory ? "__NEW__" : editCategory,
                onChange: (e) => handleCategoryChange(e.target.value),
                children: [
                  allCategories.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c)),
                  /* @__PURE__ */ jsx("option", { value: "__NEW__", children: "+ Add New" })
                ]
              }),
              isCreatingCategory && /* @__PURE__ */ jsx("input", {
                type: "text",
                className: "input-field py-1.5 text-xs mt-1.5",
                placeholder: "New Category",
                value: newCategory,
                onChange: (e) => {
                  setNewCategory(e.target.value);
                  setEditCategory(e.target.value);
                }
              })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Unit" }),
              /* @__PURE__ */ jsx("input", {
                type: "text",
                className: "input-field py-2 text-xs",
                value: editUnit,
                onChange: (e) => setEditUnit(e.target.value)
              })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Weight (kg)" }),
              /* @__PURE__ */ jsx("input", {
                type: "number",
                step: "0.01",
                className: "input-field py-2 text-xs",
                value: editWeight,
                onChange: (e) => setEditWeight(e.target.value)
              })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-4 gap-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Retail Price" }),
              /* @__PURE__ */ jsx("input", {
                type: "number",
                className: "input-field py-2 text-xs",
                value: editRetailPrice,
                onChange: (e) => setEditRetailPrice(e.target.value)
              })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Distributor Price" }),
              /* @__PURE__ */ jsx("input", {
                type: "number",
                className: "input-field py-2 text-xs",
                value: editDistPrice,
                onChange: (e) => setEditDistPrice(e.target.value)
              })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Min. Wholesale Qty" }),
              /* @__PURE__ */ jsx("input", {
                type: "number",
                min: "1",
                className: "input-field py-2 text-xs",
                value: editMinWholesaleQty,
                onChange: (e) => setEditMinWholesaleQty(e.target.value)
              })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Max Discount (%)" }),
              /* @__PURE__ */ jsx("input", {
                type: "number",
                min: "0",
                max: "100",
                className: "input-field py-2 text-xs",
                value: editMaxDiscount,
                onChange: (e) => setEditMaxDiscount(e.target.value)
              })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Product Image" }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 border border-[#E2E8F0] p-3 rounded-lg bg-slate-50/50", children: [
              editImageUrl ? /* @__PURE__ */ jsxs("div", { className: "relative w-12 h-12 rounded border border-[#E2E8F0] overflow-hidden bg-white flex-shrink-0", children: [
                /* @__PURE__ */ jsx("img", { src: editImageUrl, alt: "Preview", className: "w-full h-full object-cover" }),
                /* @__PURE__ */ jsx("button", {
                  type: "button",
                  onClick: () => setEditImageUrl(""),
                  className: "absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center border-0 text-[8px] font-bold cursor-pointer hover:bg-red-600 shadow-sm",
                  children: "×"
                })
              ] }) : /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded border border-dashed border-[#CBD5E1] bg-white flex items-center justify-center text-[#94A3B8] text-[9px] flex-shrink-0", children: "No Image" }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                /* @__PURE__ */ jsx("input", {
                  type: "file",
                  accept: "image/*",
                  onChange: handleEditFileChange,
                  className: "hidden",
                  id: "edit-product-image-file-input"
                }),
                /* @__PURE__ */ jsx("label", {
                  htmlFor: "edit-product-image-file-input",
                  className: "inline-flex items-center px-2.5 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[9px] font-bold rounded cursor-pointer transition-colors shadow-sm",
                  children: editImageUrl ? "Change Image" : "Upload File"
                })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Description" }),
            /* @__PURE__ */ jsx("textarea", {
              rows: 3,
              className: "input-field py-2 text-xs",
              value: editDesc,
              onChange: (e) => setEditDesc(e.target.value)
            })
          ] })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsx(ProductStatusBadge, { status: product.status }),
            /* @__PURE__ */ jsx(StockAlertBadge, { status: derivedAlertStatus }),
            /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-[#64748B] font-medium ml-auto", children: [
              "Total: ",
              /* @__PURE__ */ jsx("strong", { className: "text-[#0F172A]", children: totalQuantity }),
              " | Reserved: ",
              /* @__PURE__ */ jsx("strong", { className: "text-[#E11D48]", children: totalReserved }),
              " ",
              "| Available:",
              " ",
              /* @__PURE__ */ jsx("strong", { className: "text-[#4F46E5]", children: totalAvailable })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(InfoSection, { title: "Product Metadata", children: [
            /* @__PURE__ */ jsx(
              InfoGrid,
              {
                items: [
                  { label: "Brand", val: product.brand },
                  { label: "Category Group", val: product.category },
                  { label: "Base Unit", val: product.unit },
                  { label: "Weight (kg)", val: `${product.weight.toFixed(2)} kg` },
                  { label: "Min. Wholesale Qty", val: `${product.min_wholesale_qty || 1} ${product.unit}` },
                  { label: "Max Custom Discount", val: `${product.max_discount || 10}%` }
                ]
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-[11px] text-[#64748B] mt-3 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] leading-relaxed", children: product.short_description })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "border-t border-[#F1F5F9] pt-4 mt-4", children: [
            /* @__PURE__ */ jsx("div", { className: "flex border border-[#E2E8F0] rounded-lg overflow-hidden mb-4", children: DETAIL_TABS.map((t) => /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setDetailTab(t.id),
                className: `flex-1 px-3 py-2 text-[11px] font-bold border-0 cursor-pointer transition-all duration-150 ${detailTab === t.id ? "bg-[#4F46E5] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`,
                children: t.label
              },
              t.id
            )) }),
            detailTab === "stock" && /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2.5 animate-cross-fade", children: product.inventory.map((inv) => {
              const pct = totalQuantity > 0 ? inv.quantity / totalQuantity * 100 : 0;
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  className: "bg-white border border-[#E2E8F0] rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-[#4F46E5]/30 transition-colors",
                  children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5 text-left", children: [
                        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-[11px] font-bold text-[#0F172A]", children: [
                          /* @__PURE__ */ jsx(Warehouse, { size: 13, className: "text-[#4F46E5]" }),
                          inv.warehouse_name
                        ] }),
                        /* @__PURE__ */ jsxs("span", { className: "text-[9px] text-[#64748B] pl-5 font-semibold", children: [
                          inv.city || (inv.warehouse_id === "wh-1" ? "Karachi" : "Lahore"),
                          ", ",
                          inv.country || "Pakistan"
                        ] })
                      ] }),
                      /* @__PURE__ */ jsx(
                        StockAlertBadge,
                        {
                          status: computeStockAlertStatus(
                            inv.available_quantity,
                            product.low_stock_threshold,
                            product.total_product_limit || 100
                          )
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: "h-full bg-[#4F46E5] rounded-full transition-all duration-500",
                        style: { width: `${Math.min(pct, 100)}%` }
                      }
                    ) }),
                    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2 text-center text-[10px] pt-1 border-t border-[#F8FAFC]", children: [
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("div", { className: "text-[#64748B]", children: "Quantity" }),
                        /* @__PURE__ */ jsx("div", { className: "font-bold text-[#0F172A]", children: inv.quantity })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("div", { className: "text-[#64748B]", children: "Reserved" }),
                        /* @__PURE__ */ jsx("div", { className: "font-bold text-[#E11D48]", children: inv.reserved_quantity })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("div", { className: "text-[#4F46E5] font-semibold", children: "Available" }),
                        /* @__PURE__ */ jsx("div", { className: "font-bold text-[#4F46E5]", children: inv.available_quantity })
                      ] })
                    ] })
                  ]
                },
                inv.warehouse_id
              );
            }) }),
            detailTab === "prices" && /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-2 text-xs animate-cross-fade", children: [
              {
                tier: "Retail B2C Rate",
                price: product.prices.RETAIL,
                color: "#0F172A",
                bg: "#F8FAFC"
              },
              {
                tier: "Distributor Rate",
                price: product.prices.DISTRIBUTOR,
                color: "#4F46E5",
                bg: "#EEF2FF"
              }
            ].map((p) => /* @__PURE__ */ jsxs(
              "div",
              {
                className: "border border-[#E2E8F0] p-3 rounded-lg flex flex-col justify-between hover:border-[#4F46E5]/30 transition-colors",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-[9px] text-[#64748B] uppercase tracking-wider block", children: p.tier }),
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: "text-sm mt-1 block",
                      style: { color: p.color },
                      children: formatCurrency(p.price)
                    }
                  )
                ]
              },
              p.tier
            )) }),
            detailTab === "history" && /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2 animate-cross-fade", children: productMovements.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-center text-[11px] text-[#94A3B8] py-6 font-medium", children: "No stock movements recorded for this product yet." }) : productMovements.map((m) => /* @__PURE__ */ jsxs(
              "div",
              {
                className: "border border-[#E2E8F0] rounded-lg p-3 flex items-start gap-3 bg-white hover:bg-[#F8FAFC] transition-colors",
                children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${m.movement_type === "IN" ? "bg-[#ECFDF5] text-[#10B981]" : m.movement_type === "OUT" ? "bg-[#FEF2F2] text-[#EF4444]" : "bg-[#EEF2FF] text-[#4F46E5]"}`,
                      children: m.movement_type === "IN" ? /* @__PURE__ */ jsx(ArrowUpCircle, { size: 14 }) : m.movement_type === "OUT" ? /* @__PURE__ */ jsx(ArrowDownCircle, { size: 14 }) : /* @__PURE__ */ jsx(History, { size: 14 })
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 text-[11px]", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
                      /* @__PURE__ */ jsxs("span", { className: "font-bold text-[#0F172A]", children: [
                        m.movement_type === "IN" ? "Restocked" : m.movement_type === "OUT" ? "Dispatched" : "Adjusted",
                        " (",
                        m.quantity > 0 ? `+${m.quantity}` : m.quantity,
                        ")"
                      ] }),
                      /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#94A3B8]", children: formatDate(m.created_at) })
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-500 mt-0.5 truncate", children: m.notes }),
                    /* @__PURE__ */ jsxs("p", { className: "text-[9px] text-[#4F46E5] font-semibold mt-1", children: [
                      "Operator: ",
                      m.performed_by
                    ] })
                  ] })
                ]
              },
              m.movement_id
            )) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "border-t border-[#F1F5F9] pt-4 mt-4", children: [
            editingThresholds ? /* @__PURE__ */ jsxs("div", { className: "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 animate-fade-up", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-[#0F172A] uppercase tracking-wider mb-3.5", children: "Edit Safety Alert Thresholds" }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-medium mb-1 block", children: "Low Stock Alert Trigger Level" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "number",
                      className: "input-field py-2 text-xs bg-white",
                      value: lowThreshold,
                      onChange: (e) => setLowThreshold(e.target.value)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-medium mb-1 block", children: "Total Product limit" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "number",
                      className: "input-field py-2 text-xs bg-white",
                      value: totalProductLimit,
                      onChange: (e) => setTotalProductLimit(e.target.value)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex gap-2 pt-1.5", children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: handleSaveThresholds,
                      className: "px-3 py-1.5 bg-[#4F46E5] text-white text-[11px] font-bold rounded-lg hover:bg-[#4338CA] transition-colors cursor-pointer border-0 shadow-sm",
                      children: "Save Config"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => {
                        setEditingThresholds(false);
                        setLowThreshold(product.low_stock_threshold);
                        setTotalProductLimit(product.total_product_limit || 100);
                      },
                      className: "px-3 py-1.5 text-[11px] font-bold text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] cursor-pointer bg-white",
                      children: "Cancel"
                    }
                  )
                ] })
              ] })
            ] }) : /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx(
                InfoGrid,
                {
                  items: [
                    {
                      label: "Low Stock Trigger",
                      val: `${product.low_stock_threshold} units`
                    },
                    {
                      label: "Total Product Limit",
                      val: `${product.total_product_limit || 100} units`
                    },
                    {
                      label: "Dead Stock Limit",
                      val: `${product.dead_stock_days} days`
                    }
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => setEditingThresholds(true),
                  className: "flex items-center gap-1 text-[10px] font-bold text-[#4F46E5] hover:text-[#4338CA] cursor-pointer border-0 bg-transparent flex-shrink-0 ml-3",
                  children: [
                    /* @__PURE__ */ jsx(Edit3, { size: 12 }),
                    " Edit"
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-xl p-4", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-[#0F172A] uppercase tracking-wider mb-3", children: "Quick Stock Adjuster" }),
            /* @__PURE__ */ jsxs("form", { onSubmit: handleAdjust, className: "flex flex-col gap-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-medium mb-1.5 block", children: "Target Warehouse" }),
                /* @__PURE__ */ jsx(
                  "select",
                  {
                    className: "input-field py-2 text-xs",
                    value: selectedWarehouseId,
                    onChange: (e) => setSelectedWarehouseId(e.target.value),
                    required: true,
                    children: product.inventory.map((inv) => /* @__PURE__ */ jsxs("option", { value: inv.warehouse_id, children: [
                      inv.warehouse_name,
                      " (Avail: ",
                      inv.available_quantity,
                      ")"
                    ] }, inv.warehouse_id))
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("div", { className: "flex gap-3", children: /* @__PURE__ */ jsx(
                "input",
                {
                  className: "input-field py-2 text-xs flex-1",
                  type: "number",
                  placeholder: "e.g. +20 or -15",
                  value: delta,
                  onChange: (e) => setDelta(e.target.value),
                  required: true
                }
              ) }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-medium mb-1.5 block", children: "Movement Notes" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "input-field py-2 text-xs",
                    placeholder: "Reason for adjustment (optional)",
                    value: adjustNotes,
                    onChange: (e) => setAdjustNotes(e.target.value)
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "submit",
                  className: "w-full px-4 py-2.5 bg-[#4F46E5] text-white text-[11px] font-bold rounded-lg hover:bg-[#4338CA] transition-colors cursor-pointer border-0",
                  children: "Apply Adjustment"
                }
              )
            ] }),
            toast && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-3 text-[11px] text-[#10B981] font-bold animate-fade-up", children: [
              /* @__PURE__ */ jsx(CheckCircle, { size: 14 }),
              " ",
              toast
            ] })
          ] })
        ] })
      ]
    }
  );
}
function InfoSection({ title, children }) {
  return /* @__PURE__ */ jsxs("div", { className: "border-t border-[#F1F5F9] pt-4 mt-4 first:border-0 first:pt-0 first:mt-0", children: [
    /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2.5", children: title }),
    children
  ] });
}
function InfoGrid({ items }) {
  return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3.5", children: items.map((i) => /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B]", children: i.label }),
    /* @__PURE__ */ jsx("p", { className: "text-[11px] font-bold text-[#0F172A] mt-0.5", children: i.val })
  ] }, i.label)) });
}
