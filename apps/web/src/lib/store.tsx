'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  Product, 
  Order, 
  Invoice, 
  Payment, 
  Supplier, 
  Notification, 
  User, 
  PortalType,
  StockMovement,
  AuditLog,
  PaymentMethod,
  INITIAL_PRODUCTS, 
  MOCK_USERS, 
  MOCK_ORDERS, 
  MOCK_INVOICES, 
  MOCK_PAYMENTS, 
  MOCK_SUPPLIERS, 
  INITIAL_NOTIFICATIONS,
  MOCK_STOCK_MOVEMENTS,
  MOCK_AUDIT_LOGS,
  computeStockAlertStatus
} from '@/lib/data';

interface StoreCtx {
  portal: PortalType;
  setPortal: (p: PortalType) => void;
  currentUser: User;
  setCurrentUser: (u: User) => void;
  products: Product[];
  orders: Order[];
  invoices: Invoice[];
  payments: Payment[];
  suppliers: Supplier[];
  notifications: Notification[];
  stockMovements: StockMovement[];
  auditLogs: AuditLog[];
  
  adjustWarehouseStock: (productId: string, warehouseId: string, deltaQty: number, notes?: string) => void;
  updateProductAlertRules: (productId: string, low: number, over: number) => void;
  recordPaymentAllocation: (invoiceId: string, amount: number, method: PaymentMethod, reference: string) => void;
  dispatchOrder: (orderId: string) => void;
  markNotificationRead: (id: string) => void;
  addNotification: (n: Omit<Notification, 'notification_id' | 'created_at' | 'is_read'>) => void;
  addNewProduct: (product: Product) => void;
  addSupplier: (s: Omit<Supplier, 'supplier_id'>) => void;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (supplierId: string) => void;
  
  // Buyer cart
  cart: { product: Product; qty: number }[];
  addToCart: (productId: string) => void;
  updateCartQty: (productId: string, dir: number) => void;
  clearCart: () => void;
}

