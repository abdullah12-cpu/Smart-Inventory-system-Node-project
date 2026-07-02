'use client';
import { PortalType } from '@/lib/data';

interface Props { portal: PortalType; }

export default function LoadingScreen({ portal }: Props) {
  const messages: Record<PortalType, string> = {
    admin: 'Connecting to Admin Command Center...',
    distributor: 'Syncing Distributor Inventory Channels...',
    buyer: 'Securing B2B Purchasing Tunnel...',
  };

  return (
    <div className="fixed inset-0 bg-[#F8FAFC]/95 flex flex-col items-center justify-center z-[100] gap-4">
      {/* Logo pulse */}
      <div className="relative">
        <div className="w-16 h-16 bg-[#4F46E5] rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl animate-pulse-glow"
          style={{ fontFamily: 'Outfit, sans-serif' }}>
          IQ
        </div>
        <div className="absolute inset-0 border-4 border-[#EEF2FF] border-t-[#4F46E5] rounded-full animate-spin scale-150" />
      </div>
      <p className="text-lg font-semibold text-[#0F172A] mt-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {messages[portal]}
      </p>
      <p className="text-sm text-[#64748B]">Setting up your secure workspace…</p>
    </div>
  );
}
