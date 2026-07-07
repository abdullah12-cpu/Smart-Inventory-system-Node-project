import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "@/lib/store";
import Modal from "@/components/Modal";
export default function AddSkuModal({ open, onClose, onSuccess }) {
  const { addNewProduct } = useStore();
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Networking");
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
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sku || !barcode || !name) return;
    const parsedWeight = parseFloat(weight) || 0;
    const parsedLow = parseInt(lowStock) || 0;
    const parsedLimit = parseInt(totalProductLimit) || 100;
    const pRetail = parseFloat(priceRetail) || 0;
    const pDist = parseFloat(priceDistributor) || 0;
    const pVip = parseFloat(priceVip) || 0;
    const pCust = parseFloat(priceCustom) || 0;
    const qtyK = parseInt(stockKarachi) || 0;
    const qtyL = parseInt(stockLahore) || 0;

    if (qtyK + qtyL > parsedLimit) {
      alert(`Validation Error: The sum of Karachi Depot (${qtyK}) and Lahore Terminal (${qtyL}) stocks is ${qtyK + qtyL}, which exceeds the Total Product Limit of ${parsedLimit}.`);
      return;
    }

    const newProdId = `p-${Date.now()}`;
    const newProduct = {
      product_id: newProdId,
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim(),
      product_name: name.trim(),
      short_description: desc.trim() || "No description provided.",
      brand: brand.trim() || "Generic",
      category,
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
    setStockKarachi("20");
    setStockLahore("15");
  };
  return /* @__PURE__ */ jsx(Modal, { open, onClose, title: "Register New SKU Catalog Item", children: /* @__PURE__ */ jsxs(
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
            /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-semibold block mb-1", children: "SKU Code *" }),
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
                value: category,
                onChange: (e) => setCategory(e.target.value),
                children: [
                  /* @__PURE__ */ jsx("option", { value: "Networking", children: "Networking" }),
                  /* @__PURE__ */ jsx("option", { value: "Compute Cards", children: "Compute Cards" }),
                  /* @__PURE__ */ jsx("option", { value: "Fiber Optics", children: "Fiber Optics" }),
                  /* @__PURE__ */ jsx("option", { value: "UPS & Power", children: "UPS & Power" })
                ]
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
            children: "Create SKU Catalog Item"
          }
        )
      ]
    }
  ) });
}