const StoreContext = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [portal, setPortal] = useState<PortalType>('admin');
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS.admin);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(MOCK_STOCK_MOVEMENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);

  // Adjust stock in a specific warehouse and append movements & audit logs
  const adjustWarehouseStock = useCallback((productId: string, warehouseId: string, deltaQty: number, notes = 'Manual inventory audit adjustment.') => {
    let affectedProdName = '';
    let affectedWhName = '';
    let newQtyResult = 0;

    setProducts(prev => prev.map(p => {
      if (p.product_id !== productId) return p;
      affectedProdName = p.product_name;

      const updatedInv = p.inventory.map(inv => {
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

      // Check if total available quantity triggers low stock alerts
      const totalAvail = updatedInv.reduce((sum, i) => sum + i.available_quantity, 0);
      if (totalAvail <= p.low_stock_threshold) {
        // Trigger alert in notifications
        const notifMsg = `${p.product_name} available quantity is now ${totalAvail} units (below safety limit of ${p.low_stock_threshold}).`;
        setTimeout(() => {
          addNotification({
            title: 'Critical Low Stock Threshold Breach',
            message: notifMsg,
            severity: 'WARNING',
            trigger_type: 'LOW_STOCK'
          });
        }, 100);
      }

      return { ...p, inventory: updatedInv };
    }));

    // Record stock movement row
    const newMovement: StockMovement = {
      movement_id: `mv-${Date.now()}`,
      product_id: productId,
      product_name: affectedProdName || 'Unknown SKU',
      warehouse_id: warehouseId,
      warehouse_name: affectedWhName || 'Unknown Warehouse',
      movement_type: deltaQty > 0 ? 'IN' : 'OUT',
      quantity: deltaQty,
      notes: notes,
      performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
      created_at: new Date().toISOString()
    };
    setStockMovements(prev => [newMovement, ...prev]);

    // Record audit log entry
    const newAudit: AuditLog = {
      audit_id: `aud-${Date.now()}`,
      table_name: 'inventory',
      record_id: productId,
      action: 'UPDATE',
      performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
      notes: `Adjusted quantity of ${affectedProdName} at ${affectedWhName} by ${deltaQty > 0 ? '+' : ''}${deltaQty} (New qty: ${newQtyResult} units).`,
      created_at: new Date().toISOString()
    };
    setAuditLogs(prev => [newAudit, ...prev]);
  }, [currentUser]);

  // Update low-stock and overstock alert parameters for a product
  const updateProductAlertRules = useCallback((productId: string, low: number, over: number) => {
    let affectedProdName = '';
    setProducts(prev => prev.map(p => {
      if (p.product_id !== productId) return p;
      affectedProdName = p.product_name;
      return {
        ...p,
        low_stock_threshold: low,
        overstock_threshold: over
      };
    }));

    // Record audit log entry
    const newAudit: AuditLog = {
      audit_id: `aud-${Date.now()}`,
      table_name: 'stock_alert_rules',
      record_id: productId,
      action: 'UPDATE',
      performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
      notes: `Updated safety alert parameters for ${affectedProdName}: Low-stock threshold = ${low} units, Overstock threshold = ${over} units.`,
      created_at: new Date().toISOString()
    };
    setAuditLogs(prev => [newAudit, ...prev]);
  }, [currentUser]);

  // Record a payment and allocate it to a specific invoice
  const recordPaymentAllocation = useCallback((invoiceId: string, amount: number, method: PaymentMethod, reference: string) => {
    let customerName = 'B2B Client';
    let invoiceNo = '';

    setInvoices(prev => prev.map(inv => {
      if (inv.invoice_id !== invoiceId) return inv;
      invoiceNo = inv.invoice_number;
      const updatedPaid = Math.min(inv.total_amount, inv.amount_paid + amount);
      let newStatus = inv.status;
      if (updatedPaid >= inv.total_amount) {
        newStatus = 'PAID';
      } else if (updatedPaid > 0) {
        newStatus = 'PARTIALLY_PAID';
      }
      return {
        ...inv,
        amount_paid: updatedPaid,
        status: newStatus
      };
    }));

    // Add payment entry
    const newPayment: Payment = {
      payment_id: `pay-${Date.now()}`,
      customer_name: customerName,
      amount: amount,
      payment_method: method,
      reference_no: reference,
      payment_date: new Date().toISOString(),
      status: 'RECORDED'
    };
    setPayments(prev => [newPayment, ...prev]);

    // Record audit log
    const newAudit: AuditLog = {
      audit_id: `aud-${Date.now()}`,
      table_name: 'payments',
      record_id: invoiceId,
      action: 'CREATE',
      performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
      notes: `Allocated payment of ${amount} via ${method} (Ref: ${reference}) to invoice ${invoiceNo}.`,
      created_at: new Date().toISOString()
    };
    setAuditLogs(prev => [newAudit, ...prev]);
  }, [currentUser]);

  // Dispatch an order
  const dispatchOrder = useCallback((orderId: string) => {
    let orderNum = '';
    setOrders(prev => prev.map(o => {
      if (o.order_id !== orderId) return o;
      orderNum = o.order_number;
      return { ...o, status: 'SHIPPED' };
    }));

    // Record audit log
    const newAudit: AuditLog = {
      audit_id: `aud-${Date.now()}`,
      table_name: 'orders',
      record_id: orderId,
      action: 'UPDATE',
      performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
      notes: `Updated status of order ${orderNum} to SHIPPED (cargo dispatched).`,
      created_at: new Date().toISOString()
    };
    setAuditLogs(prev => [newAudit, ...prev]);
  }, [currentUser]);

  // Mark notification read
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
  }, []);

  // Add notification
  const addNotification = useCallback((n: Omit<Notification, 'notification_id' | 'created_at' | 'is_read'>) => {
    const newNotif: Notification = {
      ...n,
      notification_id: `n-${Date.now()}`,
      is_read: false,
      created_at: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  // Cart operations
  const addToCart = useCallback((productId: string) => {
    const product = products.find(p => p.product_id === productId);
    if (!product || product.status !== 'ACTIVE') return;
    
    const totalAvail = product.inventory.reduce((sum, i) => sum + i.available_quantity, 0);
    if (totalAvail === 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.product.product_id === productId);
      if (existing) {
        return prev.map(item => item.product.product_id === productId 
          ? { ...item, qty: Math.min(item.qty + 1, totalAvail) } 
          : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }, [products]);

  const updateCartQty = useCallback((productId: string, dir: number) => {
    setCart(prev => {
      const updated = prev.map(item => item.product.product_id === productId 
        ? { ...item, qty: item.qty + dir } 
        : item
      );
      return updated.filter(item => item.qty > 0);
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const addNewProduct = useCallback((newProd: Product) => {
    setProducts(prev => [...prev, newProd]);

    // Record audit log entry
    const newAudit: AuditLog = {
      audit_id: `aud-${Date.now()}`,
      table_name: 'products',
      record_id: newProd.product_id,
      action: 'CREATE',
      performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
      notes: `Registered new SKU catalog item: ${newProd.product_name} (${newProd.sku}). Barcode: ${newProd.barcode}.`,
      created_at: new Date().toISOString()
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    // Record stock movements for initial stock quantities if any
    newProd.inventory.forEach(inv => {
      if (inv.quantity > 0) {
        const newMovement: StockMovement = {
          movement_id: `mv-${Date.now()}-${inv.warehouse_id}`,
          product_id: newProd.product_id,
          product_name: newProd.product_name,
          warehouse_id: inv.warehouse_id,
          warehouse_name: inv.warehouse_name,
          movement_type: 'IN',
          quantity: inv.quantity,
          notes: 'Initial inventory quantity load.',
          performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
          created_at: new Date().toISOString()
        };
        setStockMovements(prev => [newMovement, ...prev]);
      }
    });

    // Notify low stock if initial available quantity is low
    const totalAvail = newProd.inventory.reduce((sum, i) => sum + i.available_quantity, 0);
    if (totalAvail <= newProd.low_stock_threshold) {
      addNotification({
        title: 'Initial Low Stock Warning',
        message: `New product ${newProd.product_name} registered with stock ${totalAvail} (under safety threshold of ${newProd.low_stock_threshold}).`,
        severity: 'WARNING',
        trigger_type: 'LOW_STOCK'
      });
    }
  }, [currentUser, addNotification]);

  const addSupplier = useCallback((s: Omit<Supplier, 'supplier_id'>) => {
    const newId = `sup-${Date.now()}`;
    const newSup: Supplier = { ...s, supplier_id: newId };
    setSuppliers(prev => [...prev, newSup]);
    setAuditLogs(prev => [{
      audit_id: `aud-${Date.now()}`,
      table_name: 'suppliers',
      record_id: newId,
      action: 'CREATE',
      performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
      notes: `Onboarded new supplier: ${s.company_name} (${s.city}, ${s.country}). Lead time: ${s.lead_time_days} days.`,
      created_at: new Date().toISOString()
    }, ...prev]);
  }, [currentUser]);

  const updateSupplier = useCallback((s: Supplier) => {
    setSuppliers(prev => prev.map(sup => sup.supplier_id === s.supplier_id ? s : sup));
    setAuditLogs(prev => [{
      audit_id: `aud-${Date.now()}`,
      table_name: 'suppliers',
      record_id: s.supplier_id,
      action: 'UPDATE',
      performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
      notes: `Updated supplier profile: ${s.company_name}. Lead time: ${s.lead_time_days} days, Reliability: ${s.reliability_score}%.`,
      created_at: new Date().toISOString()
    }, ...prev]);
  }, [currentUser]);

  const deleteSupplier = useCallback((supplierId: string) => {
    setSuppliers(prev => {
      const found = prev.find(s => s.supplier_id === supplierId);
      setAuditLogs(logs => [{
        audit_id: `aud-${Date.now()}`,
        table_name: 'suppliers',
        record_id: supplierId,
        action: 'DELETE',
        performed_by: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role_name})`,
        notes: `Removed supplier record: ${found?.company_name ?? supplierId} from vendor directory.`,
        created_at: new Date().toISOString()
      }, ...logs]);
      return prev.filter(s => s.supplier_id !== supplierId);
    });
  }, [currentUser]);

  return (
    <StoreContext.Provider value={{
      portal, setPortal, currentUser, setCurrentUser,
      products, orders, invoices, payments, suppliers, notifications,
      stockMovements, auditLogs,
      adjustWarehouseStock, updateProductAlertRules, recordPaymentAllocation,
      dispatchOrder, markNotificationRead, addNotification, addNewProduct,
      addSupplier, updateSupplier, deleteSupplier,
      cart, addToCart, updateCartQty, clearCart
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
