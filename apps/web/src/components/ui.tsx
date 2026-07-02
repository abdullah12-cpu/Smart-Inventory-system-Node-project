'use client';
import React from 'react';
import { StockAlertStatus, ProductStatus, OrderStatus, InvoiceStatus } from '@/lib/data';

interface BadgeProps {
  text: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'blue' | 'gray';
  className?: string;
}

const VARIANT_STYLES = {
  success: 'bg-[#ECFDF5] text-[#10B981]',
  warning: 'bg-[#FEF3C7] text-[#F59E0B]',
  danger: 'bg-[#FEF2F2] text-[#EF4444]',
  info: 'bg-[#EEF2FF] text-[#4F46E5]',
  blue: 'bg-[#EFF6FF] text-[#3B82F6]',
  gray: 'bg-[#F1F5F9] text-[#64748B]',
  neutral: 'bg-[#F8FAFC] text-[#64748B]',
};

export function Badge({ text, variant, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-[4px] leading-none tracking-wide animate-pop-scale ${VARIANT_STYLES[variant]} ${className}`}>
      {text}
    </span>
  );
}

// 1. Stock Alert Status Badge (derived from low_stock_threshold, overstock_threshold, dead_stock_days)
export function StockAlertBadge({ status }: { status: StockAlertStatus }) {
  const mappings: Record<StockAlertStatus, { text: string; variant: keyof typeof VARIANT_STYLES }> = {
    LOW_STOCK: { text: 'LOW STOCK', variant: 'warning' },
    OVERSTOCK: { text: 'OVERSTOCK', variant: 'blue' },
    DEAD_STOCK: { text: 'DEAD STOCK', variant: 'gray' },
    NORMAL: { text: 'NORMAL', variant: 'success' },
  };
  const m = mappings[status] || { text: 'UNKNOWN', variant: 'neutral' };
  return <Badge text={m.text} variant={m.variant} />;
}

// 2. Product Status Badge (ACTIVE / INACTIVE / DISCONTINUED)
export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const mappings: Record<ProductStatus, { text: string; variant: keyof typeof VARIANT_STYLES }> = {
    ACTIVE: { text: 'ACTIVE', variant: 'success' },
    INACTIVE: { text: 'INACTIVE', variant: 'warning' },
    DISCONTINUED: { text: 'DISCONTINUED', variant: 'danger' },
  };
  const m = mappings[status] || { text: 'ACTIVE', variant: 'success' };
  return <Badge text={m.text} variant={m.variant} />;
}

// 3. Order Status Badge (DRAFT | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED | RETURNED)
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const mappings: Record<OrderStatus, { text: string; variant: keyof typeof VARIANT_STYLES }> = {
    DRAFT: { text: 'DRAFT', variant: 'neutral' },
    CONFIRMED: { text: 'CONFIRMED', variant: 'blue' },
    PROCESSING: { text: 'PROCESSING', variant: 'warning' },
    SHIPPED: { text: 'SHIPPED', variant: 'info' },
    DELIVERED: { text: 'DELIVERED', variant: 'success' },
    CANCELLED: { text: 'CANCELLED', variant: 'danger' },
    RETURNED: { text: 'RETURNED', variant: 'gray' },
  };
  return <Badge text={mappings[status]?.text || status} variant={mappings[status]?.variant || 'neutral'} />;
}

// 4. Invoice Status Badge (DRAFT | ISSUED | SENT | PARTIALLY_PAID | PAID | OVERDUE | CLOSED | CANCELLED)
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const mappings: Record<InvoiceStatus, { text: string; variant: keyof typeof VARIANT_STYLES }> = {
    DRAFT: { text: 'DRAFT', variant: 'neutral' },
    ISSUED: { text: 'ISSUED', variant: 'neutral' },
    SENT: { text: 'SENT', variant: 'blue' },
    PARTIALLY_PAID: { text: 'PARTIALLY PAID', variant: 'warning' },
    PAID: { text: 'PAID', variant: 'success' },
    OVERDUE: { text: 'OVERDUE', variant: 'danger' },
    CLOSED: { text: 'CLOSED', variant: 'gray' },
    CANCELLED: { text: 'CANCELLED', variant: 'danger' },
  };
  return <Badge text={mappings[status]?.text || status} variant={mappings[status]?.variant || 'neutral'} />;
}

// 5. Late Payment Probability Badge
export function LatePaymentRiskBadge({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  let variant: keyof typeof VARIANT_STYLES = 'success';
  let label = 'Low Risk';
  if (probability > 0.6) {
    variant = 'danger';
    label = 'High Risk';
  } else if (probability >= 0.3) {
    variant = 'warning';
    label = 'Medium Risk';
  }
  return <Badge text={`${pct}% Risk (${label})`} variant={variant} />;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  extra?: React.ReactNode;
  index: number; // For staggered load animation delay
}

export function KpiCard({ label, value, trend, trendUp, icon, iconBg = '#EEF2FF', iconColor = '#4F46E5', extra, index }: KpiCardProps) {
  const delay = `${index * 50}ms`;
  return (
    <div 
      className="kpi-card bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden animate-fade-up opacity-0"
      style={{ animationDelay: delay, animationFillMode: 'forwards' }}
    >
      <div className="flex justify-between items-center">
        <span className="text-[13px] text-[#64748B] font-medium tracking-wide">{label}</span>
        <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
      <div className="text-[28px] font-bold text-[#0F172A] leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {value}
      </div>
      {trend && (
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${trendUp ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
          {trend}
        </div>
      )}
      {extra}
    </div>
  );
}

// 6. 5-Segment Supplier Reliability Bar
export function ReliabilityRating({ score }: { score: number }) {
  const segments = [1, 2, 3, 4, 5];
  const filled = Math.round(score / 20); // Scale 0-100 to 0-5
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {segments.map(s => (
          <div 
            key={s} 
            className="w-3.5 h-1.5 rounded-sm transition-colors duration-300"
            style={{ 
              backgroundColor: s <= filled 
                ? (score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444')
                : '#E2E8F0' 
            }}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-[#0F172A]">{score}%</span>
    </div>
  );
}
