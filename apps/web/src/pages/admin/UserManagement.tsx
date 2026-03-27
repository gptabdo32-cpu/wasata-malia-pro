import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Redirect, Link } from "wouter";
import {
  Users,
  Search,
  Shield,
  Ban,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserManagement() {
  const { user, isAuthenticated, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [kycFilter, setKycFilter] = useState<"all" | "verified" | "pending" | "rejected">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  const { data: users, refetch: refetchUsers } = trpc.admin.listUsers.useQuery(
    { search: searchTerm, kycStatus: kycFilter, status: statusFilter },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const suspendMutation = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      toast.success("تم تعليق الحساب بنجاح");
      refetchUsers();
    },
    onError: (err) => {
      toast.error("فشل تعليق الحساب: " + err.message);
    },
  });

  const unsuspendMutation = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => {
      toast.success("تم إعادة تفعيل الحساب بنجاح");
      refetchUsers();
    },
    onError: (err) => {
      toast.error("فشل إعادة التفعيل: " + err.message);
    },
  });

  const approveKycMutation = trpc.admin.approveKyc.useMutation({
    onSuccess: () => {
      toast.success("تم الموافقة على KYC بنجاح");
      refetchUsers();
    },
    onError: (err) => {
      toast.error("فشلت الموافقة: " + err.message);
    },
  });

  const rejectKycMutation = trpc.admin.rejectKyc.useMutation({
    onSuccess: () => {
      toast.success("تم رفض KYC بنجاح");
      refetchUsers();
    },
    onError: (err) => {
      toast.error("فشل الرفض: " + err.message);
    },
  });

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || user?.role !== "admin") return <Redirect to="/" />;

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
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">إدارة المستخدمين</h1>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ابحث عن المستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={kycFilter} onValueChange={(v) => setKycFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="حالة KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="verified">موثق</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="حالة الحساب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="suspended">معلق</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2">
              <Download size={16} />
              تصدير البيانات
            </Button>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100">
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">البريد الإلكتروني</TableHead>
                <TableHead className="text-right">حالة KYC</TableHead>
                <TableHead className="text-right">حالة الحساب</TableHead>
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{u.fullName || "غير محدد"}</TableCell>
                    <TableCell className="text-slate-600">{u.email}</TableCell>
                    <TableCell>{getKycBadge(u.kycStatus)}</TableCell>
                    <TableCell>{getStatusBadge(u.status)}</TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {new Date(u.createdAt).toLocaleDateString("ar-LY")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/users/${u.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-700"
                            title="عرض التفاصيل"
                          >
                            <Eye size={16} />
                          </Button>
                        </Link>

                        {u.kycStatus === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => approveKycMutation.mutate({ userId: u.id })}
                              disabled={approveKycMutation.isPending}
                              title="الموافقة على KYC"
                            >
                              <CheckCircle size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => rejectKycMutation.mutate({ userId: u.id })}
                              disabled={rejectKycMutation.isPending}
                              title="رفض KYC"
                            >
                              <Ban size={16} />
                            </Button>
                          </>
                        )}

                        {u.status === "active" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => suspendMutation.mutate({ userId: u.id })}
                            disabled={suspendMutation.isPending}
                            title="تعليق الحساب"
                          >
                            <Ban size={16} />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => unsuspendMutation.mutate({ userId: u.id })}
                            disabled={unsuspendMutation.isPending}
                            title="إعادة تفعيل الحساب"
                          >
                            <CheckCircle size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    لا توجد نتائج
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
