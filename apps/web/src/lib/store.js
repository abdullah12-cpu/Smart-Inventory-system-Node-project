import { jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  INITIAL_PRODUCTS,
  MOCK_USERS,
  MOCK_ORDERS,
  MOCK_INVOICES,
  MOCK_PAYMENTS,
  MOCK_SUPPLIERS,
  INITIAL_NOTIFICATIONS,
  MOCK_STOCK_MOVEMENTS,
  MOCK_AUDIT_LOGS
} from "@/lib/data";
const StoreContext = createContext(null);
const GUEST_USER = {
  user_id: "guest",
  first_name: "Guest",
  last_name: "User",
  email: "guest@commerceiq.com",
  role_name: "Guest",
  profile_image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&fit=crop"
};
export function StoreProvider({ children }) {
  const [portal, setPortal] = useState("admin");
  const [currentUser, setCurrentUser] = useState(GUEST_USER);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [cart, setCart] = useState([]);
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const prodRes = await fetch("/api/products");
        if (prodRes.ok) setProducts(await prodRes.json());

        const ordersRes = await fetch("/api/orders");
        if (ordersRes.ok) setOrders(await ordersRes.json());

        const quotesRes = await fetch("/api/quotations");
        if (quotesRes.ok) setQuotations(await quotesRes.json());

        const suppliersRes = await fetch("/api/suppliers");
        if (suppliersRes.ok) setSuppliers(await suppliersRes.json());

        const invoicesRes = await fetch("/api/invoices");
        if (invoicesRes.ok) setInvoices(await invoicesRes.json());

        const paymentsRes = await fetch("/api/payments");
        if (paymentsRes.ok) setPayments(await paymentsRes.json());

        const movementsRes = await fetch("/api/stock-movements");
        if (movementsRes.ok) setStockMovements(await movementsRes.json());

        const logsRes = await fetch("/api/audit-logs");
        if (logsRes.ok) setAuditLogs(await logsRes.json());
      } catch (err) {
        console.error("Error fetching data from database:", err);
      }
    };
    fetchAllData();
  }, []);
  const markNotificationRead = useCallback((id) => {
    setNotifications(
      (prev) => prev.map((n) => n.notification_id === id ? { ...n, is_read: true } : n)
    );
  }, []);
  const addNotification = useCallback((n) => {
    const newNotif = {
      ...n,
      notification_id: `n-${Date.now()}`,
      is_read: false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);
  const adjustWarehouseStock = useCallback(
    async (productId, warehouseId, deltaQty, notes = "Manual inventory audit adjustment.") => {
      let affectedProdName = "";
      let affectedWhName = "";
      let newQtyResult = 0;
      let targetProduct = null;

      const updatedProducts = products.map((p) => {
        if (p.product_id !== productId) return p;
        affectedProdName = p.product_name;
        const updatedInv = p.inventory.map((inv) => {
          if (inv.warehouse_id !== warehouseId) return inv;
          affectedWhName = inv.warehouse_name;
          const newQty = Math.max(0, inv.quantity + deltaQty);
          newQtyResult = newQty;
          const newAvail = Math.max(0, newQty - inv.reserved_quantity);
          return {
            ...inv,
            quantity: newQty,
            available_quantity: newAvail
          };
        });
        const totalAvail = updatedInv.reduce(
          (sum, i) => sum + i.available_quantity,
          0
        );
        if (totalAvail <= p.low_stock_threshold) {
          const notifMsg = `${p.product_name} available quantity is now ${totalAvail} units (below safety limit of ${p.low_stock_threshold}).`;
          setTimeout(() => {
            addNotification({
              title: "Critical Low Stock Threshold Breach",
              message: notifMsg,
              severity: "WARNING",
              trigger_type: "LOW_STOCK"
            });
          }, 100);
        }
        targetProduct = { ...p, inventory: updatedInv };
        return targetProduct;
      });

      if (!targetProduct) return;

      try {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetProduct)
        });
        setProducts(updatedProducts);

        const newMovement = {
          movement_id: `mv-${Date.now()}`,
          product_id: productId,
          product_name: affectedProdName || "Unknown SKU",
          warehouse_id: warehouseId,
          warehouse_name: affectedWhName || "Unknown Warehouse",
          movement_type: deltaQty > 0 ? "IN" : "OUT",
          quantity: deltaQty,
          notes,
          performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
          created_at: new Date().toISOString()
        };
        await fetch("/api/stock-movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMovement)
        });
        setStockMovements((prev) => [newMovement, ...prev]);

        const newAudit = {
          audit_id: `aud-${Date.now()}`,
          table_name: "inventory",
          record_id: productId,
          action: "UPDATE",
          performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
          notes: `Adjusted quantity of ${affectedProdName} at ${affectedWhName} by ${deltaQty > 0 ? "+" : ""}${deltaQty} (New qty: ${newQtyResult} units).`,
          created_at: new Date().toISOString()
        };
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAudit)
        });
        setAuditLogs((prev) => [newAudit, ...prev]);
      } catch (err) {
        console.error("Error adjusting stock:", err);
      }
    },
    [products, currentUser, addNotification]
  );
  const updateProductAlertRules = useCallback(
    async (productId, low, over) => {
      let affectedProdName = "";
      let targetProduct = null;
      const updatedProducts = products.map((p) => {
        if (p.product_id !== productId) return p;
        affectedProdName = p.product_name;
        targetProduct = {
          ...p,
          low_stock_threshold: low,
          overstock_threshold: over
        };
        return targetProduct;
      });

      if (!targetProduct) return;

      try {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetProduct)
        });
        setProducts(updatedProducts);

        const newAudit = {
          audit_id: `aud-${Date.now()}`,
          table_name: "stock_alert_rules",
          record_id: productId,
          action: "UPDATE",
          performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
          notes: `Updated safety alert parameters for ${affectedProdName}: Low-stock threshold = ${low} units, Overstock threshold = ${over} units.`,
          created_at: new Date().toISOString()
        };
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAudit)
        });
        setAuditLogs((prev) => [newAudit, ...prev]);
      } catch (err) {
        console.error("Error updating rules:", err);
      }
    },
    [products, currentUser]
  );
  const recordPaymentAllocation = useCallback(
    async (invoiceId, amount, method, reference) => {
      let customerName = "B2B Client";
      let invoiceNo = "";
      let targetInvoice = null;

      const updatedInvoices = invoices.map((inv) => {
        if (inv.invoice_id !== invoiceId) return inv;
        invoiceNo = inv.invoice_number;
        const updatedPaid = Math.min(
          inv.total_amount,
          inv.amount_paid + amount
        );
        let newStatus = inv.status;
        if (updatedPaid >= inv.total_amount) {
          newStatus = "PAID";
        } else if (updatedPaid > 0) {
          newStatus = "PARTIALLY_PAID";
        }
        targetInvoice = {
          ...inv,
          amount_paid: updatedPaid,
          status: newStatus
        };
        return targetInvoice;
      });

      if (!targetInvoice) return;

      try {
        await fetch(`/api/invoices/${invoiceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount_paid: targetInvoice.amount_paid, status: targetInvoice.status })
        });
        setInvoices(updatedInvoices);

        const newPayment = {
          payment_id: `pay-${Date.now()}`,
          customer_name: customerName,
          amount,
          payment_method: method,
          reference_no: reference,
          payment_date: new Date().toISOString(),
          status: "RECORDED"
        };
        await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPayment)
        });
        setPayments((prev) => [newPayment, ...prev]);

        const newAudit = {
          audit_id: `aud-${Date.now()}`,
          table_name: "payments",
          record_id: invoiceId,
          action: "CREATE",
          performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
          notes: `Allocated payment of ${amount} via ${method} (Ref: ${reference}) to invoice ${invoiceNo}.`,
          created_at: new Date().toISOString()
        };
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAudit)
        });
        setAuditLogs((prev) => [newAudit, ...prev]);
      } catch (err) {
        console.error("Error recording payment:", err);
      }
    },
    [invoices, currentUser]
  );
  const dispatchOrder = useCallback(
    async (orderId) => {
      let orderNum = "";
      const updatedOrders = orders.map((o) => {
        if (o.order_id !== orderId) return o;
        orderNum = o.order_number;
        return { ...o, status: "SHIPPED" };
      });

      try {
        await fetch(`/api/orders/${orderId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SHIPPED" })
        });
        setOrders(updatedOrders);

        const matchingOrder = orders.find(o => o.order_id === orderId);
        if (matchingOrder) {
          const newInvoice = {
            invoice_id: `inv-${Date.now()}`,
            invoice_number: `INV-2026-${matchingOrder.order_number.split("-")[2]}`,
            status: "SENT",
            total_amount: matchingOrder.total_amount,
            amount_paid: 0,
            due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
            late_payment_probability: 0.15
          };
          await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newInvoice)
          });
          
          const resInv = await fetch("/api/invoices");
          if (resInv.ok) setInvoices(await resInv.json());
        }

        const newAudit = {
          audit_id: `aud-${Date.now()}`,
          table_name: "orders",
          record_id: orderId,
          action: "UPDATE",
          performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
          notes: `Updated status of order ${orderNum} to SHIPPED (cargo dispatched).`,
          created_at: new Date().toISOString()
        };
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAudit)
        });
        setAuditLogs((prev) => [newAudit, ...prev]);
      } catch (err) {
        console.error("Error dispatching order:", err);
      }
    },
    [orders, currentUser]
  );
  const approveOrder = useCallback(
    async (orderId) => {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED" })
        });
        if (response.ok) {
          const res = await fetch("/api/orders");
          if (res.ok) setOrders(await res.json());

          const matched = orders.find(o => o.order_id === orderId);
          const orderNum = matched ? matched.order_number : orderId;

          const newAudit = {
            audit_id: `aud-${Date.now()}`,
            table_name: "orders",
            record_id: orderId,
            action: "UPDATE",
            performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
            notes: `Approved order request: ${orderNum} (status updated to CONFIRMED).`,
            created_at: new Date().toISOString()
          };
          await fetch("/api/audit-logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAudit)
          });
          setAuditLogs((prev) => [newAudit, ...prev]);

          addNotification({
            title: "Purchase Order Approved",
            message: `Order ${orderNum} has been officially approved.`,
            severity: "SUCCESS",
            trigger_type: "ORDER_APPROVED"
          });
          return true;
        }
      } catch (err) {
        console.error("Error approving order:", err);
      }
      return false;
    },
    [orders, currentUser, addNotification]
  );
  const submitQuotationRequest = useCallback(
    async (quoteData) => {
      try {
        const response = await fetch("/api/quotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(quoteData)
        });
        if (response.ok) {
          const res = await fetch("/api/quotations");
          if (res.ok) setQuotations(await res.json());

          const newAudit = {
            audit_id: `aud-${Date.now()}`,
            table_name: "quotations",
            record_id: quoteData.quotation_id,
            action: "CREATE",
            performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
            notes: `Submitted quote request: ${quoteData.quotation_number} (Rs ${quoteData.total_amount.toLocaleString()}).`,
            created_at: new Date().toISOString()
          };
          await fetch("/api/audit-logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAudit)
          });
          setAuditLogs((prev) => [newAudit, ...prev]);

          return true;
        }
      } catch (err) {
        console.error("Error submitting quotation request:", err);
      }
      return false;
    },
    [currentUser]
  );
  const updateQuotationStatus = useCallback(
    async (quoteId, status, totalAmount = undefined) => {
      try {
        const body = { status };
        if (totalAmount !== undefined) {
          body.total_amount = totalAmount;
        }

        const response = await fetch(`/api/quotations/${quoteId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (response.ok) {
          const res = await fetch("/api/quotations");
          if (res.ok) setQuotations(await res.json());

          const matched = quotations.find(q => q.quotation_id === quoteId);
          const quoteNo = matched ? matched.quotation_number : quoteId;

          // Create audit log
          const newAudit = {
            audit_id: `aud-${Date.now()}`,
            table_name: "quotations",
            record_id: quoteId,
            action: "UPDATE",
            performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
            notes: `Updated quotation status for ${quoteNo} to ${status}${totalAmount !== undefined ? ` (Counter proposed: Rs ${totalAmount.toLocaleString()})` : ""}.`,
            created_at: new Date().toISOString()
          };
          await fetch("/api/audit-logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAudit)
          });
          setAuditLogs((prev) => [newAudit, ...prev]);

          return true;
        }
      } catch (err) {
        console.error("Error updating quotation status:", err);
      }
      return false;
    },
    [quotations, currentUser]
  );
  const addToCart = useCallback(
    (productId) => {
      const product = products.find((p) => p.product_id === productId);
      if (!product || product.status !== "ACTIVE") return;
      const totalAvail = product.inventory.reduce(
        (sum, i) => sum + i.available_quantity,
        0
      );
      if (totalAvail === 0) return;
      setCart((prev) => {
        const existing = prev.find(
          (item) => item.product.product_id === productId
        );
        if (existing) {
          return prev.map(
            (item) => item.product.product_id === productId ? { ...item, qty: Math.min(item.qty + 1, totalAvail) } : item
          );
        }
        return [...prev, { product, qty: 1 }];
      });
    },
    [products]
  );
  const updateCartQty = useCallback((productId, dir) => {
    setCart((prev) => {
      const updated = prev.map(
        (item) => item.product.product_id === productId ? { ...item, qty: item.qty + dir } : item
      );
      return updated.filter((item) => item.qty > 0);
    });
  }, []);
  const clearCart = useCallback(() => setCart([]), []);
  const addNewProduct = useCallback(
    async (newProd) => {
      try {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newProd),
        });
        if (!response.ok) {
          console.error("Failed to persist product to database");
        }
      } catch (err) {
        console.error("Error creating product:", err);
      }

      setProducts((prev) => [...prev, newProd]);
      const newAudit = {
        audit_id: `aud-${Date.now()}`,
        table_name: "products",
        record_id: newProd.product_id,
        action: "CREATE",
        performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
        notes: `Registered new SKU catalog item: ${newProd.product_name} (${newProd.sku}). Barcode: ${newProd.barcode}.`,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      setAuditLogs((prev) => [newAudit, ...prev]);
      newProd.inventory.forEach((inv) => {
        if (inv.quantity > 0) {
          const newMovement = {
            movement_id: `mv-${Date.now()}-${inv.warehouse_id}`,
            product_id: newProd.product_id,
            product_name: newProd.product_name,
            warehouse_id: inv.warehouse_id,
            warehouse_name: inv.warehouse_name,
            movement_type: "IN",
            quantity: inv.quantity,
            notes: "Initial inventory quantity load.",
            performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          setStockMovements((prev) => [newMovement, ...prev]);
        }
      });
      const totalAvail = newProd.inventory.reduce(
        (sum, i) => sum + i.available_quantity,
        0
      );
      if (totalAvail <= newProd.low_stock_threshold) {
        addNotification({
          title: "Initial Low Stock Warning",
          message: `New product ${newProd.product_name} registered with stock ${totalAvail} (under safety threshold of ${newProd.low_stock_threshold}).`,
          severity: "WARNING",
          trigger_type: "LOW_STOCK"
        });
      }
    },
    [currentUser, addNotification]
  );
  const placeOrder = useCallback(
    async (orderData) => {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });
        if (response.ok) {
          const newOrder = await response.json();
          setOrders((prev) => [newOrder, ...prev]);

          // Update inventory reservations for ordered items
          const updatedProducts = products.map((prod) => {
            const orderItem = orderData.items.find(item => item.product_id === prod.product_id);
            if (!orderItem) return prod;

            const updatedInv = prod.inventory.map((inv, idx) => {
              if (idx === 0) { // Reserve from primary warehouse
                const resQty = inv.reserved_quantity + orderItem.qty;
                const availQty = Math.max(0, inv.quantity - resQty);
                return {
                  ...inv,
                  reserved_quantity: resQty,
                  available_quantity: availQty
                };
              }
              return inv;
            });

            const totalAvail = updatedInv.reduce((sum, i) => sum + i.available_quantity, 0);
            if (totalAvail <= prod.low_stock_threshold) {
              const notifMsg = `Low Stock Alert: ${prod.product_name} available stock has dropped to ${totalAvail} units (safety limit is ${prod.low_stock_threshold}) after order ${orderData.order_number}.`;
              setTimeout(() => {
                addNotification({
                  title: "Critical Low Stock Threshold Breach",
                  message: notifMsg,
                  severity: "WARNING",
                  trigger_type: "LOW_STOCK"
                });
              }, 100);
            }

            const updatedProd = {
              ...prod,
              inventory: updatedInv
            };

            // Post updated product back to API to persist in PG database
            fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedProd)
            }).catch(e => console.error("Error updating product inventory on order placement:", e));

            return updatedProd;
          });

          setProducts(updatedProducts);

          const quotesRes = await fetch("/api/quotations");
          if (quotesRes.ok) setQuotations(await quotesRes.json());

          addNotification({
            title: "New B2B Order Received",
            message: `Order ${orderData.order_number} has been submitted by buyer ${orderData.customer_email}.`,
            severity: "INFO",
            trigger_type: "ORDER_PLACED"
          });
          return true;
        }
      } catch (err) {
        console.error("Error placing order:", err);
      }
      return false;
    },
    [addNotification, products]
  );
  const addSupplier = useCallback(
    async (s) => {
      const newId = `sup-${Date.now()}`;
      const newSup = { ...s, supplier_id: newId };
      try {
        await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSup)
        });
        setSuppliers((prev) => [...prev, newSup]);

        const newAudit = {
          audit_id: `aud-${Date.now()}`,
          table_name: "suppliers",
          record_id: newId,
          action: "CREATE",
          performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
          notes: `Onboarded new supplier: ${s.company_name} (${s.city}, ${s.country}). Lead time: ${s.lead_time_days} days.`,
          created_at: new Date().toISOString()
        };
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAudit)
        });
        setAuditLogs((prev) => [newAudit, ...prev]);
      } catch (err) {
        console.error("Error adding supplier:", err);
      }
    },
    [currentUser]
  );
  const updateSupplier = useCallback(
    async (s) => {
      try {
        await fetch(`/api/suppliers/${s.supplier_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s)
        });
        setSuppliers((prev) => prev.map((sup) => sup.supplier_id === s.supplier_id ? s : sup));

        const newAudit = {
          audit_id: `aud-${Date.now()}`,
          table_name: "suppliers",
          record_id: s.supplier_id,
          action: "UPDATE",
          performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
          notes: `Updated supplier profile: ${s.company_name}. Lead time: ${s.lead_time_days} days, Reliability: ${s.reliability_score}%.`,
          created_at: new Date().toISOString()
        };
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAudit)
        });
        setAuditLogs((prev) => [newAudit, ...prev]);
      } catch (err) {
        console.error("Error updating supplier:", err);
      }
    },
    [currentUser]
  );
  const deleteSupplier = useCallback(
    async (supplierId) => {
      const found = suppliers.find((s) => s.supplier_id === supplierId);
      try {
        await fetch(`/api/suppliers/${supplierId}`, {
          method: "DELETE"
        });
        setSuppliers((prev) => prev.filter((s) => s.supplier_id !== supplierId));

        const newAudit = {
          audit_id: `aud-${Date.now()}`,
          table_name: "suppliers",
          record_id: supplierId,
          action: "DELETE",
          performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
          notes: `Removed supplier record: ${found?.company_name ?? supplierId} from vendor directory.`,
          created_at: new Date().toISOString()
        };
        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAudit)
        });
        setAuditLogs((prev) => [newAudit, ...prev]);
      } catch (err) {
        console.error("Error deleting supplier:", err);
      }
    },
    [suppliers, currentUser]
  );
  return /* @__PURE__ */ jsx(
    StoreContext.Provider,
    {
      value: {
        portal,
        setPortal,
        currentUser,
        setCurrentUser,
        products,
        orders,
        invoices,
        payments,
        suppliers,
        notifications,
        stockMovements,
        auditLogs,
        adjustWarehouseStock,
        updateProductAlertRules,
        recordPaymentAllocation,
        dispatchOrder,
        markNotificationRead,
        addNotification,
        addNewProduct,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        cart,
        addToCart,
        updateCartQty,
        clearCart,
        placeOrder,
        quotations,
        setQuotations,
        setOrders,
        approveOrder,
        submitQuotationRequest,
        updateQuotationStatus
      },
      children
    }
  );
}
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
