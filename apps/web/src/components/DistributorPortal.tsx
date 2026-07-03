'use client';
import { useState, useMemo } from 'react';
import { Package, FileText, FileSpreadsheet, LogOut, DollarSign, Search, CheckCircle, Clock, ShoppingCart, Bell, User, Download, UploadCloud, CreditCard, AlertCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { KpiCard, OrderStatusBadge, Badge, InvoiceStatusBadge } from '@/components/ui';
import Modal from '@/components/Modal';
import { formatCurrency, formatDate } from '@/lib/data';

interface Quotation {
  quotation_id: string;
  quotation_number: string;
  status: 'DRAFT' | 'SENT' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  total_amount: number;
  valid_until: string;
  created_at: string;
}

const MOCK_QUOTATIONS: Quotation[] = [
  { quotation_id: 'q1', quotation_number: 'QUO-2026-00001', status: 'ACCEPTED', total_amount: 3681600, valid_until: '2026-07-20T00:00:00Z', created_at: '2026-07-01T00:00:00Z' },
  { quotation_id: 'q2', quotation_number: 'QUO-2026-00002', status: 'NEGOTIATING', total_amount: 1450000, valid_until: '2026-07-25T00:00:00Z', created_at: '2026-07-02T00:00:00Z' },
  { quotation_id: 'q3', quotation_number: 'QUO-2026-00003', status: 'DRAFT', total_amount: 850000, valid_until: '2026-07-30T00:00:00Z', created_at: '2026-07-03T00:00:00Z' },
];

interface LedgerEntry {
  id: string;
  ts: string;
  ref_type: 'invoice' | 'payment' | 'credit' | 'debit';
  ref_id: string;
  debit: number;
  credit: number;
  running_balance: number;
}

const MOCK_LEDGER: LedgerEntry[] = [
  { id: 'l1', ts: '2026-06-20T00:00:00Z', ref_type: 'invoice', ref_id: 'INV-2026-00004', debit: 980000, credit: 0, running_balance: 980000 },
  { id: 'l2', ts: '2026-06-22T00:00:00Z', ref_type: 'payment', ref_id: 'EP-445610-TX', debit: 0, credit: 100000, running_balance: 880000 },
  { id: 'l3', ts: '2026-06-28T00:00:00Z', ref_type: 'invoice', ref_id: 'INV-2026-00003', debit: 1368800, credit: 0, running_balance: 2248800 },
  { id: 'l4', ts: '2026-06-29T00:00:00Z', ref_type: 'payment', ref_id: 'HBL-TXN-299301', debit: 0, credit: 1368800, running_balance: 880000 },
];

const MOCK_REMINDERS = [
  { id: 'r1', ref_id: 'INV-2026-00004', channel: 'EMAIL', tone: 'POLITE', sent_at: '2026-06-25T10:00:00Z', status: 'OPENED', response: 'PROMISED_TO_PAY' },
  { id: 'r2', ref_id: 'INV-2026-00004', channel: 'WHATSAPP', tone: 'FIRM', sent_at: '2026-06-28T14:30:00Z', status: 'DELIVERED', response: 'NO_RESPONSE' },
];

function QuoteStatusBadge({ status }: { status: Quotation['status'] }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    SENT: 'bg-blue-50 text-blue-700 border-blue-200',
    NEGOTIATING: 'bg-amber-50 text-amber-700 border-amber-200',
    ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    EXPIRED: 'bg-stone-50 text-stone-700 border-stone-200',
    CONVERTED: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  );
}

