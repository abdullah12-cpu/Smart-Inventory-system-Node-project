'use client';
import { useState } from 'react';
import { 
  ArrowRight, Shield, Layers, Zap, Landmark, BarChart3, Users, 
  Warehouse, Sparkles, CheckCircle2, ChevronRight, Activity, 
  TrendingUp, Database, ShieldAlert, Award, ArrowRightLeft, DollarSign,
  Smartphone, Clock
} from 'lucide-react';

interface Props {
  onGetStarted: () => void;
  onRegisterClick: () => void;
}

export default function LandingPage({ onGetStarted, onRegisterClick }: Props) {
  // Live Demo Widget state
  const [activeDemoTab, setActiveDemoTab] = useState<'warehouse' | 'reconciliation' | 'risk'>('warehouse');
  
  // Warehouse simulator state
  const [selectedSimProduct, setSelectedSimProduct] = useState('cisco');
  
  // Reconciliation simulator state
  const [paymentAllocated, setPaymentAllocated] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(1280000);
  const [paidProgress, setPaidProgress] = useState(45); // 45% paid

  // Handle allocation trigger in mock
  const handleSimulateAllocation = () => {
    if (paymentAllocated) {
      setPaidProgress(45);
      setPaymentAllocated(false);
    } else {
      setPaidProgress(100);
      setPaymentAllocated(true);
    }
  };

  const productStockData: Record<string, { karachi: number; lahore: number; threshold: number; name: string }> = {
    cisco: { name: 'Cisco Fiber Catalyst 9300', karachi: 42, lahore: 18, threshold: 15 },
    corning: { name: 'Corning Fiber Optic Spool 4km', karachi: 8, lahore: 12, threshold: 10 },
    nvidia: { name: 'Nvidia Mellanox ConnectX-6', karachi: 15, lahore: 4, threshold: 8 },
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans overflow-x-hidden relative selection:bg-[#4F46E5] selection:text-white transition-colors duration-300">
      
      {/* Background radial glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85vw] h-[65vh] bg-gradient-to-b from-[#6366F1]/8 via-[#38BDF8]/2 to-transparent rounded-full blur-[110px] pointer-events-none z-0" />

      {/* Header bar */}
      <header className="h-16 border-b border-[#E2E8F0] bg-white/70 backdrop-blur-md flex items-center justify-between px-6 sm:px-16 z-20 sticky top-0 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-[0_4px_12px_rgba(79,70,229,0.2)]"
               style={{ fontFamily: 'Outfit, sans-serif' }}>
            IQ
          </div>
          <div>
            <div className="text-[#0F172A] font-extrabold text-base tracking-tight leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
              CommerceIQ
            </div>
            <div className="text-[9px] text-[#4F46E5] font-bold tracking-widest uppercase mt-0.5">Enterprise Logistics</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onGetStarted}
            className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors bg-transparent border-0 cursor-pointer"
          >
            Sign In
          </button>
          <button 
            onClick={onRegisterClick}
            className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-sm cursor-pointer border-0"
          >
            Apply B2B Account
          </button>
        </div>
      </header>

      {/* Hero layout */}
      <section className="relative z-10 pt-16 pb-10 px-6 text-center max-w-4xl mx-auto flex flex-col items-center gap-6">
        
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] px-3.5 py-1.5 rounded-full text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider animate-fade-up">
          <Sparkles size={12} className="text-amber-500 fill-amber-500" />
          <span>Multi-Warehouse Inventory & PKR Ledger System</span>
        </div>

        <h1 className="text-4xl sm:text-[52px] font-black text-[#0F172A] leading-tight tracking-tight mt-1" 
            style={{ fontFamily: 'Outfit, sans-serif' }}>
          Smarter Warehousing for <br />
          <span className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#0EA5E9] bg-clip-text text-transparent">
            Modern B2B Supply Chains
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl leading-relaxed">
          CommerceIQ consolidates inventory allocations between Karachi Depot and Lahore Terminal, predicts late payment risk metrics, and automates JazzCash, EasyPaisa, and bank transfer reconciliations.
        </p>

        {/* Action triggers */}
        <div className="flex flex-col sm:flex-row gap-3.5 mt-3">
          <button 
            onClick={onGetStarted}
            className="flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer border-0"
          >
            Launch Interactive Demo <ArrowRight size={14} />
          </button>
          <button 
            onClick={onRegisterClick}
            className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#4F46E5] font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Register B2B Account
          </button>
        </div>
      </section>

      {/* Interactive Operations Hub Simulator (WOW factor) */}
      <section className="relative z-10 max-w-4xl w-full mx-auto px-6 pb-16">
        <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-xl overflow-hidden animate-fade-up">
          
          {/* Simulation Header */}
          <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider block">Operational Simulator</span>
              <span className="text-xs font-semibold text-[#0F172A] mt-0.5 block">Click tabs to interact with live backend features</span>
            </div>
            {/* Live simulator tabs */}
            <div className="flex bg-[#E2E8F0]/60 p-1 rounded-lg self-start">
              <button 
                onClick={() => setActiveDemoTab('warehouse')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors border-0 cursor-pointer ${activeDemoTab === 'warehouse' ? 'bg-white text-[#4F46E5] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A] bg-transparent'}`}
              >
                Warehouse Logs
              </button>
              <button 
                onClick={() => setActiveDemoTab('reconciliation')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors border-0 cursor-pointer ${activeDemoTab === 'reconciliation' ? 'bg-white text-[#4F46E5] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A] bg-transparent'}`}
              >
                PKR Reconciliation
              </button>
              <button 
                onClick={() => setActiveDemoTab('risk')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors border-0 cursor-pointer ${activeDemoTab === 'risk' ? 'bg-white text-[#4F46E5] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A] bg-transparent'}`}
              >
                Payment Risk Radar
              </button>
            </div>
          </div>

          {/* Simulator Content Area */}
          <div className="p-6 sm:p-8 min-h-[220px] flex flex-col justify-center">
            
            {/* TAB 1: Warehouse logs */}
            {activeDemoTab === 'warehouse' && (
              <div className="flex flex-col gap-5 animate-cross-fade">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A]">Real-time Multi-Warehouse stock tracker</h4>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Select a catalog SKU to view Karachi vs Lahore balances.</p>
                  </div>
                  <select 
                    value={selectedSimProduct}
                    onChange={e => setSelectedSimProduct(e.target.value)}
                    className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-[10px] font-bold text-[#0F172A] bg-white"
                  >
                    <option value="cisco">Cisco Fiber Catalyst 9300</option>
                    <option value="corning">Corning Fiber Optic Spool 4km</option>
                    <option value="nvidia">Nvidia Mellanox ConnectX-6</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Karachi */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-[#475569] flex items-center gap-1.5">
                        <Warehouse size={13} className="text-[#4F46E5]" /> Karachi Depot
                      </span>
                      <span className="font-extrabold text-[#0F172A]">{productStockData[selectedSimProduct].karachi} PCS Available</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          productStockData[selectedSimProduct].karachi <= productStockData[selectedSimProduct].threshold ? 'bg-amber-500' : 'bg-[#4F46E5]'
                        }`}
                        style={{ width: `${Math.min(100, (productStockData[selectedSimProduct].karachi / 50) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-[#94A3B8]">
                      <span>Reserved: 0 pcs</span>
                      <span>Capacity: 50 pcs</span>
                    </div>
                  </div>

                  {/* Lahore */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-[#475569] flex items-center gap-1.5">
                        <Warehouse size={13} className="text-[#0EA5E9]" /> Lahore Terminal
                      </span>
                      <span className="font-extrabold text-[#0F172A]">{productStockData[selectedSimProduct].lahore} PCS Available</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          productStockData[selectedSimProduct].lahore <= productStockData[selectedSimProduct].threshold ? 'bg-amber-500' : 'bg-[#0EA5E9]'
                        }`}
                        style={{ width: `${Math.min(100, (productStockData[selectedSimProduct].lahore / 50) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-[#94A3B8]">
                      <span>Reserved: 0 pcs</span>
                      <span>Capacity: 50 pcs</span>
                    </div>
                  </div>
                </div>

                {/* Stock alert warning context banner */}
                {(productStockData[selectedSimProduct].karachi <= productStockData[selectedSimProduct].threshold || productStockData[selectedSimProduct].lahore <= productStockData[selectedSimProduct].threshold) && (
                  <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-amber-700 font-semibold animate-fade-up">
                    <ShieldAlert size={14} className="text-amber-500 flex-shrink-0" />
                    <span>Trigger Warning: Stock level fell below the safety alert rule of {productStockData[selectedSimProduct].threshold} units. Replenishment lead time required.</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PKR digital wallet reconciliation */}
            {activeDemoTab === 'reconciliation' && (
              <div className="flex flex-col gap-5 animate-cross-fade">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A]">Digital Wallet Payment Allocation</h4>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Automates Pakistani payment gateways JazzCash, EasyPaisa, and bank transfer routing.</p>
                  </div>
                  <button 
                    onClick={handleSimulateAllocation}
                    className="px-3.5 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer transition-colors shadow-xs"
                  >
                    {paymentAllocated ? 'Reset Invoice Payment' : 'Simulate PKR Mobile Wallet Transfer'}
                  </button>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <span className="text-[9px] text-[#4F46E5] font-bold uppercase tracking-wider block">B2B Wholesale Invoice</span>
                      <span className="text-xs font-bold text-[#0F172A] mt-0.5 block">INV-2026-8802 (Cisco Distribution Pakistan)</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${paymentAllocated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {paymentAllocated ? 'STATUS: PAID' : 'STATUS: PARTIALLY PAID'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] text-[#475569] font-medium">
                      <span>Amount Received: Rs {paymentAllocated ? '1,280,000' : '576,000'}</span>
                      <span>Total Invoice: Rs 1,280,000</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-700 rounded-full"
                        style={{ width: `${paidProgress}%` }}
                      />
                    </div>
                  </div>

                  {paymentAllocated && (
                    <div className="flex items-center gap-2 text-[10px] text-emerald-700 font-bold bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl animate-fade-up">
                      <Landmark size={14} />
                      <span>Reconciled! JazzCash reference ID TXN-9982713 matched and invoice status set to PAID instantly.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Late payment risk analytics */}
            {activeDemoTab === 'risk' && (
              <div className="flex flex-col gap-4 animate-cross-fade">
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">Late Payment Risk Prediction Radar</h4>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Calculates customer DSO indicators and risk alerts dynamically.</p>
                </div>

                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#F8FAFC]">
                  <div className="grid grid-cols-3 bg-[#EEF2FF] border-b border-[#E2E8F0] px-4 py-2 text-[9px] font-bold text-[#4F46E5] uppercase tracking-wider">
                    <span>Company / Wholesaler</span>
                    <span className="text-center">Days Sales Outstanding</span>
                    <span className="text-right">Risk Score</span>
                  </div>
                  
                  <div className="divide-y divide-[#E2E8F0] text-[11px]">
                    {[
                      { name: 'Karam Cables Corp', dso: '14 days', risk: 'Low Risk', color: 'text-emerald-600 bg-emerald-50' },
                      { name: 'Siddique Networking Ltd', dso: '42 days', risk: 'Medium Risk', color: 'text-amber-600 bg-amber-50' },
                      { name: 'Nvidia Advanced Edge Ltd', dso: '64 days', risk: 'High Risk Alert', color: 'text-rose-600 bg-rose-50' }
                    ].map(client => (
                      <div key={client.name} className="grid grid-cols-3 px-4 py-2.5 items-center font-medium bg-white">
                        <span className="font-bold text-[#0F172A]">{client.name}</span>
                        <span className="text-center text-[#64748B]">{client.dso}</span>
                        <span className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${client.color}`}>
                            {client.risk}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Specs Grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: <Database size={16} />, title: 'Multi-Warehouse', desc: 'Stock sync between Karachi Central & Lahore terminals.' },
          { icon: <Landmark size={16} />, title: 'Wallet Auto-Reconcile', desc: 'JazzCash, EasyPaisa transaction confirmation.' },
          { icon: <TrendingUp size={16} />, title: 'Price Tier Matrix', desc: 'Retail, Distributor, VIP pricing structures.' },
          { icon: <ShieldAlert size={16} />, title: 'Audit compliance', desc: 'Strict security audit log logs every action.' }
        ].map((feat, idx) => (
          <div key={idx} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-semibold">
              {feat.icon}
            </div>
            <h3 className="text-xs font-bold text-[#0F172A] mt-1">{feat.title}</h3>
            <p className="text-[10px] text-[#64748B] leading-normal">{feat.desc}</p>
          </div>
        ))}
      </section>

      {/* Trust factors */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-8 text-center flex flex-col items-center gap-4">
        <h3 className="text-base font-extrabold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Designed for B2B Wholesale Commerce
        </h3>
        <p className="text-xs text-[#64748B] max-w-xl leading-relaxed">
          Integrate inventory status, logistics alerts, ledger payment allocation models, and role policies. No complex setups. Start operating immediately.
        </p>
      </section>

      {/* Footer bar */}
      <footer className="mt-auto border-t border-[#E2E8F0] bg-white py-6 text-center text-[#94A3B8] text-xs">
        <p>© 2026 CommerceIQ. Created for Smart Inventory B2B Management & Credit Term Ledgering.</p>
      </footer>
    </div>
  );
}
