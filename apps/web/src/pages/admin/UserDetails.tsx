import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Redirect, useRoute } from "wouter";
import {
  User,
  Shield,
  Ban,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

export default function UserDetails() {
  const { user: currentUser, isAuthenticated, loading } = useAuth();
  const [, params] = useRoute("/admin/users/:id");
  const userId = params?.id ? parseInt(params.id) : null;

  const { data: user, refetch: refetchUser } = trpc.admin.getUser.useQuery(
    { userId: userId! },
    { enabled: isAuthenticated && currentUser?.role === "admin" && !!userId }
  );

  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      toast.success("تم تعليق الحساب بنجاح");
      refetchUser();
    },
    onError: (err) => {
      toast.error("فشل تعليق الحساب: " + err.message);
    },
  });

  const unsuspendMutation = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => {
      toast.success("تم إعادة تفعيل الحساب بنجاح");
      refetchUser();
    },
    onError: (err) => {
      toast.error("فشل إعادة التفعيل: " + err.message);
    },
  });

  const approveKycMutation = trpc.admin.approveKyc.useMutation({
    onSuccess: () => {
      toast.success("تم الموافقة على KYC بنجاح");
      refetchUser();
    },
    onError: (err) => {
      toast.error("فشلت الموافقة: " + err.message);
    },
  });

  const rejectKycMutation = trpc.admin.rejectKyc.useMutation({
    onSuccess: () => {
      toast.success("تم رفض KYC بنجاح");
      refetchUser();
    },
    onError: (err) => {
      toast.error("فشل الرفض: " + err.message);
    },
  });

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || currentUser?.role !== "admin") return <Redirect to="/" />;
  if (!userId) return <Redirect to="/admin/users" />;
  if (!user) return <div className="p-8 text-center">المستخدم غير موجود</div>;

  const getKycBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle size={14} />
            موثق
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
            <AlertCircle size={14} />
            قيد المراجعة
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
            <Ban size={14} />
            مرفوض
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
            لم يتم التحقق
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
        <CheckCircle size={14} />
        نشط
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
        <Ban size={14} />
        معلق
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowRight className="w-6 h-6" />
            </Button>
            <User className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">تفاصيل المستخدم</h1>
          </div>
          <div className="flex gap-2">
            {user.status === "active" ? (
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => suspendMutation.mutate({ userId: user.id })}
                disabled={suspendMutation.isPending}
              >
                <Ban size={16} />
                تعليق الحساب
              </Button>
            ) : (
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700 gap-2"
                onClick={() => unsuspendMutation.mutate({ userId: user.id })}
                disabled={unsuspendMutation.isPending}
              >
                <CheckCircle size={16} />
                إعادة تفعيل الحساب
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <Card className="p-6 h-fit">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.fullName || ""} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{user.fullName || "غير محدد"}</h2>
              <p className="text-slate-500 text-sm mb-2">{user.email}</p>
              <div className="flex gap-2 mt-2">
                {getStatusBadge(user.status)}
                {getKycBadge(user.kycStatus)}
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={18} className="text-blue-500" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={18} className="text-blue-500" />
                <span className="text-sm">{user.phone || "غير متوفر"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin size={18} className="text-blue-500" />
                <span className="text-sm">{user.city || "غير محدد"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar size={18} className="text-blue-500" />
                <span className="text-sm">انضم في {new Date(user.createdAt).toLocaleDateString("ar-LY")}</span>
              </div>
            </div>
          </Card>

          {/* Details Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* KYC Section */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="text-blue-600" size={20} />
                التحقق من الهوية (KYC)
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">حالة التوثيق</p>
                    {getKycBadge(user.kycStatus)}
                  </div>
                  {user.identityVerifiedAt && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">تاريخ التوثيق</p>
                      <p className="text-sm font-medium">{new Date(user.identityVerifiedAt).toLocaleString("ar-LY")}</p>
                    </div>
                  )}
                </div>

                {user.kycStatus === "pending" && (
                  <div className="flex flex-col gap-3 justify-end">
                    <p className="text-sm text-slate-500 mb-1">إجراءات إدارية</p>
                    <div className="flex gap-2">
                      <Button 
                        className="bg-green-600 hover:bg-green-700 flex-1 gap-2"
                        onClick={() => approveKycMutation.mutate({ userId: user.id })}
                        disabled={approveKycMutation.isPending}
                      >
                        <CheckCircle size={16} />
                        موافقة
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1 gap-2"
                        onClick={() => rejectKycMutation.mutate({ userId: user.id })}
                        disabled={rejectKycMutation.isPending}
                      >
                        <Ban size={16} />
                        رفض
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {user.identityDocumentUrl && (
                <div className="mt-6 border-t pt-6">
                  <p className="text-sm text-slate-500 mb-3">مستند الهوية</p>
                  <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden">
                    <img 
                      src={user.identityDocumentUrl} 
                      alt="Identity Document" 
                      className="max-w-full max-h-full object-contain cursor-pointer"
                      onClick={() => window.open(user.identityDocumentUrl, '_blank')}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Wallet Info (Placeholder) */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CreditCard className="text-green-600" size={20} />
                المحفظة المالية
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">الرصيد المتاح</p>
                  <p className="text-xl font-bold text-slate-900">0.00 ل.د</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">إجمالي الأرباح</p>
                  <p className="text-xl font-bold text-slate-900">0.00 ل.د</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">إجمالي السحوبات</p>
                  <p className="text-xl font-bold text-slate-900">0.00 ل.د</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