export default function DistributorPortal({ onLogout }: { onLogout: () => void }) {
  const { orders, products } = useStore();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'quotations' | 'orders' | 'ledger' | 'reminders' | 'profile'>('catalog');
  
  // Quotations Filter State
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('all');
  
  // Orders Filter State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  
  // Catalog Filter State
  const [catalogSearch, setCatalogSearch] = useState('');
  
  // Interactive Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [quoteDetailsOpen, setQuoteDetailsOpen] = useState(false);
  const [activeQuote, setActiveQuote] = useState<Quotation | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [addToQuoteToast, setAddToQuoteToast] = useState('');
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [limitIncreaseToast, setLimitIncreaseToast] = useState('');
  const [actionToast, setActionToast] = useState('');
  const [isCounterMode, setIsCounterMode] = useState(false);
  const [counterValue, setCounterValue] = useState('');
  
  const [draftItems, setDraftItems] = useState<{name: string, price: number, qty: number}[]>([]);
  const [draftModalOpen, setDraftModalOpen] = useState(false);

  const handleAddToQuote = (productName: string, price: number) => {
    setDraftItems(prev => {
      const existing = prev.find(item => item.name === productName);
      if (existing) {
        return prev.map(item => item.name === productName ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { name: productName, price, qty: 1 }];
    });
    setAddToQuoteToast(`Added ${productName} to Quote Draft`);
    setTimeout(() => setAddToQuoteToast(''), 3000);
  };

  const handleDownloadInvoices = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 2000);
  };

  const handleRequestLimit = () => {
    setLimitIncreaseToast('Limit increase request sent to Accounts.');
    setTimeout(() => setLimitIncreaseToast(''), 3000);
  };

  const handleSubmitCounter = () => {
    setIsCounterMode(false);
    setQuoteDetailsOpen(false);
    setCounterValue('');
    setActionToast('Counter offer submitted for review.');
    setTimeout(() => setActionToast(''), 3000);
  };

  const handleAcceptQuote = () => {
    setQuoteDetailsOpen(false);
    setActionToast('Quotation accepted successfully! Generating Sales Order...');
    setTimeout(() => setActionToast(''), 3000);
  };
  
  // Derived data
  const filteredQuotations = useMemo(() => {
    return MOCK_QUOTATIONS.filter(q => {
      const matchSearch = !quoteSearch || q.quotation_number.toLowerCase().includes(quoteSearch.toLowerCase());
      let matchStatus = false;
      if (quoteStatusFilter === 'PENDING_ACCEPTANCE') {
        matchStatus = q.status === 'SENT' || q.status === 'NEGOTIATING';
      } else {
        matchStatus = quoteStatusFilter === 'all' || q.status === quoteStatusFilter;
      }
      return matchSearch && matchStatus;
    });
  }, [quoteSearch, quoteStatusFilter]);
  
  const b2bOrders = orders.filter(o => o.order_type === 'B2B');
  const filteredOrders = useMemo(() => {
    return b2bOrders.filter(o => {
      const matchSearch = !orderSearch || o.order_number.toLowerCase().includes(orderSearch.toLowerCase());
      const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [b2bOrders, orderSearch, orderStatusFilter]);

  const filteredCatalog = useMemo(() => {
    return products.filter(p => !catalogSearch || p.product_name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.sku.toLowerCase().includes(catalogSearch.toLowerCase()));
  }, [products, catalogSearch]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-xs">
      {/* Sidebar - Matching Admin theme but with unique color accents */}
      <aside className="w-[260px] bg-white border-r border-[#E2E8F0] flex flex-col flex-shrink-0 z-10 shadow-sm">
        <div className="h-[70px] flex items-center gap-3 px-6 border-b border-[#E2E8F0]">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-extrabold text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
            IQ
          </div>
          <span className="font-extrabold text-lg text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Distributor<span className="text-blue-600">Portal</span>
          </span>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          <div className="px-3 mb-2 mt-2">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Ordering</span>
          </div>

          <button 
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === 'catalog' ? 'bg-blue-50 text-blue-700' : 'text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]'}`}
          >
            <ShoppingCart size={18} className={activeTab === 'catalog' ? 'text-blue-600' : ''} />
            Bulk Catalog
          </button>
          
          <button 
            onClick={() => setActiveTab('quotations')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === 'quotations' ? 'bg-blue-50 text-blue-700' : 'text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]'}`}
          >
            <FileText size={18} className={activeTab === 'quotations' ? 'text-blue-600' : ''} />
            Quotations
          </button>
          
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === 'orders' ? 'bg-blue-50 text-blue-700' : 'text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]'}`}
          >
            <Package size={18} className={activeTab === 'orders' ? 'text-blue-600' : ''} />
            Sales Orders
          </button>

          <div className="px-3 mb-2 mt-4">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Financials</span>
          </div>

          <button 
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === 'ledger' ? 'bg-blue-50 text-blue-700' : 'text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]'}`}
          >
            <FileSpreadsheet size={18} className={activeTab === 'ledger' ? 'text-blue-600' : ''} />
            Statement & Ledger
          </button>

          <button 
            onClick={() => setActiveTab('reminders')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === 'reminders' ? 'bg-blue-50 text-blue-700' : 'text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]'}`}
          >
            <Bell size={18} className={activeTab === 'reminders' ? 'text-blue-600' : ''} />
            Smart Reminders
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]'}`}
          >
            <User size={18} className={activeTab === 'profile' ? 'text-blue-600' : ''} />
            Billing Profile
          </button>
        </nav>
        
        <div className="p-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              SD
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-bold text-[#0F172A] truncate">Saif Distributor</div>
              <div className="text-[10px] text-[#64748B] truncate">Karachi Region</div>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 justify-center w-full py-2 text-[#EF4444] hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border-0 cursor-pointer bg-transparent">
            <LogOut size={14} /> <span className="font-bold text-[11px]">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-[70px] bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {activeTab === 'catalog' && 'Bulk Catalog & Ordering'}
              {activeTab === 'quotations' && 'Quotations & Bids'}
              {activeTab === 'orders' && 'Sales Orders & Logistics'}
              {activeTab === 'ledger' && 'Customer Statement Ledger'}
              {activeTab === 'reminders' && 'Smart Reminders History'}
              {activeTab === 'profile' && 'Billing Profile & Terms'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#64748B]">Last updated: Today</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          
          {/* CATALOG TAB */}
          {activeTab === 'catalog' && (
            <div className="animate-fade-up flex flex-col gap-6">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>Bulk Catalog</h3>
                  <p className="text-[#64748B] mt-1 text-xs">Request quotations and place bulk wholesale orders.</p>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                      placeholder="Search SKUs..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                    />
                  </div>
                  {draftItems.length > 0 && (
                    <button 
                      onClick={() => setDraftModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm active:scale-95 animate-fade-in"
                    >
                      <ShoppingCart size={14} />
                      View Draft ({draftItems.length})
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCatalog.map(p => {
                  const availableQty = p.inventory.reduce((sum, inv) => sum + inv.available_quantity, 0);
                  return (
                    <div key={p.product_id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">{p.category}</span>
                          <h4 className="font-bold text-[#0F172A] mt-2 text-sm">{p.product_name}</h4>
                          <div className="text-[10px] text-[#64748B] font-mono mt-1">SKU: {p.sku}</div>
                        </div>
                      </div>
                      <div className="mt-2 pt-3 border-t border-[#E2E8F0] flex justify-between items-end">
                        <div>
                          <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1">Distributor Price</div>
                          <div className="text-lg font-extrabold text-[#0F172A]">{formatCurrency(p.prices.DISTRIBUTOR)} <span className="text-[10px] font-medium text-[#64748B]">/{p.unit}</span></div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1">Available</div>
                          <div className={`text-sm font-bold ${availableQty > 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{availableQty.toLocaleString()} {p.unit}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddToQuote(p.product_name, p.prices.DISTRIBUTOR)}
                        className="mt-2 w-full py-2 bg-slate-50 border border-[#E2E8F0] text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer active:scale-[0.98]"
                      >
                        Add to Quote Request
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUOTATIONS TAB */}
          {activeTab === 'quotations' && (
            <div className="animate-fade-up flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard 
                  label="Active Quotations" 
                  value={MOCK_QUOTATIONS.length} 
                  icon={<FileText size={18} />} 
                  iconBg="#EFF6FF" iconColor="#3B82F6" index={0} 
                  onClick={() => setQuoteStatusFilter('all')}
                  isActive={quoteStatusFilter === 'all'}
                />
                <KpiCard 
                  label="Total Bid Value" 
                  value={formatCurrency(MOCK_QUOTATIONS.reduce((a,b)=>a+b.total_amount,0))} 
                  icon={<DollarSign size={18} />} 
                  iconBg="#F0FDF4" iconColor="#16A34A" index={1} 
                />
                <KpiCard 
                  label="Pending Acceptance" 
                  value={MOCK_QUOTATIONS.filter(q => q.status === 'SENT' || q.status === 'NEGOTIATING').length} 
                  trend="Action required" trendUp={false} 
                  icon={<Clock size={18} />} iconBg="#FEF3C7" iconColor="#F59E0B" index={2} 
                  onClick={() => setQuoteStatusFilter('PENDING_ACCEPTANCE')}
                  isActive={quoteStatusFilter === 'PENDING_ACCEPTANCE'}
                />
              </div>

              {/* Filter Bar */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Search quotation number..."
                    value={quoteSearch}
                    onChange={(e) => setQuoteSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">Status:</span>
                  <select 
                    value={quoteStatusFilter} 
                    onChange={e => setQuoteStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="PENDING_ACCEPTANCE">Pending Action</option>
                    <option value="DRAFT">Draft</option>
                    <option value="NEGOTIATING">Negotiating</option>
                    <option value="ACCEPTED">Accepted</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Quote No</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Date</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Valid Until</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Status</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right">Amount</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuotations.map(q => (
                        <tr key={q.quotation_id} className="border-b border-[#E2E8F0] hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-[#0F172A]">{q.quotation_number}</td>
                          <td className="px-6 py-4 text-[#64748B]">{formatDate(q.created_at)}</td>
                          <td className="px-6 py-4 text-[#64748B]">{formatDate(q.valid_until)}</td>
                          <td className="px-6 py-4"><QuoteStatusBadge status={q.status} /></td>
                          <td className="px-6 py-4 text-right font-bold text-[#0F172A]">{formatCurrency(q.total_amount)}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => { setActiveQuote(q); setIsCounterMode(false); setQuoteDetailsOpen(true); }}
                              className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors active:scale-95"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredQuotations.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-500">No quotations found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="animate-fade-up flex flex-col gap-6">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Search order number..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">Order Status:</span>
                  <select 
                    value={orderStatusFilter} 
                    onChange={e => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Order Ref</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Date</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Summary</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Status</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right">Amount</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <tr key={o.order_id} className="border-b border-[#E2E8F0] hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-[#0F172A]">{o.order_number}</td>
                          <td className="px-6 py-4 text-[#64748B]">{formatDate(o.order_date)}</td>
                          <td className="px-6 py-4 text-[#64748B] max-w-[200px] truncate">{o.items_summary}</td>
                          <td className="px-6 py-4"><OrderStatusBadge status={o.status} /></td>
                          <td className="px-6 py-4 text-right font-bold text-[#0F172A]">{formatCurrency(o.total_amount)}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => { setActiveOrder(o); setTrackingModalOpen(true); }}
                              className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors active:scale-95 shadow-sm"
                            >
                              Track Order
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-8 text-slate-500">No orders found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LEDGER TAB */}
          {activeTab === 'ledger' && (
            <div className="animate-fade-up flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>Statement of Account</h3>
                  <p className="text-[#64748B] mt-1 text-xs">A running ledger computed directly from the customer_ledger_view.</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Current Balance</div>
                    <div className="text-2xl font-bold text-red-600" style={{ fontFamily: 'Outfit, sans-serif' }}>{formatCurrency(880000)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDownloadInvoices}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                      disabled={downloading}
                    >
                      <Download size={14} className={downloading ? "animate-bounce" : ""} /> 
                      {downloading ? 'Preparing ZIP...' : 'Bulk Invoice Download'}
                    </button>
                    <button 
                      onClick={() => setPaymentModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer border-0 shadow-sm active:scale-95"
                    >
                      <UploadCloud size={14} /> Submit Payment Proof
                    </button>
                  </div>
                </div>
              </div>

              {/* Aging Buckets */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">0 - 30 Days</span>
                  <span className="text-lg font-bold text-[#0F172A] mt-1">{formatCurrency(150000)}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">31 - 60 Days</span>
                  <span className="text-lg font-bold text-amber-800 mt-1">{formatCurrency(730000)}</span>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">61 - 90 Days</span>
                  <span className="text-lg font-bold text-red-800 mt-1">{formatCurrency(0)}</span>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">90+ Days</span>
                  <span className="text-lg font-bold text-red-800 mt-1">{formatCurrency(0)}</span>
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col mt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Date</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Type</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Reference</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right">Debit (Owed)</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right">Credit (Paid)</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_LEDGER.map(entry => (
                        <tr key={entry.id} className="border-b border-[#E2E8F0] hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3.5 text-[#64748B]">{formatDate(entry.ts)}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${entry.ref_type === 'invoice' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {entry.ref_type}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-medium text-[#0F172A]">{entry.ref_id}</td>
                          <td className="px-6 py-3.5 text-right font-medium text-slate-700">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                          <td className="px-6 py-3.5 text-right font-medium text-emerald-600">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                          <td className="px-6 py-3.5 text-right font-bold text-[#0F172A]">{formatCurrency(entry.running_balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REMINDERS TAB */}
          {activeTab === 'reminders' && (
            <div className="animate-fade-up flex flex-col gap-6">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>Smart Reminders History</h3>
                <p className="text-[#64748B] mt-1 text-xs">Record of automated and manual payment reminders sent for outstanding invoices.</p>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Invoice Ref</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Sent Date</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Channel & Tone</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Delivery Status</th>
                      <th className="px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase">Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_REMINDERS.map(rem => (
                      <tr key={rem.id} className="border-b border-[#E2E8F0] hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-[#0F172A]">{rem.ref_id}</td>
                        <td className="px-6 py-4 text-[#64748B]">{formatDate(rem.sent_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded">{rem.channel}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rem.tone === 'FIRM' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{rem.tone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold ${rem.status === 'OPENED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {rem.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[#64748B]">{rem.response.replace(/_/g, ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-fade-up flex flex-col gap-6">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>Billing Profile</h3>
                <p className="text-[#64748B] mt-1 text-xs">Manage credit terms, limits, and taxation identities.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#0F172A]">Credit & Payment Terms</h4>
                      <p className="text-[10px] text-[#64748B]">Active limits and settlement timelines.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#64748B] font-medium">Credit Limit Utilized</span>
                        <span className="font-bold text-[#0F172A]">{formatCurrency(880000)} / {formatCurrency(2500000)}</span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: '35%' }}></div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-[#E2E8F0] flex justify-between items-center">
                      <span className="text-xs text-[#64748B]">Approved Terms</span>
                      <span className="font-bold text-xs bg-slate-100 px-3 py-1 rounded-md">Net 30 Days</span>
                    </div>
                    <button 
                      onClick={handleRequestLimit}
                      className="w-full mt-2 py-2 bg-slate-50 border border-[#E2E8F0] text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer active:scale-[0.98]"
                    >
                      Request Limit Increase
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#0F172A]">Business Identity</h4>
                      <p className="text-[10px] text-[#64748B]">Taxation and compliance records.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
                      <span className="text-xs text-[#64748B]">Business Name</span>
                      <span className="font-bold text-xs text-[#0F172A]">Saif Distributor LLC</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
                      <span className="text-xs text-[#64748B]">NTN (National Tax No)</span>
                      <span className="font-bold text-xs text-[#0F172A]">823901-4</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#64748B]">STRN (Sales Tax Reg)</span>
                      <span className="font-bold text-xs text-[#0F172A]">29048123000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Floating Toast Notification */}
      {addToQuoteToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white px-6 py-4 rounded-full shadow-2xl animate-fade-up z-[100] flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="font-bold text-sm tracking-wide">{addToQuoteToast}</span>
        </div>
      )}

      {/* Quote Details Modal */}
      <Modal open={quoteDetailsOpen} onClose={() => { setQuoteDetailsOpen(false); setIsCounterMode(false); }} title={`Quotation Details: ${activeQuote?.quotation_number}`}>
        {activeQuote && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center pb-4 border-b border-[#E2E8F0]">
              <div>
                <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Status</div>
                <QuoteStatusBadge status={activeQuote.status} />
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Total Amount</div>
                <div className="text-xl font-bold text-[#0F172A]">{formatCurrency(activeQuote.total_amount)}</div>
              </div>
            </div>
            
            {isCounterMode ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 animate-fade-up">
                <h4 className="font-bold text-sm text-amber-900 mb-4">Propose Counter Offer</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Proposed Value (Rs)</label>
                    <input 
                      type="number"
                      value={counterValue}
                      onChange={(e) => setCounterValue(e.target.value)}
                      placeholder="e.g. 1400000"
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Remarks / Justification</label>
                    <textarea 
                      placeholder="Add context for this counter offer..."
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500 shadow-sm min-h-[60px]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 animate-fade-up">
                <h4 className="font-bold text-sm text-[#0F172A] mb-3">Line Items</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#64748B]">Cement 50kg Bags x 1000</span>
                    <span className="font-bold text-[#0F172A]">{formatCurrency(1450000)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#64748B]">Steel Rebar 12mm x 500</span>
                    <span className="font-bold text-[#0F172A]">{formatCurrency(2231600)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              {isCounterMode ? (
                <>
                  <button onClick={() => setIsCounterMode(false)} className="px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button onClick={handleSubmitCounter} className="px-4 py-2 bg-amber-500 border-0 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer shadow-sm active:scale-95">
                    Submit Proposal
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setQuoteDetailsOpen(false)} className="px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                    Close
                  </button>
                  {(activeQuote.status === 'SENT' || activeQuote.status === 'NEGOTIATING') && (
                    <>
                      <button onClick={() => setIsCounterMode(true)} className="px-4 py-2 bg-amber-500 border-0 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer shadow-sm active:scale-95">
                        Propose Counter
                      </button>
                      <button onClick={handleAcceptQuote} className="px-4 py-2 bg-emerald-600 border-0 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm active:scale-95">
                        Accept Quote
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Proof Modal */}
      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Submit Payment Proof">
        <div className="flex flex-col gap-5">
          <p className="text-xs text-[#64748B] leading-relaxed">Upload your bank transfer receipt or cheque image to notify Accounts for reconciliation.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Invoice Reference</label>
              <select className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-blue-500 shadow-sm">
                <option value="INV-2026-00003">INV-2026-00003 - {formatCurrency(1368800)}</option>
                <option value="INV-2026-00004">INV-2026-00004 - {formatCurrency(980000)}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Upload Receipt</label>
              <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer">
                <UploadCloud size={28} className="text-blue-500 mb-3" />
                <span className="text-xs font-bold text-blue-600">Click to browse</span>
                <span className="text-[10px] text-[#94A3B8] mt-1">PDF, JPG, PNG up to 5MB</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0] mt-2">
            <button onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
              Cancel
            </button>
            <button 
              onClick={() => { setPaymentModalOpen(false); alert('Payment proof submitted successfully for verification.'); }}
              className="px-4 py-2 bg-blue-600 border-0 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              Submit Proof
            </button>
          </div>
        </div>
      </Modal>

      {/* Order Tracking Modal */}
      <Modal open={trackingModalOpen} onClose={() => setTrackingModalOpen(false)} title={`Order Tracking: ${activeOrder?.order_number}`}>
        {activeOrder && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center pb-4 border-b border-[#E2E8F0]">
              <div>
                <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Current Status</div>
                <OrderStatusBadge status={activeOrder.status} />
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Estimated Delivery</div>
                <div className="text-sm font-bold text-[#0F172A]">3 Days from Disptach</div>
              </div>
            </div>
            
            <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {/* Timeline Items */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-blue-600 text-white shadow shrink-0 z-10 font-bold text-[10px]">1</div>
                <div className="w-[calc(100%-2rem)] bg-white p-3 border border-[#E2E8F0] rounded-lg shadow-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-[#0F172A] text-xs">Order Confirmed</span>
                    <span className="text-[10px] text-emerald-600 font-bold">Done</span>
                  </div>
                  <div className="text-[10px] text-[#64748B]">Your order has been verified and sent to fulfillment.</div>
                </div>
              </div>
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shadow shrink-0 z-10 font-bold text-[10px] ${['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(activeOrder.status) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>2</div>
                <div className="w-[calc(100%-2rem)] bg-white p-3 border border-[#E2E8F0] rounded-lg shadow-sm opacity-90">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-[#0F172A] text-xs">Processing & Packing</span>
                    <span className="text-[10px] text-[#64748B]">{['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(activeOrder.status) ? 'Done' : 'Pending'}</span>
                  </div>
                  <div className="text-[10px] text-[#64748B]">Warehouse is picking and packing your items.</div>
                </div>
              </div>
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shadow shrink-0 z-10 font-bold text-[10px] ${['SHIPPED', 'DELIVERED'].includes(activeOrder.status) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>3</div>
                <div className="w-[calc(100%-2rem)] bg-white p-3 border border-[#E2E8F0] rounded-lg shadow-sm opacity-70">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-[#0F172A] text-xs">Shipped</span>
                    <span className="text-[10px] text-[#64748B]">{['SHIPPED', 'DELIVERED'].includes(activeOrder.status) ? 'Done' : 'Pending'}</span>
                  </div>
                  <div className="text-[10px] text-[#64748B]">Order handed over to logistics partner.</div>
                </div>
              </div>
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shadow shrink-0 z-10 font-bold text-[10px] ${activeOrder.status === 'DELIVERED' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>4</div>
                <div className="w-[calc(100%-2rem)] bg-white p-3 border border-[#E2E8F0] rounded-lg shadow-sm opacity-50">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-[#0F172A] text-xs">Delivered</span>
                    <span className="text-[10px] text-[#64748B]">{activeOrder.status === 'DELIVERED' ? 'Done' : 'Pending'}</span>
                  </div>
                  <div className="text-[10px] text-[#64748B]">Order successfully delivered to your warehouse.</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setTrackingModalOpen(false)} className="px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                Close Tracking
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Draft Quote Modal */}
      <Modal open={draftModalOpen} onClose={() => setDraftModalOpen(false)} title="Quote Request Draft">
        <div className="flex flex-col gap-6">
          <p className="text-xs text-[#64748B]">Review your items before officially sending this quotation request to the vendor for negotiation.</p>
          
          <div className="bg-slate-50 border border-[#E2E8F0] rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-2 text-[10px] font-bold text-[#64748B] uppercase">Product</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-[#64748B] uppercase text-center">Qty</th>
                  <th className="px-4 py-2 text-[10px] font-bold text-[#64748B] uppercase text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {draftItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#E2E8F0] last:border-0 bg-white">
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{item.name}</td>
                    <td className="px-4 py-3 text-center">{item.qty}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#0F172A]">{formatCurrency(item.price * item.qty)}</td>
                  </tr>
                ))}
                {draftItems.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-6 text-[#94A3B8]">Your draft is empty.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="text-left">
              <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1">Estimated Total</div>
              <div className="text-xl font-bold text-[#0F172A]">{formatCurrency(draftItems.reduce((sum, item) => sum + (item.price * item.qty), 0))}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDraftModalOpen(false)} className="px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                Continue Shopping
              </button>
              <button 
                disabled={draftItems.length === 0}
                onClick={() => {
                  setDraftModalOpen(false);
                  setDraftItems([]);
                  setActionToast('Quote Request formally submitted to vendor!');
                  setTimeout(() => setActionToast(''), 3000);
                  setActiveTab('quotations');
                }}
                className="px-4 py-2 bg-blue-600 border-0 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Floating Toast Notification for Limit Increase */}
      {limitIncreaseToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white px-5 py-3 rounded-full shadow-2xl animate-fade-up z-50 flex items-center gap-3">
          <Clock size={16} className="text-amber-400" />
          <span className="font-medium text-xs tracking-wide">{limitIncreaseToast}</span>
        </div>
      )}

      {/* Floating Toast Notification for Actions */}
      {actionToast && (
        <div className="fixed top-6 right-6 bg-[#0F172A] text-white px-5 py-3 rounded-lg shadow-2xl animate-fade-down z-[100] flex items-center gap-3">
          <CheckCircle size={16} className="text-emerald-400" />
          <span className="font-medium text-xs tracking-wide">{actionToast}</span>
        </div>
      )}
    </div>
  );
}
