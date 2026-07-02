'use client';
import { useState, useEffect } from 'react';
import { Plus, DollarSign, Clock, ShieldAlert, BarChart3, CheckCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { computeStockAlertStatus, formatCurrency } from '@/lib/data';
import { KpiCard, StockAlertBadge, ProductStatusBadge } from '@/components/ui';
import ProductDrawer from './ProductDrawer';
import AddSkuModal from './AddSkuModal';

const ALIGN_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All SKUs' },
  { id: 'LOW_STOCK', label: 'Low Stock' },
  { id: 'OVERSTOCK', label: 'Overstock' },
  { id: 'NORMAL', label: 'Normal' },
];

export default function AdminDashboard({ search }: { search: string }) {
  const { products } = useStore();
  const [tab, setTab] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addSkuOpen, setAddSkuOpen] = useState(false);
  const [toast, setToast] = useState('');
  
  // Track recently updated row IDs to flash them
  const [flashingIds, setFlashingIds] = useState<Record<string, boolean>>({});
  const [prevStock, setPrevStock] = useState<Record<string, number>>({});
  
  // Simulated loading state for tab/search changes
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [tab, search, warehouseFilter, categoryFilter]);

  // Extract unique categories
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Trigger row flash when quantity changes
  useEffect(() => {
    const newFlashing: Record<string, boolean> = {};
    let hasChanges = false;
    
    products.forEach(p => {
      const totalQty = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const prev = prevStock[p.product_id];
      if (prev !== undefined && prev !== totalQty) {
        newFlashing[p.product_id] = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setFlashingIds(prev => ({ ...prev, ...newFlashing }));
      
      // Clear flash after 500ms
      const timer = setTimeout(() => {
        setFlashingIds({});
      }, 500);
      
      // Update local storage
      const newStockMap: Record<string, number> = {};
      products.forEach(p => {
        newStockMap[p.product_id] = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      });
      setPrevStock(newStockMap);
      
      return () => clearTimeout(timer);
    } else if (Object.keys(prevStock).length === 0 && products.length > 0) {
      // Initialize map
      const initMap: Record<string, number> = {};
      products.forEach(p => {
        initMap[p.product_id] = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      });
      setPrevStock(initMap);
    }
  }, [products, prevStock]);

  // KPI calculations based on current schema specifications
  const totalValuation = products.reduce((acc, p) => {
    const totalQty = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    return acc + (totalQty * p.prices.RETAIL);
  }, 0);
  
  const lowStockCount = products.filter(p => {
    const totalAvail = p.inventory.reduce((sum, inv) => sum + inv.available_quantity, 0);
    return totalAvail <= p.low_stock_threshold;
  }).length;

  const stockoutRate = Math.round(
    (products.filter(p => p.inventory.reduce((sum, inv) => sum + inv.quantity, 0) === 0).length / products.length) * 100
  );

  // Filtered products list
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.product_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    
    const totalAvail = p.inventory.reduce((sum, inv) => sum + inv.available_quantity, 0);
    const alertStatus = computeStockAlertStatus(totalAvail, p.low_stock_threshold, p.overstock_threshold);
    
    const matchTab = tab === 'all' || tab === alertStatus;
    
    // Warehouse Filter
    let matchWarehouse = true;
    if (warehouseFilter !== 'all') {
      const invItem = p.inventory.find(i => i.warehouse_name === warehouseFilter);
      matchWarehouse = invItem ? invItem.quantity > 0 : false;
    }

    // Category Filter
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;

    return matchSearch && matchTab && matchWarehouse && matchCategory;
  });

  const selectedProduct = selectedId != null ? products.find(p => p.product_id === selectedId) : null;

  return (
    <div className="page-container relative">
      {/* Success Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#ECFDF5] border border-[#10B981]/30 px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 z-[9999] text-xs font-bold text-[#059669] animate-fade-up">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Inventory Operations Center
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time tracking of multi-warehouse availability, supply chain alert signals, and price tiers.
          </p>
        </div>
        <button 
          onClick={() => setAddSkuOpen(true)}
          className="flex items-center gap-2 bg-[#4F46E5] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#4338CA] transition-colors shadow-sm cursor-pointer border-0"
        >
          <Plus size={16} /> Add SKU
        </button>
      </div>

      {/* KPI Row (Using exact metric names from kpi_snapshots table) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col gap-4 animate-fade-up">
              <div className="flex justify-between items-center">
                <div className="w-24 h-4 rounded shimmer-skeleton" />
                <div className="w-10 h-10 rounded-lg shimmer-skeleton" />
              </div>
              <div className="w-32 h-8 rounded shimmer-skeleton" />
              <div className="w-28 h-3 rounded shimmer-skeleton" />
            </div>
          ))
        ) : (
          <>
            <KpiCard
              label="GMV (Global Valuation)"
              value={formatCurrency(totalValuation)}
              trend="↑ +14.2% versus last snapshot"
              trendUp
              icon={<DollarSign size={18} />}
              index={0}
            />
            <KpiCard
              label="DSO (Days Sales Outstanding)"
              value="18.4 Days"
              trend="↓ -2.1 days improvement"
              trendUp
              icon={<Clock size={18} />}
              iconBg="#EFF6FF"
              iconColor="#3B82F6"
              index={1}
            />
            <KpiCard
              label="GROSS_MARGIN (Global)"
              value="34.8%"
              trend="Stable within tax band"
              trendUp
              icon={<BarChart3 size={18} />}
              iconBg="#ECFDF5"
              iconColor="#10B981"
              index={2}
            />
            <KpiCard
              label="STOCKOUT_RATE"
              value={`${stockoutRate}%`}
              trend={lowStockCount > 0 ? `${lowStockCount} SKUs currently flagged` : "Healthy capacity limits"}
              trendUp={stockoutRate < 10}
              icon={<ShieldAlert size={18} />}
              iconBg="#FEF2F2"
              iconColor="#EF4444"
              index={3}
            />
          </>
        )}
      </div>

      {/* Data Table Panel */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Panel Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">Stock Alert Ledgers</h3>
            {/* Filter Tabs */}
            <div className="flex border border-[#E2E8F0] rounded-md overflow-hidden text-[11px]">
              {ALIGN_TABS.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 font-bold border-0 bg-white cursor-pointer transition-all duration-150 ${
                    tab === t.id ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#64748B] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          
          <button className="text-xs font-semibold text-[#64748B] border border-[#E2E8F0] px-3 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer bg-white">
            Export CSV
          </button>
        </div>
        
        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-[#F8FAFC]/55 border-b border-[#E2E8F0] flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Depot filter:</span>
            <select
              value={warehouseFilter}
              onChange={e => setWarehouseFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
            >
              <option value="all">All Warehouses</option>
              <option value="Karachi Central Depot">Karachi Central Depot</option>
              <option value="Lahore North Terminal">Lahore North Terminal</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Category filter:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-[10px] text-[#64748B] font-medium bg-[#EEF2FF] border border-[#C7D2FE] px-2.5 py-1 rounded-full">
            Filtered: <span className="font-extrabold text-[#4F46E5]">{filtered.length}</span> SKUs
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Product & SKU</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Brand & Category</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right">Quantity</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right">Reserved</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right">Available</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center">Alert Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center">System Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right">Retail Price</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-[#E2E8F0]">
                    <td className="px-6 py-4">
                      <div className="w-36 h-3 rounded shimmer-skeleton mb-1.5" />
                      <div className="w-20 h-2 rounded shimmer-skeleton" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-3 rounded shimmer-skeleton mb-1.5" />
                      <div className="w-16 h-2 rounded shimmer-skeleton" />
                    </td>
                    <td className="px-6 py-4"><div className="w-12 h-3 rounded shimmer-skeleton ml-auto" /></td>
                    <td className="px-6 py-4"><div className="w-10 h-3 rounded shimmer-skeleton ml-auto" /></td>
                    <td className="px-6 py-4"><div className="w-12 h-3 rounded shimmer-skeleton ml-auto" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-4 rounded shimmer-skeleton mx-auto" /></td>
                    <td className="px-6 py-4"><div className="w-14 h-4 rounded shimmer-skeleton mx-auto" /></td>
                    <td className="px-6 py-4"><div className="w-16 h-3 rounded shimmer-skeleton ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs text-[#94A3B8] font-medium">
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : filtered.map(p => {
                const totalQty = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
                const totalRes = p.inventory.reduce((sum, inv) => sum + inv.reserved_quantity, 0);
                const totalAvail = p.inventory.reduce((sum, inv) => sum + inv.available_quantity, 0);
                const alertStatus = computeStockAlertStatus(totalAvail, p.low_stock_threshold, p.overstock_threshold);
                const isFlashing = flashingIds[p.product_id];

                return (
                  <tr 
                    key={p.product_id} 
                    onClick={() => setSelectedId(p.product_id)}
                    className={`data-row border-b border-[#E2E8F0] cursor-pointer text-xs ${
                      isFlashing ? 'animate-row-flash' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-[#0F172A]">{p.product_name}</div>
                        <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">{p.sku}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#64748B]">
                      <div>
                        <div className="font-semibold">{p.brand}</div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">{p.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-[#0F172A]">
                      {totalQty.toLocaleString('en-US')}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-[#E11D48]">
                      {totalRes.toLocaleString('en-US')}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#4F46E5]">
                      {totalAvail.toLocaleString('en-US')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StockAlertBadge status={alertStatus} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ProductStatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#0F172A]">
                      {formatCurrency(p.prices.RETAIL)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B] font-semibold">
          <span>Showing {loading ? 0 : filtered.length} of {products.length} SKUs</span>
          <div className="flex gap-2">
            <button disabled className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-md text-[11px] disabled:opacity-40 cursor-default bg-white">
              Prev
            </button>
            <button className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-md text-[11px] hover:bg-[#F8FAFC] cursor-pointer bg-white">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Product Detail Drawer */}
      {selectedProduct && (
        <ProductDrawer
          product={selectedProduct}
          open={selectedId !== null}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Add SKU Modal */}
      <AddSkuModal
        open={addSkuOpen}
        onClose={() => setAddSkuOpen(false)}
        onSuccess={(name) => {
          setToast(`SKU catalog item "${name}" registered successfully!`);
          setTimeout(() => setToast(''), 4000);
        }}
      />
    </div>
  );
}
