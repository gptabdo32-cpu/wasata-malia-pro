import React from 'react';
import { Shield, ShieldCheck, Star, Award, TrendingUp, AlertCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeData {
  id: number;
  badgeType: string;
  issuedAt: string;
}

interface TrustScoreProps {
  score: number;
  stats: {
    successfulTransactions: number;
    totalTransactions: number;
    kycLevel: number;
  };
  badges: BadgeData[];
}

const badgeMap: Record<string, { label: string, icon: any, color: string }> = {
  trusted_seller: { label: "بائع موثوق", icon: ShieldCheck, color: "bg-green-100 text-green-700 border-green-200" },
  excellent_buyer: { label: "مشتري ممتاز", icon: Star, color: "bg-blue-100 text-blue-700 border-blue-200" },
  kyc_verified: { label: "هوية موثقة", icon: Shield, color: "bg-purple-100 text-purple-700 border-purple-200" },
  golden_member: { label: "عضو ذهبي", icon: Award, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  fast_responder: { label: "استجابة سريعة", icon: TrendingUp, color: "bg-orange-100 text-orange-700 border-orange-200" },
};

export const SocialTrustScore: React.FC<TrustScoreProps> = ({ score, stats, badges }) => {
  const getScoreColor = (s: number) => {
    if (s >= 90) return "text-green-600";
    if (s >= 70) return "text-blue-600";
    if (s >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="w-full font-arabic text-right overflow-hidden border-2 border-primary/10">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex justify-between items-center flex-row-reverse">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            نظام الثقة الاجتماعي
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle size={16} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">يتم حساب الدرجة بناءً على المعاملات الموثقة والتحقق من الهوية.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Score Display */}
        <div className="text-center space-y-2">
          <div className={`text-4xl font-black ${getScoreColor(score)}`}>
            {score.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground font-medium">درجة الموثوقية الحالية</div>
          <Progress value={score} className="h-2 mt-4" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-sm font-bold">{stats.successfulTransactions}</div>
            <div className="text-[10px] text-muted-foreground">عمليات ناجحة</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-sm font-bold">{stats.totalTransactions}</div>
            <div className="text-[10px] text-muted-foreground">إجمالي العمليات</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-sm font-bold">{stats.kycLevel === 2 ? 'كامل' : 'جزئي'}</div>
            <div className="text-[10px] text-muted-foreground">توثيق الهوية</div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="space-y-3">
          <div className="text-sm font-bold flex items-center gap-2 flex-row-reverse">
            <Award size={16} className="text-primary" />
            الأوسمة والشارات
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {badges.length > 0 ? (
              badges.map((badge) => {
                const config = badgeMap[badge.badgeType] || { label: badge.badgeType, icon: Award, color: "bg-gray-100" };
                const Icon = config.icon;
                return (
                  <Badge key={badge.id} variant="outline" className={`${config.color} flex items-center gap-1 py-1 px-2`}>
                    <Icon size={12} />
                    {config.label}
                  </Badge>
                );
              })
            ) : (
              <div className="text-xs text-muted-foreground italic">لا توجد أوسمة حالياً</div>
            )}
          </div>
        </div>

        {/* Benefits Info */}
        {score >= 85 && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-800 flex items-start gap-2 flex-row-reverse">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            <div>
              <strong>أنت مستخدم موثوق!</strong> تستفيد حالياً من رسوم وساطة مخفضة (2%) وأولوية في معالجة الطلبات.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
