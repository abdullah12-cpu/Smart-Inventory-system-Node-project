'use client';
import { useState, useRef, useEffect } from 'react';
import { 
  Search, Bell, LayoutDashboard, Box, Users, 
  Settings, LogOut, Check, ChevronDown, Plus, FileSpreadsheet, MapPin, 
  Database, ShieldAlert, Clock, Coins, UserCheck, History, ListTodo, AlertTriangle
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { 
  formatCurrency, 
  formatDate, 
  PaymentMethod,
  NotificationSeverity,
  User
} from '@/lib/data';
import { 
  OrderStatusBadge, 
  InvoiceStatusBadge, 
  LatePaymentRiskBadge, 
  ReliabilityRating,
  Badge
} from '@/components/ui';
import AdminDashboard from './admin/AdminDashboard';

// Mock list of users representing roles table in admin.sql
const AVAILABLE_USER_ROLES: User[] = [
  {
    user_id: 'u-1',
    first_name: 'Saif',
    last_name: 'Shahzad',
    email: 'saif@commerceiq.com',
    phone: '+92 300 1234567',
    profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop',
    role_name: 'Super Admin',
    is_active: true
  },
  {
    user_id: 'u-2',
    first_name: 'Asim',
    last_name: 'Raza',
    email: 'asim@commerceiq.com',
    phone: '+92 301 7654321',
    profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop',
    role_name: 'Inventory Manager',
    is_active: true
  },
  {
    user_id: 'u-3',
    first_name: 'Rehan',
    last_name: 'Qureshi',
    email: 'rehan@commerceiq.com',
    phone: '+92 302 5554321',
    profile_image: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&fit=crop',
    role_name: 'Accountant',
    is_active: true
  },
  {
    user_id: 'u-4',
    first_name: 'Kamil',
    last_name: 'Shah',
    email: 'kamil@commerceiq.com',
    phone: '+92 303 9994321',
    profile_image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&fit=crop',
    role_name: 'Analyst',
    is_active: true
  }
];

function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  if (method === 'JAZZCASH') {
    return (
      <span className="inline-flex items-center justify-center font-extrabold text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded scale-90 border border-amber-600">
        JazzCash
      </span>
    );
  }
  if (method === 'EASYPAISA') {
    return (
      <span className="inline-flex items-center justify-center font-extrabold text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded scale-90 border border-emerald-700">
        EasyPaisa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center font-semibold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
      {method.replace('_', ' ')}
    </span>
  );
}

export default function AdminPortal({ onLogout }: { onLogout: () => void }) {
  const { 
    notifications, 
    currentUser, 
    setCurrentUser,
    markNotificationRead, 
    orders, 
    invoices, 
    payments, 
    suppliers,
    stockMovements,
    auditLogs,
    recordPaymentAllocation,
    addSupplier,
    updateSupplier,
    deleteSupplier
  } = useStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'suppliers' | 'orders' | 'settings'>('dashboard');
  const [search, setSearch] = useState('');
  
  // Custom interactive menus
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [notifBounce, setNotifBounce] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  
  // Supplier CRUD state
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<typeof suppliers[0] | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierReliabilityFilter, setSupplierReliabilityFilter] = useState('all');
  const [supplierLeadTimeFilter, setSupplierLeadTimeFilter] = useState('all');
  const [supplierCountryFilter, setSupplierCountryFilter] = useState('all');

  // Orders and Wholesaler search & filters state
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersTypeFilter, setOrdersTypeFilter] = useState('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const [supplierToast, setSupplierToast] = useState('');
  // Supplier form fields
  const [sCompany, setSCompany] = useState('');
  const [sContact, setSContact] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sCity, setSCity] = useState('');
  const [sCountry, setSCountry] = useState('Pakistan');
  const [sLeadTime, setSLeadTime] = useState('7');
  const [sReliability, setSReliability] = useState('80');

  // Payment Allocator form states
  const [allocInvoiceId, setAllocInvoiceId] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocMethod, setAllocMethod] = useState<PaymentMethod>('JAZZCASH');
  const [allocRef, setAllocRef] = useState('');
  const [allocSuccess, setAllocSuccess] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter(n => !n.is_read);

  // Trigger bell bounce on new notifications
  useEffect(() => {
    if (unreadNotifications.length > 0) {
      setNotifBounce(true);
      const timer = setTimeout(() => setNotifBounce(false), 600);
      return () => clearTimeout(timer);
    }
  }, [notifications.length]);

  // Click outside menus handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleSwitcherOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleMarkAllRead = () => {
    notifications.forEach(n => {
      if (!n.is_read) markNotificationRead(n.notification_id);
    });
  };

  // Determine permissions based on role
  const canAccessSuppliers = currentUser.role_name === 'Super Admin' || currentUser.role_name === 'Inventory Manager' || currentUser.role_name === 'Analyst';
  const canAccessBilling = currentUser.role_name === 'Super Admin' || currentUser.role_name === 'Accountant';
  
  // Safely fallback to dashboard if role change blocks current tab
  useEffect(() => {
    if (activeTab === 'suppliers' && !canAccessSuppliers) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'orders' && !canAccessBilling) {
      setActiveTab('dashboard');
    }
  }, [currentUser.role_name, activeTab, canAccessSuppliers, canAccessBilling]);

  // Set default allocation form parameters when selecting an invoice
  useEffect(() => {
    const openInvoices = invoices.filter(i => i.status !== 'PAID');
    if (openInvoices.length > 0 && !allocInvoiceId) {
      setAllocInvoiceId(openInvoices[0].invoice_id);
    }
  }, [invoices, allocInvoiceId]);

  useEffect(() => {
    if (allocInvoiceId) {
      const selectedInv = invoices.find(i => i.invoice_id === allocInvoiceId);
      if (selectedInv) {
        const remaining = selectedInv.total_amount - selectedInv.amount_paid;
        setAllocAmount(remaining.toString());
        setAllocRef(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
      }
    }
  }, [allocInvoiceId, invoices]);

  const handleRecordAllocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(allocAmount);
    if (isNaN(amt) || amt <= 0 || !allocInvoiceId) return;

    recordPaymentAllocation(allocInvoiceId, amt, allocMethod, allocRef);
    setAllocSuccess(`Payment of Rs ${amt.toLocaleString()} recorded & allocated successfully.`);
    setTimeout(() => setAllocSuccess(''), 4000);
  };

  const severityStyles: Record<NotificationSeverity, string> = {
    INFO: 'border-l-4 border-blue-500 bg-blue-50/50',
    WARNING: 'border-l-4 border-amber-500 bg-amber-50/50',
    CRITICAL: 'border-l-4 border-rose-500 bg-rose-50/50'
  };

  // Filter notifications by selected tab
  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'CRITICAL') return n.severity === 'CRITICAL';
    if (notifFilter === 'WARNING') return n.severity === 'WARNING';
    return true;
  });

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-xs">
      {/* SIDEBAR */}
      <aside className="w-[260px] bg-[#0F172A] flex flex-col border-r border-[#1E293B] flex-shrink-0 relative z-20">
        {/* Brand Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-[#1E293B]">
          <div className="w-8 h-8 bg-[#4F46E5] rounded-md flex items-center justify-center text-white font-extrabold text-sm logo-box"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            IQ
          </div>
          <div>
            <span className="text-white font-bold text-[16px] tracking-tight block" style={{ fontFamily: 'Outfit, sans-serif' }}>
              CommerceIQ
            </span>
            <span className="text-[9px] text-[#94A3B8] font-bold block tracking-wider uppercase mt-0.5">Admin Command</span>
          </div>
        </div>

        {/* Navigation links with sliding bar effect */}
        <nav className="flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto relative">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`sidebar-link w-full text-left border-0 bg-transparent ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard Hub</span>
          </button>

          {canAccessSuppliers && (
            <button 
              onClick={() => setActiveTab('suppliers')}
              className={`sidebar-link w-full text-left border-0 bg-transparent ${activeTab === 'suppliers' ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Suppliers Directory</span>
            </button>
          )}

          {canAccessBilling && (
            <button 
              onClick={() => setActiveTab('orders')}
              className={`sidebar-link w-full text-left border-0 bg-transparent ${activeTab === 'orders' ? 'active' : ''}`}
            >
              <Box size={18} />
              <span>Orders & Ledgers</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab('settings')}
            className={`sidebar-link w-full text-left border-0 bg-transparent ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings size={18} />
            <span>System Settings</span>
          </button>
        </nav>

        {/* User Footer Switcher matching SQL roles */}
        <div className="p-4 border-t border-[#1E293B] relative" ref={roleRef}>
          {roleSwitcherOpen && (
            <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-[#1E293B] border border-[#334155] rounded-xl p-2 shadow-2xl z-50 animate-dropdown text-white flex flex-col gap-1">
              <p className="text-[10px] text-[#94A3B8] font-bold px-2 py-1 uppercase tracking-wider">Switch System Role</p>
              {AVAILABLE_USER_ROLES.map(roleUser => (
                <button
                  key={roleUser.user_id}
                  onClick={() => {
                    setCurrentUser(roleUser);
                    setRoleSwitcherOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-colors border-0 text-left cursor-pointer text-xs text-white ${
                    currentUser.role_name === roleUser.role_name ? 'bg-[#4F46E5]' : 'bg-transparent'
                  }`}
                >
                  <div>
                    <span className="font-semibold block">{roleUser.first_name} {roleUser.last_name}</span>
                    <span className="text-[9px] text-slate-300 block">{roleUser.role_name}</span>
                  </div>
                  {currentUser.role_name === roleUser.role_name && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          )}

          <div 
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center justify-between px-2.5 py-2 mb-3 bg-[#1E293B]/40 hover:bg-[#1E293B]/80 rounded-lg cursor-pointer border border-transparent hover:border-[#4F46E5]/40 transition-all"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img 
                src={currentUser.profile_image} 
                alt="Profile" 
                className="w-9 h-9 rounded-full object-cover border border-[#4F46E5]" 
              />
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser.first_name} {currentUser.last_name}
                </div>
                <div className="mt-0.5">
                  <Badge text={currentUser.role_name} variant="info" className="scale-[0.8] origin-left py-0.5" />
                </div>
              </div>
            </div>
            <ChevronDown size={14} className="text-[#94A3B8]" />
          </div>

          <button 
            onClick={onLogout}
            className="sidebar-link w-full text-[#EF4444] hover:bg-red-950/20 hover:text-[#EF4444] border-0 bg-transparent"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="h-[70px] bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 flex-shrink-0 relative z-10">
          <div className="relative w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] transition-colors"
              placeholder="Search catalog, suppliers, or reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notifications Menu Trigger */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); }}
                className={`relative w-9 h-9 flex items-center justify-center border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors cursor-pointer ${
                  notifOpen ? 'bg-[#F8FAFC] border-[#4F46E5]' : ''
                }`}
              >
                <Bell size={18} className={notifBounce ? 'animate-bell-bounce' : ''} />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Card */}
              {notifOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] w-[360px] bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden animate-dropdown">
                  <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">Notifications Center</span>
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-[#4F46E5] hover:text-[#4338CA] transition-colors border-0 bg-transparent cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  </div>
                  {/* Filters */}
                  <div className="px-4 py-2 bg-slate-50 border-b border-[#E2E8F0] flex gap-2">
                    <button onClick={() => setNotifFilter('ALL')} className={`px-2 py-0.5 rounded text-[9px] font-bold border-0 cursor-pointer ${notifFilter === 'ALL' ? 'bg-[#4F46E5] text-white' : 'bg-transparent text-slate-500 hover:text-slate-900'}`}>ALL</button>
                    <button onClick={() => setNotifFilter('CRITICAL')} className={`px-2 py-0.5 rounded text-[9px] font-bold border-0 cursor-pointer ${notifFilter === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-transparent text-slate-500 hover:text-slate-900'}`}>CRITICAL</button>
                    <button onClick={() => setNotifFilter('WARNING')} className={`px-2 py-0.5 rounded text-[9px] font-bold border-0 cursor-pointer ${notifFilter === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-transparent text-slate-500 hover:text-slate-900'}`}>WARNING</button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-[#E2E8F0]">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#94A3B8] font-medium">No alerts matches this filter criteria.</div>
                    ) : (
                      filteredNotifications.map(n => (
                        <div 
                          key={n.notification_id} 
                          onClick={() => markNotificationRead(n.notification_id)}
                          className={`p-4 transition-colors hover:bg-[#F8FAFC] cursor-pointer ${
                            n.is_read ? 'opacity-60' : ''
                          } ${severityStyles[n.severity]}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-bold text-[#0F172A]">{n.title}</span>
                            <span className="text-[9px] text-[#94A3B8] whitespace-nowrap">{formatDate(n.created_at)}</span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-1 leading-normal">{n.message}</p>
                          <div className="flex gap-1.5 mt-2">
                            <Badge text={n.trigger_type} variant="neutral" className="scale-90 origin-left" />
                            <Badge text={n.severity} variant={n.severity === 'CRITICAL' ? 'danger' : n.severity === 'WARNING' ? 'warning' : 'blue'} className="scale-90 origin-left" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 pl-2 border-l border-[#E2E8F0]">
              <img 
                src={currentUser.profile_image} 
                alt="Profile" 
                className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0]" 
              />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-[#0F172A]">{currentUser.first_name}</div>
                <div className="text-[10px] text-[#64748B] font-medium">{currentUser.role_name}</div>
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA WITH CROSS-FADE TRANSITIONS */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="animate-cross-fade flex flex-col gap-6">
              <AdminDashboard search={search} />
              
              {/* Live stock movements ledger widget on main dashboard */}
              <div className="px-8 pb-8">
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Live Inventory Stock Movements Ledger</h3>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Real-time ledger audit log tracking all warehouse adjustments, transfers, and additions</p>
                    </div>
                    <Badge text="Append-Only Log" variant="info" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                          <th className="px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Date & Time</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Product Name</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Warehouse</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Action Type</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-right">Adjustment</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Operator / Performed By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockMovements.slice(0, 5).map(m => (
                          <tr key={m.movement_id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-6 py-3 text-[#64748B] font-medium">{formatDate(m.created_at)}</td>
                            <td className="px-6 py-3 font-bold text-[#0F172A]">{m.product_name}</td>
                            <td className="px-6 py-3 text-[#64748B]">{m.warehouse_name}</td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${
                                m.movement_type === 'IN' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'
                              }`}>
                                {m.movement_type}
                              </span>
                            </td>
                            <td className={`px-6 py-3 text-right font-extrabold ${m.quantity > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </td>
                            <td className="px-6 py-3 text-slate-500 font-semibold">{m.performed_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="page-container animate-cross-fade">
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Suppliers & Vendors Directory
                  </h1>
                  <p className="text-xs text-[#64748B] mt-1">
                    {suppliers.length} active vendor relationships · Avg lead time {Math.round(suppliers.reduce((a, s) => a + s.lead_time_days, 0) / (suppliers.length || 1))} days
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setSCompany(''); setSContact(''); setSEmail(''); setSPhone('');
                    setSCity(''); setSCountry('Pakistan'); setSLeadTime('7'); setSReliability('80');
                    setSupplierModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-[#4F46E5] text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-[#4338CA] transition-colors cursor-pointer border-0 shadow-sm"
                >
                  <Plus size={15} /> Add Supplier
                </button>
              </div>

              {/* Success Toast */}
              {supplierToast && (
                <div className="bg-[#ECFDF5] border border-emerald-200 px-4 py-3 rounded-lg flex items-center gap-2 text-[11px] font-bold text-emerald-700 animate-fade-up">
                  <Check size={14} /> {supplierToast}
                </div>
              )}

              {/* Supplier Search & Stats */}
              {(() => {
                const supplierCountries = Array.from(new Set(suppliers.map(s => s.country)));
                const filteredSuppliers = suppliers.filter(s => {
                  const q = supplierSearch.toLowerCase();
                  const matchSearch = !supplierSearch || 
                    s.company_name.toLowerCase().includes(q) || 
                    s.contact_person.toLowerCase().includes(q) || 
                    s.email.toLowerCase().includes(q) || 
                    s.city.toLowerCase().includes(q);

                  let matchReliability = true;
                  if (supplierReliabilityFilter === 'excellent') matchReliability = s.reliability_score >= 90;
                  else if (supplierReliabilityFilter === 'good') matchReliability = s.reliability_score >= 80 && s.reliability_score < 90;
                  else if (supplierReliabilityFilter === 'average') matchReliability = s.reliability_score >= 70 && s.reliability_score < 80;
                  else if (supplierReliabilityFilter === 'poor') matchReliability = s.reliability_score < 70;

                  let matchLeadTime = true;
                  if (supplierLeadTimeFilter === 'short') matchLeadTime = s.lead_time_days <= 5;
                  else if (supplierLeadTimeFilter === 'medium') matchLeadTime = s.lead_time_days > 5 && s.lead_time_days <= 10;
                  else if (supplierLeadTimeFilter === 'long') matchLeadTime = s.lead_time_days > 10;

                  const matchCountry = supplierCountryFilter === 'all' || s.country === supplierCountryFilter;

                  return matchSearch && matchReliability && matchLeadTime && matchCountry;
                });

                return (
                  <>
                    <div className="flex flex-col gap-4 bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-4 flex-wrap animate-fade-up">
                        <div className="relative flex-1 max-w-xs">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                          <input
                            className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] transition-colors"
                            placeholder="Search company, contact, city..."
                            value={supplierSearch}
                            onChange={e => setSupplierSearch(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-3 text-xs">
                          {[{ label: 'Total', val: suppliers.length, color: 'text-[#4F46E5]' },
                            { label: 'High Reliability', val: suppliers.filter(s => s.reliability_score >= 85).length, color: 'text-emerald-600' },
                            { label: 'Filtered', val: filteredSuppliers.length, color: 'text-indigo-600 font-bold' }
                          ].map(stat => (
                            <div key={stat.label} className="bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-center">
                              <div className={`font-extrabold text-sm ${stat.color}`}>{stat.val}</div>
                              <div className="text-[10px] text-[#64748B]">{stat.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Filters toolbar for supplier */}
                      <div className="flex items-center gap-4 flex-wrap pt-3 border-t border-[#F1F5F9] text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Reliability:</span>
                          <select
                            value={supplierReliabilityFilter}
                            onChange={e => setSupplierReliabilityFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                          >
                            <option value="all">All Tiers</option>
                            <option value="excellent">Excellent (&gt;=90%)</option>
                            <option value="good">Good (80-89%)</option>
                            <option value="average">Average (70-79%)</option>
                            <option value="poor">Needs Attention (&lt;70%)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Lead Time:</span>
                          <select
                            value={supplierLeadTimeFilter}
                            onChange={e => setSupplierLeadTimeFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                          >
                            <option value="all">All Lead Times</option>
                            <option value="short">Fast (&lt;= 5 days)</option>
                            <option value="medium">Standard (6-10 days)</option>
                            <option value="long">Long (&gt; 10 days)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Country:</span>
                          <select
                            value={supplierCountryFilter}
                            onChange={e => setSupplierCountryFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                          >
                            <option value="all">All Countries</option>
                            {supplierCountries.map(country => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Suppliers Table */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                              <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Company Name</th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Contact Person</th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Email & Phone</th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Location</th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center">Lead Time</th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Reliability</th>
                              <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSuppliers.map(s => (
                        <tr key={s.supplier_id} className="data-row border-b border-[#E2E8F0] group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#0F172A]">{s.company_name}</div>
                            <div className="text-[9px] text-[#94A3B8] mt-0.5">ID: {s.supplier_id}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-[#64748B]">{s.contact_person}</td>
                          <td className="px-6 py-4">
                            <div className="text-[#64748B]">{s.email}</div>
                            <div className="text-[10px] text-[#94A3B8]">{s.phone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-[#64748B]">
                              <MapPin size={11} className="text-[#94A3B8] flex-shrink-0" />
                              {s.city}, {s.country}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.lead_time_days <= 5 ? 'bg-emerald-50 text-emerald-700' :
                              s.lead_time_days <= 10 ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {s.lead_time_days}d
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <ReliabilityRating score={s.reliability_score} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            {deleteConfirmId === s.supplier_id ? (
                              <div className="flex items-center gap-1 justify-center">
                                <span className="text-[9px] text-red-600 font-bold">Confirm?</span>
                                <button
                                  onClick={() => { deleteSupplier(s.supplier_id); setDeleteConfirmId(null); setSupplierToast(`${s.company_name} removed from vendor directory.`); setTimeout(() => setSupplierToast(''), 3000); }}
                                  className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded cursor-pointer border-0 hover:bg-red-600"
                                >Yes</button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded cursor-pointer border-0 hover:bg-slate-300"
                                >No</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingSupplier(s);
                                    setSCompany(s.company_name); setSContact(s.contact_person);
                                    setSEmail(s.email); setSPhone(s.phone);
                                    setSCity(s.city); setSCountry(s.country);
                                    setSLeadTime(s.lead_time_days.toString()); setSReliability(s.reliability_score.toString());
                                    setSupplierModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold rounded cursor-pointer border-0 hover:bg-indigo-200"
                                >Edit</button>
                                <button
                                  onClick={() => setDeleteConfirmId(s.supplier_id)}
                                  className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded cursor-pointer border-0 hover:bg-red-100"
                                >Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-10 text-xs text-[#94A3B8] font-medium">No suppliers match your search. <button onClick={() => setSupplierModalOpen(true)} className="text-[#4F46E5] font-bold underline cursor-pointer border-0 bg-transparent">Add one now</button>.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add/Edit Supplier Modal (inline, no external modal) */}
              {supplierModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setSupplierModalOpen(false); }}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-[#E2E8F0] overflow-hidden animate-dropdown">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0]">
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {editingSupplier ? 'Edit Supplier Profile' : 'Onboard New Supplier'}
                        </h3>
                        <p className="text-[10px] text-[#64748B] mt-0.5">{editingSupplier ? `Updating: ${editingSupplier.company_name}` : 'Register a new vendor in the supplier directory'}</p>
                      </div>
                      <button onClick={() => setSupplierModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] border-0 bg-transparent cursor-pointer text-lg leading-none">&times;</button>
                    </div>
                    <form
                      className="p-6 flex flex-col gap-4 text-xs"
                      onSubmit={e => {
                        e.preventDefault();
                        const data = {
                          company_name: sCompany, contact_person: sContact, email: sEmail,
                          phone: sPhone, city: sCity, country: sCountry,
                          lead_time_days: parseInt(sLeadTime) || 7,
                          reliability_score: Math.min(100, Math.max(0, parseInt(sReliability) || 80))
                        };
                        if (editingSupplier) {
                          updateSupplier({ ...editingSupplier, ...data });
                          setSupplierToast(`${sCompany} profile updated successfully.`);
                        } else {
                          addSupplier(data);
                          setSupplierToast(`${sCompany} onboarded as a new supplier.`);
                        }
                        setSupplierModalOpen(false);
                        setTimeout(() => setSupplierToast(''), 3500);
                      }}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Company Name *</label>
                          <input className="input-field py-2 text-xs" placeholder="e.g. Cisco Distribution PK" value={sCompany} onChange={e => setSCompany(e.target.value)} required />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Contact Person *</label>
                          <input className="input-field py-2 text-xs" placeholder="e.g. Ahmed Khan" value={sContact} onChange={e => setSContact(e.target.value)} required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Email Address *</label>
                          <input className="input-field py-2 text-xs" type="email" placeholder="contact@company.pk" value={sEmail} onChange={e => setSEmail(e.target.value)} required />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Phone Number</label>
                          <input className="input-field py-2 text-xs" placeholder="+92 21 XXXXXXXX" value={sPhone} onChange={e => setSPhone(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-1">City</label>
                          <input className="input-field py-2 text-xs" placeholder="e.g. Karachi" value={sCity} onChange={e => setSCity(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Country</label>
                          <select className="input-field py-2 text-xs" value={sCountry} onChange={e => setSCountry(e.target.value)}>
                            <option>Pakistan</option><option>China</option><option>UAE</option><option>USA</option><option>Germany</option><option>India</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Lead Time (days)</label>
                          <input className="input-field py-2 text-xs" type="number" min="1" max="365" value={sLeadTime} onChange={e => setSLeadTime(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Reliability Score (0–100)</label>
                          <input className="input-field py-2 text-xs" type="number" min="0" max="100" value={sReliability} onChange={e => setSReliability(e.target.value)} />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg transition-colors border-0 cursor-pointer mt-2">
                        {editingSupplier ? 'Save Changes' : 'Onboard Supplier'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    )}

          {activeTab === 'orders' && (
            <div className="page-container animate-cross-fade flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Wholesale Order & Financial Invoices
                </h1>
                <p className="text-xs text-[#64748B] mt-1">
                  Accounts receivable ledger tracking B2B/B2C purchase orders, credit term statuses, and payment probability scores.
                </p>
              </div>

              {/* Grid split for Orders and Invoices */}
              {(() => {
                const filteredOrders = orders.filter(o => {
                  const q = ordersSearch.toLowerCase();
                  const matchSearch = !ordersSearch || o.order_number.toLowerCase().includes(q);
                  const matchType = ordersTypeFilter === 'all' || o.order_type === ordersTypeFilter;
                  
                  let matchInvoiceStatus = true;
                  if (invoiceStatusFilter !== 'all') {
                    const orderSuffix = o.order_id.replace('o-', '');
                    const associatedInvoice = invoices.find(i => i.invoice_id.replace('inv-', '') === orderSuffix);
                    matchInvoiceStatus = associatedInvoice ? associatedInvoice.status === invoiceStatusFilter : false;
                  }

                  return matchSearch && matchType && matchInvoiceStatus;
                });

                const filteredInvoices = invoices.filter(inv => {
                  const q = ordersSearch.toLowerCase();
                  const matchSearch = !ordersSearch || inv.invoice_number.toLowerCase().includes(q);
                  const matchStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
                  
                  let matchType = true;
                  if (ordersTypeFilter !== 'all') {
                    const invSuffix = inv.invoice_id.replace('inv-', '');
                    const associatedOrder = orders.find(o => o.order_id.replace('o-', '') === invSuffix);
                    matchType = associatedOrder ? associatedOrder.order_type === ordersTypeFilter : false;
                  }

                  let matchRisk = true;
                  if (riskFilter === 'low') matchRisk = inv.late_payment_probability < 0.20;
                  else if (riskFilter === 'medium') matchRisk = inv.late_payment_probability >= 0.20 && inv.late_payment_probability <= 0.50;
                  else if (riskFilter === 'high') matchRisk = inv.late_payment_probability > 0.50;

                  return matchSearch && matchStatus && matchType && matchRisk;
                });

                return (
                  <>
                    {/* Orders Search & Filter Control Bar */}
                    <div className="flex flex-col gap-4 bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="relative flex-1 max-w-xs animate-fade-up">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                          <input
                            className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] transition-colors"
                            placeholder="Search order or invoice number..."
                            value={ordersSearch}
                            onChange={e => setOrdersSearch(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => { setOrdersSearch(''); setOrdersTypeFilter('all'); setInvoiceStatusFilter('all'); setRiskFilter('all'); }}
                            className="px-3.5 py-2 border border-[#E2E8F0] hover:bg-slate-50 rounded-lg text-xs text-[#64748B] hover:text-[#0F172A] bg-white cursor-pointer transition-colors"
                          >
                            Clear Filters
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap pt-3 border-t border-[#F1F5F9] text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Order Type:</span>
                          <select
                            value={ordersTypeFilter}
                            onChange={e => setOrdersTypeFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                          >
                            <option value="all">All Types</option>
                            <option value="B2B">B2B Wholesale</option>
                            <option value="B2C">B2C Retail</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Invoice:</span>
                          <select
                            value={invoiceStatusFilter}
                            onChange={e => setInvoiceStatusFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                          >
                            <option value="all">All Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="PARTIALLY_PAID">Partially Paid</option>
                            <option value="UNPAID">Unpaid</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Late Probability Risk:</span>
                          <select
                            value={riskFilter}
                            onChange={e => setRiskFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                          >
                            <option value="all">All Risk Tiers</option>
                            <option value="low">Low Risk (&lt;20%)</option>
                            <option value="medium">Medium Risk (20-50%)</option>
                            <option value="high">High Risk Alert (&gt;50%)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Orders Table */}
                      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50">
                          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Purchase Orders Ledger</h3>
                          <Badge text={`${filteredOrders.length} Orders`} variant="neutral" />
                        </div>
                        <div className="overflow-x-auto flex-1">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Order No</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right">Total Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredOrders.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="text-center py-8 text-xs text-[#94A3B8] font-medium">No orders match filter.</td>
                                </tr>
                              ) : (
                                filteredOrders.map(o => (
                                  <tr key={o.order_id} className="data-row border-b border-[#E2E8F0]">
                                    <td className="px-6 py-3.5">
                                      <div>
                                        <span className="font-bold text-[#0F172A]">{o.order_number}</span>
                                        <div className="text-[10px] text-[#94A3B8] mt-0.5">{formatDate(o.order_date)}</div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                      <Badge text={o.order_type} variant={o.order_type === 'B2B' ? 'info' : 'gray'} />
                                    </td>
                                    <td className="px-6 py-3.5">
                                      <OrderStatusBadge status={o.status} />
                                    </td>
                                    <td className="px-6 py-3.5 text-right font-bold text-[#0F172A]">
                                      {formatCurrency(o.total_amount)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Invoices Table */}
                      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50">
                          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Receivable Invoices</h3>
                          <Badge text={`${filteredInvoices.length} Invoices`} variant="neutral" />
                        </div>
                        <div className="overflow-x-auto flex-1">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Invoice No</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right">Total</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Payment Allocation</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Late Probability</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredInvoices.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="text-center py-8 text-xs text-[#94A3B8] font-medium">No invoices match filter.</td>
                                </tr>
                              ) : (
                                filteredInvoices.map(inv => {
                                  const allocationPct = inv.total_amount > 0 ? (inv.amount_paid / inv.total_amount) * 100 : 0;
                                  return (
                                    <tr key={inv.invoice_id} className="data-row border-b border-[#E2E8F0]">
                                      <td className="px-6 py-3.5">
                                        <div>
                                          <span className="font-bold text-[#0F172A]">{inv.invoice_number}</span>
                                          <div className="text-[10px] text-[#94A3B8] mt-0.5">Due: {formatDate(inv.due_date)}</div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3.5">
                                        <InvoiceStatusBadge status={inv.status} />
                                      </td>
                                      <td className="px-6 py-3.5 text-right font-bold text-[#0F172A]">
                                        {formatCurrency(inv.total_amount)}
                                      </td>
                                      <td className="px-6 py-3.5">
                                        <div className="w-[100px]">
                                          <div className="flex justify-between text-[9px] text-[#64748B] font-bold mb-0.5">
                                            <span>Paid:</span>
                                            <span>{Math.round(allocationPct)}%</span>
                                          </div>
                                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                              style={{ width: `${allocationPct}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3.5">
                                        <LatePaymentRiskBadge probability={inv.late_payment_probability} />
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Payment Allocator & Settlement Log side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form: Simulate Payment Allocation */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Simulate Payment Allocation</h3>
                    <p className="text-[10px] text-[#64748B] mt-0.5">Allocate cash transfers, checks or mobile wallet transactions to outstanding B2B invoices</p>
                  </div>
                  
                  <form onSubmit={handleRecordAllocationSubmit} className="flex flex-col gap-3">
                    <div>
                      <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Select Open Invoice</label>
                      <select 
                        className="input-field py-2 text-xs" 
                        value={allocInvoiceId} 
                        onChange={e => setAllocInvoiceId(e.target.value)} 
                        required
                      >
                        {invoices.filter(inv => inv.status !== 'PAID').map(inv => (
                          <option key={inv.invoice_id} value={inv.invoice_id}>
                            {inv.invoice_number} (Unpaid: {formatCurrency(inv.total_amount - inv.amount_paid)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Method</label>
                        <select 
                          className="input-field py-2 text-xs" 
                          value={allocMethod} 
                          onChange={e => setAllocMethod(e.target.value as PaymentMethod)}
                          required
                        >
                          <option value="JAZZCASH">JazzCash</option>
                          <option value="EASYPAISA">EasyPaisa</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CARD">Credit Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Allocation (Rs)</label>
                        <input 
                          type="number" 
                          className="input-field py-2 text-xs"
                          value={allocAmount}
                          onChange={e => setAllocAmount(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[#64748B] font-semibold block mb-1">Transaction Ref Code</label>
                      <input 
                        type="text" 
                        className="input-field py-2 text-xs"
                        value={allocRef}
                        onChange={e => setAllocRef(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="w-full py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg transition-colors cursor-pointer border-0">
                      Submit Allocation & Reconcile
                    </button>
                  </form>

                  {allocSuccess && (
                    <div className="bg-emerald-50 border border-emerald-300/40 p-3 rounded-lg flex items-start gap-2 animate-fade-up text-emerald-800 text-[11px] font-medium leading-normal">
                      <Check size={14} className="text-[#10B981] flex-shrink-0 mt-0.5" />
                      <span>{allocSuccess}</span>
                    </div>
                  )}
                </div>

                {/* Settlement Logs Table */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
                  <div className="px-6 py-4 border-b border-[#E2E8F0]">
                    <h3 className="text-sm font-bold text-[#0F172A]">Settlement & Reconciled Payments Logs</h3>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                          <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Payment Reference</th>
                          <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Customer Name</th>
                          <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-right">Amount Received</th>
                          <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Method</th>
                          <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Settlement status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(p => (
                          <tr key={p.payment_id} className="data-row border-b border-[#E2E8F0]">
                            <td className="px-6 py-3">
                              <div>
                                <span className="font-bold text-[#0F172A]">{p.reference_no}</span>
                                <div className="text-[9px] text-[#94A3B8] mt-0.5">{formatDate(p.payment_date)}</div>
                              </div>
                            </td>
                            <td className="px-6 py-3 font-semibold text-[#0F172A]">{p.customer_name}</td>
                            <td className="px-6 py-3 text-right font-bold text-emerald-600">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="px-6 py-3">
                              <PaymentMethodIcon method={p.payment_method} />
                            </td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${
                                p.status === 'RECONCILED' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#EEF2FF] text-[#4F46E5]'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="page-container animate-cross-fade flex flex-col gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  System Settings & Audit Log
                </h1>
                <p className="text-xs text-[#64748B] mt-1">
                  Adjust default parameters, currency codes, and view security audit logs.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration parameters */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col gap-5 text-xs lg:col-span-1">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A] mb-3">Database Connection Status</h3>
                    <div className="bg-[#ECFDF5] border border-[#10B981]/20 p-4 rounded-lg flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                      <div>
                        <p className="font-bold text-[#059669]">MySQL Schema Aligned</p>
                        <p className="text-[10px] text-[#059669] mt-0.5 leading-normal">Tables verified: roles, users, categories, products, inventory, suppliers, orders, invoices, payments, notification_rules, notifications, audit_logs.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-[#0F172A]">Default System Currency</label>
                    <input className="input-field cursor-not-allowed bg-slate-50 text-xs" value="PKR (Rs)" disabled />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-[#0F172A]">Risk Threshold Classifier (Late Payment Probability)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="border border-[#E2E8F0] p-2.5 rounded-lg text-center bg-emerald-50/20">
                        <span className="text-[9px] text-[#64748B] font-bold block mb-1">LOW RISK</span>
                        <span className="text-[#10B981] font-bold text-[10px]">&lt; 30%</span>
                      </div>
                      <div className="border border-[#E2E8F0] p-2.5 rounded-lg text-center bg-amber-50/20">
                        <span className="text-[9px] text-[#64748B] font-bold block mb-1">MEDIUM RISK</span>
                        <span className="text-[#F59E0B] font-bold text-[10px]">30% - 60%</span>
                      </div>
                      <div className="border border-[#E2E8F0] p-2.5 rounded-lg text-center bg-red-50/20">
                        <span className="text-[9px] text-[#64748B] font-bold block mb-1">HIGH RISK</span>
                        <span className="text-[#EF4444] font-bold text-[10px]">&gt; 60%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
                  <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">Append-Only Security Audit Ledger</h3>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Captures a complete JSON-diff schema history tracking every operator addition, update or deletion</p>
                    </div>
                    <Badge text="audit_logs" variant="neutral" />
                  </div>
                  <div className="overflow-y-auto flex-1 max-h-[450px]">
                    <div className="flex flex-col divide-y divide-[#E2E8F0]">
                      {auditLogs.map(log => (
                        <div key={log.audit_id} className="p-4 hover:bg-[#F8FAFC] transition-colors flex items-start gap-3 text-xs">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            log.action === 'UPDATE' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'bg-[#ECFDF5] text-[#10B981]'
                          }`}>
                            <Database size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-[#0f172a]">{log.table_name.toUpperCase()}</span>
                                <Badge text={log.action} variant={log.action === 'UPDATE' ? 'warning' : 'success'} className="scale-90" />
                              </div>
                              <span className="text-[9px] text-[#94A3B8]">{formatDate(log.created_at)}</span>
                            </div>
                            <p className="text-[11px] text-[#64748B] mt-1 font-medium leading-relaxed">{log.notes}</p>
                            <p className="text-[10px] text-[#4F46E5] font-semibold mt-1">Performed by: {log.performed_by}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
