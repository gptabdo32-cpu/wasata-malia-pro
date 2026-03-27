import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link, Redirect } from "wouter";
import {
  BarChart3,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { TrustBadge } from "@/components/TrustBadge";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { TransactionStepper } from "@/components/TransactionStepper";


export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  const { data: wallet } = trpc.wallet.getBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: stats } = trpc.user.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: myTransactions } = trpc.escrow.listMyTransactions.useQuery(
    { limit: 5 },
    { enabled: isAuthenticated }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background py-8 font-arabic">
      <div className="container">
        {/* Header with Privacy Toggle */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground">مرحباً، {user?.name}</h1>
              {stats?.isTrustedSeller && (
                <TrustBadge 
                  level="gold" 
                  stats={{ 
                    successRate: 98, 
                    responseTime: "5 دقائق", 
                    totalTransactions: stats.totalReviews + 12 
                  }} 
                />
              )}
            </div>
            <p className="text-muted-foreground">إدارة حسابك والمعاملات الخاصة بك بأمان وثقة</p>
          </div>
          <PrivacyToggle />
        </div>

        {/* Active Transaction Stepper (Example for the latest pending transaction) */}
        {myTransactions && myTransactions.length > 0 && !["completed", "cancelled", "refunded"].includes(myTransactions[0].status) && (
          <Card className="mb-8 p-6 border-blue-100 bg-blue-50/30">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="text-blue-500" size={20} />
              متابعة آخر صفقة: {myTransactions[0].title}
            </h3>
            <TransactionStepper currentStep={myTransactions[0].status === 'draft' ? 1 : 2} />
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {user?.userType !== "buyer" && (
            <Button asChild className="h-auto flex-col items-start p-4 bg-blue-600 hover:bg-blue-700 shadow-lg transition-all hover:-translate-y-1">
              <Link href="/create-transaction">
                <Plus className="w-5 h-5 mb-2" />
                <span className="font-bold">إنشاء صفقة جديدة</span>
                <span className="text-[10px] opacity-80">ابدأ معاملة وساطة آمنة الآن</span>
              </Link>
            </Button>
          )}
          {user?.userType !== "seller" && (
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4 border-2 hover:border-blue-500 transition-all hover:-translate-y-1">
              <Link href="/products">
                <ShoppingCart className="w-5 h-5 mb-2 text-blue-600" />
                <span className="font-bold">تصفح المنتجات</span>
                <span className="text-[10px] text-muted-foreground">اكتشف البطاقات والخدمات الرقمية</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="h-auto flex-col items-start p-4 border-2 hover:border-purple-500 transition-all hover:-translate-y-1">
            <Link href="/messaging">
              <MessageSquare className="w-5 h-5 mb-2 text-purple-600" />
              <span className="font-bold">الدردشات</span>
              <span className="text-[10px] text-muted-foreground">تواصل آمن وموثق</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col items-start p-4 border-2 hover:border-slate-500 transition-all hover:-translate-y-1">
            <Link href="/profile">
              <BarChart3 className="w-5 h-5 mb-2 text-slate-600" />
              <span className="font-bold">الملف الشخصي</span>
              <span className="text-[10px] text-muted-foreground">تعديل بياناتك ومتابعة تقييمك</span>
            </Link>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 hover:shadow-md transition-shadow border-r-4 border-r-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">الرصيد الحالي</p>
                <p className="text-3xl font-bold text-foreground balance-amount">{wallet?.balance || "0"}</p>
                <p className="text-xs text-muted-foreground mt-2">دينار ليبي</p>
              </div>
              <Wallet className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow border-r-4 border-r-green-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">إجمالي الأرباح</p>
                <p className="text-3xl font-bold text-foreground balance-amount">{stats?.totalEarned || "0"}</p>
                <p className="text-xs text-muted-foreground mt-2">دينار ليبي</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow border-r-4 border-r-amber-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">التقييم العام</p>
                <p className="text-3xl font-bold text-foreground">{(stats?.averageRating ?? 0).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-2">من {stats?.totalReviews} مراجعة</p>
              </div>
              <BarChart3 className="w-8 h-8 text-amber-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow border-r-4 border-r-purple-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">حالة الحساب</p>
                {stats?.isTrustedSeller ? (
                  <div className="flex items-center gap-1 text-green-600 font-bold">
                    <ShieldCheck size={16} />
                    <span>موثق</span>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">حساب عادي</p>
                )}
                <Button
                  asChild
                  size="sm"
                  variant="link"
                  className="mt-2 p-0 h-auto text-blue-600"
                >
                  <Link href="/trusted-seller">
                    {stats?.isTrustedSeller ? "إدارة التوثيق" : "طلب توثيق الآن"}
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">آخر الصفقات</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/transactions">
                    عرض الكل
                    <ArrowRight className="w-4 h-4 mr-2" />
                  </Link>
                </Button>
              </div>

              {myTransactions && myTransactions.length > 0 ? (
                <div className="space-y-4">
                  {myTransactions.map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-blue-200 hover:bg-blue-50/10 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.status === "completed" ? "bg-green-100" : "bg-amber-100"
                        }`}>
                          {transaction.status === "completed" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{transaction.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleDateString("ar-LY")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground balance-amount">{transaction.amount} ل.د</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          transaction.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {transaction.status === "completed" ? "مكتملة" : "قيد التنفيذ"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">لا توجد صفقات نشطة حالياً</p>
                  <Button asChild>
                    <Link href="/create-transaction">ابدأ أول صفقة الآن</Link>
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Wallet Summary */}
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-br from-white to-slate-50">
              <h3 className="text-lg font-bold text-foreground mb-4">إدارة الأموال</h3>

              <div className="space-y-4">
                <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <p className="text-xs text-muted-foreground mb-1">الرصيد القابل للسحب</p>
                  <p className="text-2xl font-bold text-blue-600 balance-amount">{wallet?.balance || "0"} ل.د</p>
                </div>

                <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <p className="text-xs text-muted-foreground mb-1">في انتظار التأكيد</p>
                  <p className="text-2xl font-bold text-amber-600 balance-amount">{wallet?.pendingBalance || "0"} ل.د</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button asChild className="w-full bg-blue-600">
                    <Link href="/wallet">إيداع</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-2">
                    <Link href="/withdraw">سحب</Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Trust Info Card */}
            <Card className="p-6 border-amber-100 bg-amber-50/20">
              <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                <ShieldCheck size={16} />
                نصيحة الأمان
              </h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                لا تقم أبداً بتحرير الأموال قبل التأكد من استلام المنتج أو الخدمة بشكل كامل ومطابق للمواصفات.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
