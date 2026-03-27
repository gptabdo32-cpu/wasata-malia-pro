import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Redirect, useRoute, Link } from "wouter";
import {
  DollarSign,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Package,
  Calendar,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export default function TransactionDetails() {
  const { user: currentUser, isAuthenticated, loading } = useAuth();
  const [, params] = useRoute("/admin/transactions/:id");
  const transactionId = params?.id ? parseInt(params.id) : null;

  const { data: tx, refetch: refetchTx } = trpc.admin.getTransaction.useQuery(
    { transactionId: transactionId! },
    { enabled: isAuthenticated && currentUser?.role === "admin" && !!transactionId }
  );

  const releaseFundsMutation = trpc.admin.releaseFunds.useMutation({
    onSuccess: () => {
      toast.success("تم تحرير الأموال بنجاح");
      refetchTx();
    },
    onError: (err) => {
      toast.error("فشل تحرير الأموال: " + err.message);
    },
  });

  const refundMutation = trpc.admin.refundTransaction.useMutation({
    onSuccess: () => {
      toast.success("تم استرجاع الأموال بنجاح");
      refetchTx();
    },
    onError: (err) => {
      toast.error("فشل استرجاع الأموال: " + err.message);
    },
  });

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || currentUser?.role !== "admin") return <Redirect to="/" />;
  if (!transactionId) return <Redirect to="/admin/transactions" />;
  if (!tx) return <div className="p-8 text-center">المعاملة غير موجودة</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
            <Clock size={14} />
            قيد الانتظار
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle size={14} />
            مكتملة
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
            <XCircle size={14} />
            ملغاة
          </span>
        );
      case "disputed":
        return (
          <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
            <AlertCircle size={14} />
            نزاع مفتوح
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-LY", {
      style: "currency",
      currency: "LYD",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowRight className="w-6 h-6" />
            </Button>
            <DollarSign className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-slate-900">تفاصيل المعاملة #{tx.id}</h1>
          </div>
          {tx.status === "pending" && (
            <div className="flex gap-2">
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700 gap-2"
                onClick={() => releaseFundsMutation.mutate({ transactionId: tx.id })}
                disabled={releaseFundsMutation.isPending}
              >
                <CheckCircle size={16} />
                تحرير الأموال
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => refundMutation.mutate({ transactionId: tx.id })}
                disabled={refundMutation.isPending}
              >
                <XCircle size={16} />
                استرجاع الأموال
              </Button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-4">
                <Package className="text-blue-600" size={20} />
                معلومات الصفقة
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">عنوان الصفقة</p>
                    <p className="text-lg font-bold text-slate-900">{tx.title || "بدون عنوان"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">المبلغ الإجمالي</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(tx.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">حالة المعاملة</p>
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">تاريخ الإنشاء</p>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar size={16} className="text-slate-400" />
                      <span>{new Date(tx.createdAt).toLocaleString("ar-LY")}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">طريقة الدفع</p>
                    <p className="font-medium text-slate-900">رصيد المحفظة</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">معرف المعاملة الموحد</p>
                    <p className="font-mono text-xs bg-slate-100 p-1 rounded inline-block">#{tx.id}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t">
                <p className="text-sm text-slate-500 mb-2">وصف الخدمة/المنتج</p>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                  {tx.description || "لا يوجد وصف متوفر لهذه المعاملة."}
                </p>
              </div>
            </Card>

            {/* Escrow Protection Info */}
            <Card className="p-6 border-blue-100 bg-blue-50/30">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-800">
                <ShieldCheck size={20} />
                نظام حماية وثّقلي (Escrow)
              </h3>
              <p className="text-sm text-blue-700 leading-relaxed">
                هذه المعاملة محمية بواسطة نظام وثّقلي. الأموال محجوزة حالياً في حساب الوسيط ولا يتم تحريرها للبائع إلا بعد تأكيد المشتري للاستلام أو تدخل الإدارة في حالة النزاع.
              </p>
            </Card>
          </div>

          {/* Sidebar Info: Parties */}
          <div className="space-y-8">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <User className="text-slate-600" size={20} />
                أطراف المعاملة
              </h3>
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">المشتري</span>
                    <Link href={`/admin/users/${tx.buyerId}`}>
                      <a className="text-xs text-blue-600 hover:underline">عرض الملف</a>
                    </Link>
                  </div>
                  <p className="font-bold text-slate-900">{tx.buyerName || `مستخدم #${tx.buyerId}`}</p>
                  <p className="text-xs text-slate-500">{tx.buyerEmail}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase">البائع</span>
                    <Link href={`/admin/users/${tx.sellerId}`}>
                      <a className="text-xs text-blue-600 hover:underline">عرض الملف</a>
                    </Link>
                  </div>
                  <p className="font-bold text-slate-900">{tx.sellerName || `مستخدم #${tx.sellerId}`}</p>
                  <p className="text-xs text-slate-500">{tx.sellerEmail}</p>
                </div>
              </div>
            </Card>

            {/* Timeline or Logs (Simplified) */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="text-slate-600" size={20} />
                سجل الأحداث
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium">تم إنشاء الطلب</p>
                    <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString("ar-LY")}</p>
                  </div>
                </div>
                {tx.status === "completed" && (
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium">تم إكمال المعاملة</p>
                      <p className="text-xs text-slate-500">تم تحرير الأموال بنجاح</p>
                    </div>
                  </div>
                )}
                {tx.status === "cancelled" && (
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium">تم إلغاء المعاملة</p>
                      <p className="text-xs text-slate-500">تم استرجاع الأموال للمشتري</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
