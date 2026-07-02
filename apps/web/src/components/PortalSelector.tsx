'use client';
import { useState, useRef, useEffect } from 'react';
import { ShoppingCart, Server, Package, ChevronDown, Check } from 'lucide-react';
import { PortalType } from '@/lib/data';

interface PortalOption { id: PortalType; name: string; desc: string; icon: React.ReactNode; iconBg: string; iconColor: string; }

const PORTAL_OPTIONS: PortalOption[] = [
  { id: 'buyer', name: 'Buyer Portal', desc: 'Product catalog and purchasing', icon: <ShoppingCart size={18} />, iconBg: '#EEF2FF', iconColor: '#4F46E5' },
  { id: 'admin', name: 'Admin Portal', desc: 'Platform administration and analytics', icon: <Server size={18} />, iconBg: '#F1F5F9', iconColor: '#475569' },
  { id: 'distributor', name: 'Distributor Portal', desc: 'Inventory and order management', icon: <Package size={18} />, iconBg: '#F0FDF4', iconColor: '#16A34A' },
];

interface Props { value: PortalType; onChange: (v: PortalType) => void; }

export default function PortalSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = PORTAL_OPTIONS.find(o => o.id === value) || PORTAL_OPTIONS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between p-3 rounded-[10px] border-[1.5px] transition-all duration-150 bg-white text-left cursor-pointer ${open ? 'border-[#4F46E5] shadow-[0_0_20px_rgba(79,70,229,0.15)]' : 'border-[#E2E8F0] hover:border-[#94A3B8] hover:bg-[#F8FAFC]'}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{ backgroundColor: selected.iconBg, color: selected.iconColor }}>
            {selected.icon}
          </div>
          <div>
            <div className="font-semibold text-sm text-[#0F172A]">{selected.name}</div>
            <div className="text-xs text-[#64748B]">{selected.desc}</div>
          </div>
        </div>
        <ChevronDown size={18} className={`text-[#94A3B8] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[#E2E8F0] rounded-[10px] shadow-lg z-50 p-1.5 animate-dropdown">
          {PORTAL_OPTIONS.map(opt => (
            <div
              key={opt.id}
              onMouseDown={e => e.stopPropagation()}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-[6px] cursor-pointer transition-all duration-150 ${value === opt.id ? 'bg-[#EEF2FF]' : 'hover:bg-[#F8FAFC]'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: opt.iconBg, color: opt.iconColor }}>
                  {opt.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm text-[#0F172A]">{opt.name}</div>
                  <div className="text-xs text-[#64748B]">{opt.desc}</div>
                </div>
              </div>
              {value === opt.id && <Check size={16} className="text-[#4F46E5]" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
