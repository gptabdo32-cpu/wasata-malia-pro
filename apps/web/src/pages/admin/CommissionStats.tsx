import { useAuth } from "@/core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Redirect } from "wouter";
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

export default function CommissionStats() {
  const { user, isAuthenticated, loading } = useAuth();

  const { data: stats } = trpc.admin.getCommissionStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || user?.role !== "admin") return <Redirect to="/" />;

  const statCards = [
    {
      label: "إجمالي أرباح المنصة",
      value: `${stats?.totalRevenue || 0} ل.د`,
      icon: DollarSign,
      color: "bg-green-100 text-green-700",
      description: "صافي العمولات من جميع العمليات",
    },
    {
      label: "عمولات الضمان",
      value: `${stats?.escrowRevenue || 0} ل.د`,
      icon: ShieldCheck,
      color: "bg-blue-100 text-blue-700",
      description: "إجمالي العمولات من صفقات الضمان",
    },
    {
      label: "عمولات المتجر",
      value: `${stats?.productRevenue || 0} ل.د`,
      icon: ShoppingBag,
      color: "bg-purple-100 text-purple-700",
      description: "إجمالي العمولات من بيع المنتجات",
    },
    {
      label: "إجمالي المبالغ المتداولة",
      value: `${stats?.totalVolume || 0} ل.د`,
      icon: TrendingUp,
      color: "bg-orange-100 text-orange-700",
      description: "إجمالي قيمة الصفقات المنفذة",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <PieChart className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">العمولات والأرباح</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((card, idx) => (
            <Card key={idx} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <card.icon size={24} />
                </div>
                <ArrowUpRight className="text-slate-300" size={20} />
              </div>
              <p className="text-slate-500 text-sm mb-1">{card.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{card.value}</h3>
              <p className="text-xs text-slate-400">{card.description}</p>
            </Card>
          ))}
        </div>

        {/* Financial Breakdown */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Wallet className="text-indigo-600" />
              توزيع المحافظ والسيولة
            </h2>
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border">
                <span className="text-slate-600">إجمالي أرصدة المستخدمين</span>
                <span className="font-bold text-slate-900">{stats?.totalUserBalance || 0} ل.د</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border">
                <span className="text-slate-600">إجمالي المبالغ المعلقة (Pending)</span>
                <span className="font-bold text-slate-900">{stats?.totalPendingBalance || 0} ل.د</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border">
                <span className="text-slate-600">إجمالي السحوبات المنفذة</span>
                <span className="font-bold text-slate-900">{stats?.totalWithdrawn || 0} ل.د</span>
              </div>
            </div>
          </Card>

          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="text-blue-600" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">تحليل النمو</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              سيتم إضافة رسوم بيانية تفصيلية لتحليل نمو الأرباح والعمولات بشكل شهري وأسبوعي في التحديث القادم.
            </p>
            <Button variant="outline" className="gap-2">
              تصدير التقرير المالي
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
