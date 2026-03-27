import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrustBadgeProps {
  level: 'bronze' | 'silver' | 'gold' | 'diamond';
  stats: {
    successRate: number;
    responseTime: string;
    totalTransactions: number;
  };
}

const badgeConfig = {
  bronze: { color: 'text-orange-600', bg: 'bg-orange-100', icon: Shield, label: 'برونزي' },
  silver: { color: 'text-slate-400', bg: 'bg-slate-100', icon: ShieldCheck, label: 'فضي' },
  gold: { color: 'text-yellow-500', bg: 'bg-yellow-100', icon: ShieldCheck, label: 'ذهبي' },
  diamond: { color: 'text-blue-500', bg: 'bg-blue-100', icon: ShieldCheck, label: 'ماسي' },
};

export const TrustBadge: React.FC<TrustBadgeProps> = ({ level, stats }) => {
  const config = badgeConfig[level];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${config.bg} ${config.color} cursor-help transition-all hover:scale-105`}>
            <Icon size={16} />
            <span className="text-xs font-bold font-arabic">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="w-64 p-4 font-arabic text-right">
          <div className="space-y-2">
            <h4 className="font-bold border-b pb-1">بطاقة الموثوقية</h4>
            <div className="flex justify-between text-sm">
              <span>نسبة النجاح:</span>
              <span className="font-bold text-green-600">{stats.successRate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>سرعة الرد:</span>
              <span className="font-bold">{stats.responseTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>إجمالي العمليات:</span>
              <span className="font-bold">{stats.totalTransactions}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              هذا البائع موثق من قبل نظام واثق لي لضمان جودة التعاملات.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
