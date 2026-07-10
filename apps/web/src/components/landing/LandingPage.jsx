import { useState, useEffect } from "react";
import { 
  motion, 
  useScroll, 
  useSpring, 
  useReducedMotion 
} from "framer-motion";
import {
  ArrowRight,
  Landmark,
  Warehouse,
  Sparkles,
  TrendingUp,
  Database,
  Shield,
  Menu,
  X,
  FileText,
  Users,
  GitCompare
} from "lucide-react";

export default function LandingPage({ onGetStarted, onRegisterClick }) {
  const shouldReduceMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Monitor scroll for navbar styles
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll Progress indicator
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Stagger animation definitions
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { type: "spring", stiffness: 100, damping: 15 }
        }
      };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#0F172A] flex flex-col font-sans overflow-x-hidden relative selection:bg-[#4F46E5] selection:text-white">
      
      {/* Physics-based Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-[#4F46E5] z-[9999] origin-left"
        style={{ scaleX }}
      />

      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85vw] h-[65vh] bg-gradient-to-b from-[#4F46E5]/5 via-[#38BDF8]/2 to-transparent rounded-full blur-[110px] pointer-events-none z-0" />

      {/* Sticky Navigation Bar */}
      <motion.header
        initial={shouldReduceMotion ? { y: 0 } : { y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`h-16 border-b border-[#E2E8F0] flex items-center justify-between px-6 sm:px-16 z-50 sticky top-0 transition-all ${
          isScrolled ? "bg-white/85 backdrop-blur-md shadow-xs" : "bg-white/70 backdrop-blur-md"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-[0_4px_12px_rgba(79,70,229,0.2)] shrink-0"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            IQ
          </div>
          <div>
            <div
              className="text-[#0F172A] font-extrabold text-base tracking-tight leading-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              CommerceIQ
            </div>
            <div className="text-[8px] text-[#4F46E5] font-extrabold tracking-widest uppercase mt-0.5">
              Inventory & Orders
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={onGetStarted}
            className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors bg-transparent border-0 cursor-pointer relative py-1 group"
          >
            Sign In
            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#4F46E5] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
          </button>
          <motion.button
            whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
            onClick={onRegisterClick}
            className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-full transition-all duration-200 shadow-sm cursor-pointer border-0"
          >
            Apply B2B Account
          </motion.button>
        </div>

        {/* Hamburger Menu Icon (Mobile) */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-[#64748B] hover:text-[#0F172A] transition-colors bg-transparent border-0 cursor-pointer"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </motion.header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex justify-end">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)} />
          <motion.div
            initial={shouldReduceMotion ? { x: 0 } : { x: "100%" }}
            animate={{ x: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="relative w-64 max-w-sm bg-white h-full shadow-xl flex flex-col p-6 gap-6 z-50 border-l border-[#E2E8F0]"
          >
            <div className="flex justify-end">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-[#64748B] hover:text-[#0F172A] transition-colors bg-transparent border-0 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4 mt-4">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onGetStarted();
                }}
                className="text-left py-3 px-4 text-sm font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8F9FC] rounded-xl transition-all border-0 bg-transparent cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onRegisterClick();
                }}
                className="w-full text-center py-3 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold rounded-full transition-all border-0 cursor-pointer shadow-sm"
              >
                Apply B2B Account
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-6 text-center max-w-4xl mx-auto flex flex-col items-center gap-6 mt-4">
        {/* Animated Badge */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
          className="inline-flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] px-4 py-1.5 rounded-full text-[10px] font-semibold text-[#4F46E5] uppercase tracking-widest"
        >
          <motion.div
            animate={shouldReduceMotion ? {} : { opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-amber-500 font-bold"
          >
            ★
          </motion.div>
          <span>Multi-Warehouse Inventory & PKR Ledger System</span>
        </motion.div>

        {/* Staggered Headline */}
        <h1
          className="text-4xl sm:text-[56px] font-black text-[#0F172A] leading-tight tracking-tight mt-1 flex flex-col items-center"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <motion.span
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="block text-[#0F172A]"
          >
            Warehouse Stock for
          </motion.span>
          <motion.span
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="block bg-gradient-to-r from-[#4F46E5] via-[#38BDF8] to-[#06B6D4] bg-clip-text text-transparent mt-1"
            style={{
              backgroundSize: "200% auto",
              backgroundImage: "linear-gradient(to right, #4F46E5 0%, #38BDF8 50%, #06B6D4 100%)"
            }}
          >
            B2B Businesses
          </motion.span>
        </h1>

        {/* Subtext Paragraph */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-sm sm:text-base text-[#64748B] max-w-2xl leading-relaxed mt-2"
        >
          CommerceIQ tracks product quantities across multiple warehouses, checks payment deadlines, and logs mobile wallet and bank transfer payments.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="flex flex-col sm:flex-row gap-4 mt-4"
        >
          {/* Primary CTA */}
          <motion.button
            whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -2 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
            onClick={onGetStarted}
            className="group flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs px-6 py-3.5 rounded-full transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer border-0"
          >
            Launch Interactive Demo
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
          </motion.button>

          {/* Secondary CTA */}
          <motion.button
            whileHover={shouldReduceMotion ? {} : { scale: 1.03, backgroundColor: "#EEF2FF" }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
            onClick={onRegisterClick}
            className="bg-white border border-[#E2E8F0] text-[#4F46E5] font-bold text-xs px-6 py-3.5 rounded-full transition-all cursor-pointer shadow-sm hover:border-[#C7D2FE]"
          >
            Register B2B Account
          </motion.button>
        </motion.div>
      </section>

      {/* Feature Cards Strip */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="relative z-10 max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full"
      >
        {[
          {
            icon: <Database size={16} />,
            title: "Multi-Warehouse",
            desc: "Stock updates across all warehouses."
          },
          {
            icon: <Landmark size={16} />,
            title: "Mobile Wallet Payments",
            desc: "Instant payment confirmations."
          },
          {
            icon: <TrendingUp size={16} />,
            title: "Multiple Price Tiers",
            desc: "Retail, Distributor, VIP pricing structures."
          },
          {
            icon: <Shield size={16} />,
            title: "Security Logging",
            desc: "Every action is logged for safety."
          }
        ].map((feat, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={shouldReduceMotion ? {} : { y: -4, shadow: "md" }}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col gap-3 hover:border-[#C7D2FE] transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold">
              {feat.icon}
            </div>
            <h3 className="text-[16px] font-bold text-[#0F172A] mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              {feat.title}
            </h3>
            <p className="text-[14px] text-[#64748B] leading-relaxed">
              {feat.desc}
            </p>
          </motion.div>
        ))}
      </motion.section>

      {/* "Designed for B2B Wholesale Commerce" Section */}
      <section className="bg-white border-t border-b border-[#E2E8F0] py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
          className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-6"
        >
          <motion.h2
            variants={itemVariants}
            className="text-2xl sm:text-[32px] font-extrabold text-[#0F172A] tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Designed for B2B Wholesale Commerce
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-sm text-[#64748B] max-w-2xl leading-relaxed"
          >
            Track stock levels, payment due dates, and user roles. No setup required.
          </motion.p>

          {/* Secondary Supporting Grid */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mt-6 text-left"
          >
            {[
              {
                icon: <GitCompare size={16} className="text-[#4F46E5]" />,
                title: "Warehouse Sync",
                desc: "Automatic sync across all warehouse locations."
              },
              {
                icon: <FileText size={16} className="text-[#4F46E5]" />,
                title: "PKR Ledgers",
                desc: "Tracks your balance and outstanding payments."
              },
              {
                icon: <Users size={16} className="text-[#4F46E5]" />,
                title: "Role Policies",
                desc: "Access tiers for admins, buyers, and distributors."
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-[#F8F9FC] border border-[#E2E8F0] rounded-xl p-5 flex flex-col gap-2 hover:border-[#C7D2FE] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <h4 className="text-xs font-bold text-[#0F172A]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {item.title}
                  </h4>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F8F9FC] py-8 border-t border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-4">
          {/* Footer Minimal Links */}
          <div className="flex items-center gap-6 text-xs text-[#64748B]">
            <a href="#" className="hover:text-[#0F172A] transition-colors font-medium">Products</a>
            <a href="#" className="hover:text-[#0F172A] transition-colors font-medium">Company</a>
            <a href="#" className="hover:text-[#0F172A] transition-colors font-medium">Legal</a>
          </div>
          {/* Copyright */}
          <p className="text-[11px] text-[#64748B] text-center leading-normal">
            © 2026 CommerceIQ. Created for B2B Inventory Management & Ledgers.
          </p>
        </div>
      </footer>

      {/* Embedded CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-shimmer {
          animation: shimmer 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
