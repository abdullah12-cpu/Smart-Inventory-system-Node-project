'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Product } from '@/lib/data';
import Modal from '@/components/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (prodName: string) => void;
}

export default function AddSkuModal({ open, onClose, onSuccess }: Props) {
  const { addNewProduct } = useStore();

  // General fields
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Networking');
  const [desc, setDesc] = useState('');
  const [unit, setUnit] = useState('PCS');
  const [weight, setWeight] = useState('1.5');
  const [lowStock, setLowStock] = useState('10');
  const [overStock, setOverStock] = useState('100');

  // Pricing
  const [priceRetail, setPriceRetail] = useState('12000');
  const [priceDistributor, setPriceDistributor] = useState('10500');
  const [priceVip, setPriceVip] = useState('9800');
  const [priceCustom, setPriceCustom] = useState('9500');

  // Initial stock levels
  const [stockKarachi, setStockKarachi] = useState('20');
  const [stockLahore, setStockLahore] = useState('15');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !barcode || !name) return;

    const parsedWeight = parseFloat(weight) || 0;
    const parsedLow = parseInt(lowStock) || 0;
    const parsedOver = parseInt(overStock) || 0;
    
    const pRetail = parseFloat(priceRetail) || 0;
    const pDist = parseFloat(priceDistributor) || 0;
    const pVip = parseFloat(priceVip) || 0;
    const pCust = parseFloat(priceCustom) || 0;

    const qtyK = parseInt(stockKarachi) || 0;
    const qtyL = parseInt(stockLahore) || 0;

    const newProdId = `p-${Date.now()}`;

    const newProduct: Product = {
      product_id: newProdId,
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim(),
      product_name: name.trim(),
      short_description: desc.trim() || 'No description provided.',
      brand: brand.trim() || 'Generic',
      category: category,
      unit: unit,
      weight: parsedWeight,
      status: 'ACTIVE',
      low_stock_threshold: parsedLow,
      overstock_threshold: parsedOver,
      dead_stock_days: 90,
      prices: {
        RETAIL: pRetail,
        DISTRIBUTOR: pDist,
        VIP: pVip,
        CUSTOM: pCust
      },
      inventory: [
        {
          warehouse_id: 'wh-1',
          warehouse_name: 'Karachi Central Depot',
          quantity: qtyK,
          reserved_quantity: 0,
          available_quantity: qtyK
        },
        {
          warehouse_id: 'wh-2',
          warehouse_name: 'Lahore North Terminal',
          quantity: qtyL,
          reserved_quantity: 0,
          available_quantity: qtyL
        }
      ]
    };

    addNewProduct(newProduct);
    onSuccess(name.trim());
    onClose();

    // Reset fields
    setSku('');
    setBarcode('');
    setName('');
    setBrand('');
    setDesc('');
    setStockKarachi('20');
    setStockLahore('15');
  };

  return (
    <Modal open={open} onClose={onClose} title="Register New SKU Catalog Item">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
        {/* Row 1: Name & Brand */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Product Name *</label>
            <input 
              type="text" 
              className="input-field py-2 text-xs" 
              placeholder="e.g. Fiber Core Switch 24P" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Brand Name</label>
            <input 
              type="text" 
              className="input-field py-2 text-xs" 
              placeholder="e.g. Cisco" 
              value={brand} 
              onChange={e => setBrand(e.target.value)} 
            />
          </div>
        </div>

        {/* Row 2: SKU & Barcode */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[#64748B] font-semibold block mb-1">SKU Code *</label>
            <input 
              type="text" 
              className="input-field py-2 text-xs" 
              placeholder="e.g. SW-24P-ENT" 
              value={sku} 
              onChange={e => setSku(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="text-[10px] text-[#64748B] font-semibold block mb-1">UPC Barcode *</label>
            <input 
              type="text" 
              className="input-field py-2 text-xs" 
              placeholder="e.g. 884729112" 
              value={barcode} 
              onChange={e => setBarcode(e.target.value)} 
              required 
            />
          </div>
        </div>

        {/* Row 3: Category, Unit, Weight */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Category</label>
            <select className="input-field py-2 text-xs" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="Networking">Networking</option>
              <option value="Compute Cards">Compute Cards</option>
              <option value="Fiber Optics">Fiber Optics</option>
              <option value="UPS & Power">UPS & Power</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Unit</label>
            <input type="text" className="input-field py-2 text-xs" value={unit} onChange={e => setUnit(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Weight (kg)</label>
            <input type="text" className="input-field py-2 text-xs" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
        </div>

        {/* Short Description */}
        <div>
          <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Short Description</label>
          <textarea 
            rows={2} 
            className="input-field py-2 text-xs" 
            placeholder="Brief description of hardware specifications..." 
            value={desc} 
            onChange={e => setDesc(e.target.value)}
          />
        </div>

        {/* Pricing Tiers */}
        <div className="border-t border-[#F1F5F9] pt-3">
          <p className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider mb-2">Wholesale Price Tiers (Rs)</p>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[9px] text-[#64748B] block mb-1">Retail Rate</label>
              <input type="number" className="input-field py-1.5 text-xs" value={priceRetail} onChange={e => setPriceRetail(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] text-[#64748B] block mb-1">Distributor</label>
              <input type="number" className="input-field py-1.5 text-xs" value={priceDistributor} onChange={e => setPriceDistributor(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] text-[#64748B] block mb-1">VIP Rate</label>
              <input type="number" className="input-field py-1.5 text-xs" value={priceVip} onChange={e => setPriceVip(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] text-[#64748B] block mb-1">Custom</label>
              <input type="number" className="input-field py-1.5 text-xs" value={priceCustom} onChange={e => setPriceCustom(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Warehouse Inventory & Safety triggers */}
        <div className="border-t border-[#F1F5F9] pt-3">
          <p className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider mb-2">Inventory Levels & Alerts</p>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[9px] text-[#64748B] block mb-1">Karachi Stock</label>
              <input type="number" className="input-field py-1.5 text-xs" value={stockKarachi} onChange={e => setStockKarachi(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] text-[#64748B] block mb-1">Lahore Stock</label>
              <input type="number" className="input-field py-1.5 text-xs" value={stockLahore} onChange={e => setStockLahore(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] text-[#64748B] block mb-1">Low Trigger</label>
              <input type="number" className="input-field py-1.5 text-xs" value={lowStock} onChange={e => setLowStock(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] text-[#64748B] block mb-1">Overstock</label>
              <input type="number" className="input-field py-1.5 text-xs" value={overStock} onChange={e => setOverStock(e.target.value)} />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full py-2.5 mt-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg transition-colors border-0 cursor-pointer"
        >
          Create SKU Catalog Item
        </button>
      </form>
    </Modal>
  );
}
