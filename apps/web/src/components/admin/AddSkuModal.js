import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "@/lib/store";
import Modal from "@/components/Modal";
export default function AddSkuModal({ open, onClose, onSuccess }) {
  const { addNewProduct, products } = useStore();
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Networking");
  const [newCategory, setNewCategory] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const defaultCategories = ["Networking", "Compute Cards", "Fiber Optics", "UPS & Power"];
  const allCategories = Array.from(new Set([...defaultCategories, ...(products || []).map(p => p.category).filter(Boolean)]));

  const handleCategoryChange = (val) => {
    if (val === "__NEW__") {
      setIsCreatingCategory(true);
      setCategory("");
    } else {
      setIsCreatingCategory(false);
      setCategory(val);
    }
  };
  const [desc, setDesc] = useState("");
  const [unit, setUnit] = useState("PCS");
  const [weight, setWeight] = useState("1.5");
  const [lowStock, setLowStock] = useState("10");
  const [totalProductLimit, setTotalProductLimit] = useState("100");
  const [priceRetail, setPriceRetail] = useState("12000");
  const [priceDistributor, setPriceDistributor] = useState("10500");
  const [priceVip, setPriceVip] = useState("9800");
  const [priceCustom, setPriceCustom] = useState("9500");
  const [stockKarachi, setStockKarachi] = useState("20");
  const [stockLahore, setStockLahore] = useState("15");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sku.trim()) {
      alert("Validation Error: Product Code (SKU) cannot be empty.");
      return;
    }
    if (!barcode.trim()) {
      alert("Validation Error: Barcode cannot be empty.");
      return;
    }
    if (!/^\d+$/.test(barcode.trim())) {
      alert("Validation Error: Barcode must contain only numbers.");
      return;
    }
    if (!name.trim()) {
      alert("Validation Error: Product Name cannot be empty.");
      return;
    }

    // Brand validation
    const cleanedBrand = brand.trim();
    if (cleanedBrand) {
      const brandRegex = /^[a-zA-Z0-9\s.\-&]+$/;
      if (!brandRegex.test(cleanedBrand) || !/[a-zA-Z]/.test(cleanedBrand)) {
        alert("Validation Error: Brand name must be valid (should contain letters, and no random symbols like brackets).");
        return;
      }
    }

    // Duplicate checks
    const cleanedSku = sku.trim().toUpperCase();
    const cleanedBarcode = barcode.trim();
    if ((products || []).some((p) => p.sku === cleanedSku)) {
      alert(`Validation Error: A product with code/SKU "${cleanedSku}" already exists in the catalog.`);
      return;
    }
    if ((products || []).some((p) => p.barcode === cleanedBarcode)) {
      alert(`Validation Error: A product with Barcode "${cleanedBarcode}" already exists in the catalog.`);
      return;
    }

    // Category validation
    const finalCategory = isCreatingCategory ? newCategory.trim() : category.trim();
    if (!finalCategory) {
      alert("Validation Error: Category cannot be empty. Please select or enter a valid category name.");
      return;
    }

    // Numbers validation
    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      alert("Validation Error: Weight must be a positive number greater than 0.");
      return;
    }

    const parsedLow = parseInt(lowStock);
    if (isNaN(parsedLow) || parsedLow < 0) {
      alert("Validation Error: Low Stock threshold cannot be negative.");
      return;
    }

    const parsedLimit = parseInt(totalProductLimit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      alert("Validation Error: Total Product Limit must be a positive number greater than 0.");
      return;
    }

    if (parsedLimit < parsedLow) {
      alert(`Validation Error: Total Product Limit (${parsedLimit}) cannot be lower than Low Stock threshold (${parsedLow}).`);
      return;
    }

    // Prices validation
    const pRetail = parseFloat(priceRetail);
    const pDist = parseFloat(priceDistributor);
    const pVip = parseFloat(priceVip);
    const pCust = parseFloat(priceCustom);

    if (isNaN(pRetail) || pRetail < 0 || isNaN(pDist) || pDist < 0 || isNaN(pVip) || pVip < 0 || isNaN(pCust) || pCust < 0) {
      alert("Validation Error: Price values cannot be negative or empty.");
      return;
    }

    // Quantities validation
    const qtyK = parseInt(stockKarachi);
    const qtyL = parseInt(stockLahore);

    if (isNaN(qtyK) || qtyK < 0 || isNaN(qtyL) || qtyL < 0) {
      alert("Validation Error: Initial stock quantities cannot be negative or empty.");
      return;
    }

    if (qtyK + qtyL > parsedLimit) {
      alert(`Validation Error: The sum of Karachi Depot (${qtyK}) and Lahore Terminal (${qtyL}) stocks is ${qtyK + qtyL}, which exceeds the Total Product Limit of ${parsedLimit}.`);
      return;
    }

    const newProdId = `p-${Date.now()}`;
    const newProduct = {
      product_id: newProdId,
      sku: cleanedSku,
      barcode: cleanedBarcode,
      product_name: name.trim(),
      short_description: desc.trim() || "No description provided.",
      brand: cleanedBrand || "Generic",
      category: finalCategory,
      unit,
      weight: parsedWeight,
      status: "ACTIVE",
      low_stock_threshold: parsedLow,
      overstock_threshold: parsedLimit, // Keep synchronized for compatibility
      total_product_limit: parsedLimit,
      dead_stock_days: 90,
      prices: {
        RETAIL: pRetail,
        DISTRIBUTOR: pDist,
        VIP: pVip,
        CUSTOM: pCust
      },
      image_url: imageUrl.trim() || "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop",
      inventory: [
        {
          warehouse_id: "wh-1",
          warehouse_name: "Karachi Central Depot",
          quantity: qtyK,
          reserved_quantity: 0,
          available_quantity: qtyK
        },
        {
          warehouse_id: "wh-2",
          warehouse_name: "Lahore North Terminal",
          quantity: qtyL,
          reserved_quantity: 0,
          available_quantity: qtyL
        }
      ]
    };
    addNewProduct(newProduct);
    onSuccess(name.trim());
    onClose();
    setSku("");
    setBarcode("");
    setName("");
    setBrand("");
    setDesc("");
    setCategory("Networking");
    setNewCategory("");
    setIsCreatingCategory(false);
    setStockKarachi("20");
    setStockLahore("15");
    setImageUrl("https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop");
  };
  return /* @__PURE__ */ jsx(Modal, { open, onClose, title: "Register New Product", children: /* @__PURE__ */ jsxs(
    "form",
    {
      onSubmit: handleSubmit,
      className: "flex flex-col gap-4 text-xs max-h-[80vh] overflow-y-auto pr-1",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Product Name *" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "input-field py-2 text-xs",
                placeholder: "e.g. Fiber Core Switch 24P",
                value: name,
                onChange: (e) => setName(e.target.value),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Brand Name" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "input-field py-2 text-xs",
                placeholder: "e.g. Cisco",
                value: brand,
                onChange: (e) => setBrand(e.target.value)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Product Code *" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "input-field py-2 text-xs",
                placeholder: "e.g. SW-24P-ENT",
                value: sku,
                onChange: (e) => setSku(e.target.value),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "UPC Barcode *" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "input-field py-2 text-xs",
                placeholder: "e.g. 884729112",
                value: barcode,
                onChange: (e) => setBarcode(e.target.value),
                required: true
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Category" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                className: "input-field py-2 text-xs",
                value: isCreatingCategory ? "__NEW__" : category,
                onChange: (e) => handleCategoryChange(e.target.value),
                children: [
                  allCategories.map((cat) => /* @__PURE__ */ jsx("option", { value: cat, children: cat }, cat)),
                  /* @__PURE__ */ jsx("option", { value: "__NEW__", children: "+ Add New Category" })
                ]
              }
            ),
            isCreatingCategory && /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "input-field py-1.5 text-xs mt-1.5",
                placeholder: "New Category Name",
                value: newCategory,
                onChange: (e) => {
                  setNewCategory(e.target.value);
                  setCategory(e.target.value);
                },
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Unit" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "input-field py-2 text-xs",
                value: unit,
                onChange: (e) => setUnit(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Weight (kg)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "input-field py-2 text-xs",
                value: weight,
                onChange: (e) => setWeight(e.target.value)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Product Image URL" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "url",
              className: "input-field py-2 text-xs",
              placeholder: "e.g. https://images.unsplash.com/photo-...",
              value: imageUrl,
              onChange: (e) => setImageUrl(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "Short Description" }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              rows: 2,
              className: "input-field py-2 text-xs",
              placeholder: "Brief description of hardware specifications...",
              value: desc,
              onChange: (e) => setDesc(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border-t border-[#F1F5F9] pt-3", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider mb-2", children: "Wholesale Price Tiers (Rs)" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-4 gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[9px] text-[#64748B] block mb-1", children: "Retail Rate" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-1.5 text-xs",
                  value: priceRetail,
                  onChange: (e) => setPriceRetail(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[9px] text-[#64748B] block mb-1", children: "Distributor" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-1.5 text-xs",
                  value: priceDistributor,
                  onChange: (e) => setPriceDistributor(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[9px] text-[#64748B] block mb-1", children: "VIP Rate" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-1.5 text-xs",
                  value: priceVip,
                  onChange: (e) => setPriceVip(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[9px] text-[#64748B] block mb-1", children: "Custom" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-1.5 text-xs",
                  value: priceCustom,
                  onChange: (e) => setPriceCustom(e.target.value)
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border-t border-[#F1F5F9] pt-3", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider mb-2", children: "Inventory Levels & Alerts" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-4 gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[9px] text-[#64748B] block mb-1", children: "Karachi Stock" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-1.5 text-xs",
                  value: stockKarachi,
                  onChange: (e) => setStockKarachi(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[9px] text-[#64748B] block mb-1", children: "Lahore Stock" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-1.5 text-xs",
                  value: stockLahore,
                  onChange: (e) => setStockLahore(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[9px] text-[#64748B] block mb-1", children: "Low Trigger" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-1.5 text-xs",
                  value: lowStock,
                  onChange: (e) => setLowStock(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[9px] text-[#64748B] block mb-1", children: "Total Limit" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-1.5 text-xs",
                  value: totalProductLimit,
                  onChange: (e) => setTotalProductLimit(e.target.value)
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            className: "w-full py-2.5 mt-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg transition-colors border-0 cursor-pointer",
            children: "Create Product"
          }
        )
      ]
    }
  ) });
}
