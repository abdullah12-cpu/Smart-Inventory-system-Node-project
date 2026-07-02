'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Product, formatCurrency, computeStockAlertStatus, formatDate } from '@/lib/data';
import { ProductStatusBadge, StockAlertBadge, Badge } from '@/components/ui';
import Drawer from '@/components/Drawer';
import { CheckCircle, Warehouse, Edit3, Save, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';

interface Props { product: Product; open: boolean; onClose: () => void; }

export default function ProductDrawer({ product, open, onClose }: Props) {
  const { adjustWarehouseStock, updateProductAlertRules, stockMovements } = useStore();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(product.inventory[0]?.warehouse_id || '');
  const [delta, setDelta] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [toast, setToast] = useState('');
  
  // Editable alert thresholds
  const [editingThresholds, setEditingThresholds] = useState(false);
  const [lowThreshold, setLowThreshold] = useState(product.low_stock_threshold);
  const [overThreshold, setOverThreshold] = useState(product.overstock_threshold);
  
  // Active detail tab
  const [detailTab, setDetailTab] = useState<'stock' | 'prices' | 'history'>('stock');

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(delta);
    if (isNaN(n) || !selectedWarehouseId) return;
    adjustWarehouseStock(product.product_id, selectedWarehouseId, n, adjustNotes || 'Manual inventory audit adjustment.');
    setDelta('');
    setAdjustNotes('');
    setToast('Ledger adjustment applied successfully!');
    setTimeout(() => setToast(''), 2500);
  };

  const handleSaveThresholds = () => {
    updateProductAlertRules(product.product_id, lowThreshold, overThreshold);
    setEditingThresholds(false);
    setToast('Alert thresholds updated!');
    setTimeout(() => setToast(''), 2500);
  };

  const totalQuantity = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
  const totalReserved = product.inventory.reduce((sum, inv) => sum + inv.reserved_quantity, 0);
  const totalAvailable = product.inventory.reduce((sum, inv) => sum + inv.available_quantity, 0);
  const derivedAlertStatus = computeStockAlertStatus(totalAvailable, product.low_stock_threshold, product.overstock_threshold);

  // Filter stock movements for this product
  const productMovements = stockMovements.filter(m => m.product_id === product.product_id);

  const DETAIL_TABS = [
    { id: 'stock' as const, label: 'Warehouse Stock' },
    { id: 'prices' as const, label: 'Price Tiers' },
    { id: 'history' as const, label: 'Movement Log' },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={product.product_name}
      subtitle={`SKU: ${product.sku} | Barcode: ${product.barcode}`}
      footer={
        <button onClick={onClose} className="w-full py-2.5 border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer bg-white">
          Close Sheet
        </button>
      }
    >
      {/* Product Status & Summary Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <ProductStatusBadge status={product.status} />
        <StockAlertBadge status={derivedAlertStatus} />
        <span className="text-[11px] text-[#64748B] font-medium ml-auto">
          Total: <strong className="text-[#0F172A]">{totalQuantity}</strong> |
          Reserved: <strong className="text-[#E11D48]">{totalReserved}</strong> |
          Available: <strong className="text-[#4F46E5]">{totalAvailable}</strong>
        </span>
      </div>

      {/* Product Metadata */}
      <InfoSection title="Product Metadata">
        <InfoGrid items={[
          { label: 'Brand', val: product.brand },
          { label: 'Category Group', val: product.category },
          { label: 'Base Unit', val: product.unit },
          { label: 'Weight (kg)', val: `${product.weight.toFixed(2)} kg` },
        ]} />
        <p className="text-[11px] text-[#64748B] mt-3 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] leading-relaxed">
          {product.short_description}
        </p>
      </InfoSection>

      {/* Detail Tabs */}
      <div className="border-t border-[#F1F5F9] pt-4 mt-4">
        <div className="flex border border-[#E2E8F0] rounded-lg overflow-hidden mb-4">
          {DETAIL_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setDetailTab(t.id)}
              className={`flex-1 px-3 py-2 text-[11px] font-bold border-0 cursor-pointer transition-all duration-150 ${
                detailTab === t.id ? 'bg-[#4F46E5] text-white' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Warehouse Stock */}
        {detailTab === 'stock' && (
          <div className="flex flex-col gap-2.5 animate-cross-fade">
            {product.inventory.map(inv => {
              const pct = totalQuantity > 0 ? (inv.quantity / totalQuantity) * 100 : 0;
              return (
                <div key={inv.warehouse_id} className="bg-white border border-[#E2E8F0] rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-[#4F46E5]/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#0F172A]">
                      <Warehouse size={13} className="text-[#4F46E5]" />
                      {inv.warehouse_name}
                    </div>
                    <StockAlertBadge status={computeStockAlertStatus(inv.available_quantity, product.low_stock_threshold, product.overstock_threshold)} />
                  </div>
                  {/* Capacity bar */}
                  <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4F46E5] rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1 border-t border-[#F8FAFC]">
                    <div>
                      <div className="text-[#64748B]">Quantity</div>
                      <div className="font-bold text-[#0F172A]">{inv.quantity}</div>
                    </div>
                    <div>
                      <div className="text-[#64748B]">Reserved</div>
                      <div className="font-bold text-[#E11D48]">{inv.reserved_quantity}</div>
                    </div>
                    <div>
                      <div className="text-[#4F46E5] font-semibold">Available</div>
                      <div className="font-bold text-[#4F46E5]">{inv.available_quantity}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Price Tiers */}
        {detailTab === 'prices' && (
          <div className="grid grid-cols-2 gap-2 text-xs animate-cross-fade">
            {([
              { tier: 'Retail Rate', price: product.prices.RETAIL, color: '#0F172A', bg: '#F8FAFC' },
              { tier: 'Distributor Rate', price: product.prices.DISTRIBUTOR, color: '#4F46E5', bg: '#EEF2FF' },
              { tier: 'VIP Tier Rate', price: product.prices.VIP, color: '#059669', bg: '#ECFDF5' },
              { tier: 'Custom Rate', price: product.prices.CUSTOM, color: '#7C3AED', bg: '#F5F3FF' },
            ]).map(p => (
              <div key={p.tier} className="border border-[#E2E8F0] p-3 rounded-lg" style={{ backgroundColor: p.bg }}>
                <span className="font-semibold block text-[11px]" style={{ color: p.color }}>{p.tier}</span>
                <strong className="text-sm mt-1 block" style={{ color: p.color }}>{formatCurrency(p.price)}</strong>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Movement Log */}
        {detailTab === 'history' && (
          <div className="flex flex-col gap-2 animate-cross-fade">
            {productMovements.length === 0 ? (
              <div className="text-center text-[11px] text-[#94A3B8] py-6 font-medium">No stock movements recorded for this SKU yet.</div>
            ) : (
              productMovements.map(m => (
                <div key={m.movement_id} className="border border-[#E2E8F0] rounded-lg p-3 flex items-start gap-3 bg-white hover:bg-[#F8FAFC] transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    m.movement_type === 'IN' ? 'bg-[#ECFDF5] text-[#10B981]' :
                    m.movement_type === 'OUT' ? 'bg-[#FEF2F2] text-[#EF4444]' :
                    'bg-[#EEF2FF] text-[#4F46E5]'
                  }`}>
                    {m.movement_type === 'IN' ? <ArrowUpCircle size={14} /> : m.movement_type === 'OUT' ? <ArrowDownCircle size={14} /> : <History size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#0F172A]">{m.movement_type}</span>
                      <Badge text={`${m.quantity > 0 ? '+' : ''}${m.quantity}`} variant={m.quantity > 0 ? 'success' : 'danger'} />
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-0.5 leading-relaxed">{m.notes}</p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-[#94A3B8]">
                      <span>{m.warehouse_name}</span>
                      <span>•</span>
                      <span>{formatDate(m.created_at)}</span>
                      <span>•</span>
                      <span>{m.performed_by}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Editable Safety Alert Thresholds */}
      <InfoSection title="Stock Alert Threshold Rules">
        {editingThresholds ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#64748B] font-medium block mb-1">Low Stock Trigger</label>
                <input type="number" className="input-field py-2 text-xs" value={lowThreshold} onChange={e => setLowThreshold(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-[10px] text-[#64748B] font-medium block mb-1">Overstock Trigger</label>
                <input type="number" className="input-field py-2 text-xs" value={overThreshold} onChange={e => setOverThreshold(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveThresholds} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] text-white text-[11px] font-bold rounded-lg hover:bg-[#4338CA] transition-colors cursor-pointer border-0">
                <Save size={12} /> Save Changes
              </button>
              <button onClick={() => { setEditingThresholds(false); setLowThreshold(product.low_stock_threshold); setOverThreshold(product.overstock_threshold); }} className="px-3 py-1.5 text-[11px] font-bold text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] cursor-pointer bg-white">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <InfoGrid items={[
              { label: 'Low Stock Trigger', val: `${product.low_stock_threshold} units` },
              { label: 'Overstock Trigger', val: `${product.overstock_threshold} units` },
              { label: 'Dead Stock Limit', val: `${product.dead_stock_days} days` },
            ]} />
            <button onClick={() => setEditingThresholds(true)} className="flex items-center gap-1 text-[10px] font-bold text-[#4F46E5] hover:text-[#4338CA] cursor-pointer border-0 bg-transparent flex-shrink-0 ml-3">
              <Edit3 size={12} /> Edit
            </button>
          </div>
        )}
      </InfoSection>

      {/* Stock Adjuster */}
      <div className="bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-xl p-4">
        <p className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider mb-3">Quick Stock Adjuster</p>
        <form onSubmit={handleAdjust} className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] text-[#64748B] font-medium mb-1.5 block">Target Warehouse</label>
            <select className="input-field py-2 text-xs" value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(e.target.value)} required>
              {product.inventory.map(inv => (
                <option key={inv.warehouse_id} value={inv.warehouse_id}>
                  {inv.warehouse_name} (Avail: {inv.available_quantity})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <input className="input-field py-2 text-xs flex-1" type="number" placeholder="e.g. +20 or -15" value={delta} onChange={e => setDelta(e.target.value)} required />
          </div>
          <div>
            <label className="text-[10px] text-[#64748B] font-medium mb-1.5 block">Movement Notes</label>
            <input className="input-field py-2 text-xs" placeholder="Reason for adjustment (optional)" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} />
          </div>
          <button type="submit" className="w-full px-4 py-2.5 bg-[#4F46E5] text-white text-[11px] font-bold rounded-lg hover:bg-[#4338CA] transition-colors cursor-pointer border-0">
            Apply Adjustment
          </button>
        </form>

        {toast && (
          <div className="flex items-center gap-2 mt-3 text-[11px] text-[#10B981] font-bold animate-fade-up">
            <CheckCircle size={14} /> {toast}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#F1F5F9] pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function InfoGrid({ items }: { items: { label: string; val: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      {items.map(i => (
        <div key={i.label}>
          <p className="text-[10px] text-[#64748B]">{i.label}</p>
          <p className="text-[11px] font-bold text-[#0F172A] mt-0.5">{i.val}</p>
        </div>
      ))}
    </div>
  );
}
