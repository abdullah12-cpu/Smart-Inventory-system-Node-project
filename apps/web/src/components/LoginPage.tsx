'use client';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Shield, User, Building2, MapPin, DollarSign, ArrowLeft, CheckCircle2 } from 'lucide-react';
import PortalSelector from '@/components/PortalSelector';
import { PortalType } from '@/lib/data';
import { useStore } from '@/lib/store';

interface Props { 
  onLogin: (portal: PortalType) => void; 
  initialMode?: 'login' | 'register';
  onBackToLanding?: () => void;
}

export default function LoginPage({ onLogin, initialMode = 'login', onBackToLanding }: Props) {
  const { addNotification } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login states
  const [portal, setPortal] = useState<PortalType>('buyer');
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState('demo@commerceiq.com');
  const [password, setPassword] = useState('demopassword');

  // Register states
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [ntnCode, setNtnCode] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [warehouseRegion, setWarehouseRegion] = useState('wh-1'); // Karachi Central Depot
  const [creditRequest, setCreditRequest] = useState('500000');
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    onLogin(portal);
  };

  const handlePrefill = (role: 'admin' | 'distributor' | 'buyer') => {
    if (role === 'admin') {
      setEmail('saif@commerceiq.com');
      setPortal('admin');
    } else if (role === 'distributor') {
      setEmail('asim@commerceiq.com');
      setPortal('distributor');
    } else {
      setEmail('demo@commerceiq.com');
      setPortal('buyer');
    }
    setPassword('demopassword');
  };

  const handleSubmitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !contactName || !regEmail) return;

    // Simulate addition to the notifications rules & audit logs
    addNotification({
      title: 'B2B Registration Applied',
      message: `B2B partnership requested by ${businessName} (Contact: ${contactName}). Region: ${warehouseRegion === 'wh-1' ? 'Karachi' : 'Lahore'}. Credit limit request: Rs ${parseInt(creditRequest).toLocaleString()}.`,
      severity: 'INFO',
      trigger_type: 'CREDIT_LIMIT_BREACH'
    });

    setRegisterSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full pointer-events-none blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full pointer-events-none blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.04) 0%, transparent 70%)' }} />

      {/* Main card */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-xl w-full max-w-[460px] p-8 sm:p-10 z-10 flex flex-col gap-6 animate-card-entrance">
        
        {/* Back navigation */}
        {onBackToLanding && (
          <button 
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F172A] transition-colors border-0 bg-transparent cursor-pointer self-start -mt-2 -ml-2 p-2 rounded-lg hover:bg-[#F8FAFC]"
          >
            <ArrowLeft size={14} /> Back to info
          </button>
        )}

        {/* Logo */}
        <div className="flex justify-center -mt-2">
          <div className="w-12 h-12 bg-[#4F46E5] rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-[0_4px_12px_rgba(79,70,229,0.2)]"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            IQ
          </div>
        </div>

        {mode === 'login' ? (
          <>
            {/* Header */}
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Sign in to CommerceIQ
              </h1>
              <p className="text-xs text-[#64748B] mt-1">Enter credentials or select a fast prefill demo user</p>
            </div>

            {/* Quick prefill credentials */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col gap-2">
              <p className="text-[9px] text-[#4F46E5] font-bold uppercase tracking-wider">Fast-track Demo Logins</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  type="button" 
                  onClick={() => handlePrefill('admin')}
                  className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-[10px] font-bold rounded-lg border border-[#C7D2FE] transition-all cursor-pointer"
                >
                  Super Admin
                </button>
                <button 
                  type="button" 
                  onClick={() => handlePrefill('distributor')}
                  className="px-2 py-1.5 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100 transition-all cursor-pointer"
                >
                  Distributor
                </button>
                <button 
                  type="button" 
                  onClick={() => handlePrefill('buyer')}
                  className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
                >
                  B2B Buyer
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitLogin} className="flex flex-col gap-4 text-xs">
              
              {/* Portal Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#475569]">Select Portal Context</label>
                <PortalSelector value={portal} onChange={setPortal} />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#475569]">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Mail size={15} /></span>
                  <input
                    className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#475569]">Password</label>
                  <a href="#" className="text-[10px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors">Forgot Password?</a>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Lock size={15} /></span>
                  <input
                    className="w-full pl-9 pr-9 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors border-0 bg-transparent cursor-pointer">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-lg mt-2 cursor-pointer border-0 shadow-sm transition-all"
              >
                Sign In
              </button>
            </form>

            <div className="text-center text-xs text-[#64748B] mt-2">
              Apply for distributor or buyer access?{' '}
              <button 
                onClick={() => setMode('register')}
                className="font-semibold text-[#4F46E5] hover:underline border-0 bg-transparent cursor-pointer"
              >
                Register B2B Account
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Register B2B Card */}
            {registerSuccess ? (
              <div className="text-center flex flex-col items-center gap-4 py-6 animate-fade-up">
                <div className="w-12 h-12 bg-emerald-50 text-[#10B981] rounded-2xl flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Partnership Request Received
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                    We have received your application for **{businessName}**. An Admin representative will review your credit request of **Rs {parseInt(creditRequest).toLocaleString()}** shortly.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRegisterSuccess(false);
                    setMode('login');
                  }}
                  className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border-0 cursor-pointer transition-colors"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="text-center">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Register B2B Partnership
                  </h1>
                  <p className="text-xs text-[#64748B] mt-1">Submit wholesale license detail to establish warehouse links</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmitRegister} className="flex flex-col gap-4 text-xs">
                  
                  {/* Business Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Business Company Name *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Building2 size={14} /></span>
                      <input
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                        placeholder="e.g. Lahore Electronics Hub"
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Owner Contact */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Contact Person Name *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><User size={14} /></span>
                      <input
                        className="w-full pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                        placeholder="e.g. Kashif Raza"
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* License NTN code & Email */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">NTN Code *</label>
                      <input
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                        placeholder="e.g. 772819-A"
                        value={ntnCode}
                        onChange={e => setNtnCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Email address *</label>
                      <input
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                        type="email"
                        placeholder="b2b@company.com"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Warehouse Region & Credit term request */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Primary Depot Link</label>
                      <select 
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                        value={warehouseRegion}
                        onChange={e => setWarehouseRegion(e.target.value)}
                      >
                        <option value="wh-1">Karachi Depot</option>
                        <option value="wh-2">Lahore Depot</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Credit Request (Rs)</label>
                      <input
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors"
                        type="number"
                        value={creditRequest}
                        onChange={e => setCreditRequest(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-lg mt-2 cursor-pointer border-0 shadow-sm transition-all"
                  >
                    Submit B2B Application
                  </button>
                </form>

                <div className="text-center text-xs text-[#64748B] mt-2">
                  Already have a registered account?{' '}
                  <button 
                    onClick={() => setMode('login')}
                    className="font-semibold text-[#4F46E5] hover:underline border-0 bg-transparent cursor-pointer"
                  >
                    Sign In instead
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#94A3B8] pt-2 border-t border-[#E2E8F0] mt-1">
          <Shield size={12} />
          <span>Secured wholesale pipeline · CommerceIQ</span>
        </div>
      </div>
    </div>
  );
}
