import { useAuth } from "@/core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Redirect } from "wouter";
import {
  History,
  Shield,
  User,
  Clock,
  Activity,
} from "lucide-react";

export default function AdminLogs() {
  const { user, isAuthenticated, loading } = useAuth();

  const { data: logs } = trpc.admin.listLogs.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || user?.role !== "admin") return <Redirect to="/" />;

  const getActionLabel = (action: string) => {
    switch (action) {
      case "approve_kyc": return "موافقة على توثيق";
      case "reject_kyc": return "رفض توثيق";
      case "suspend_user": return "تعليق حساب";
      case "unsuspend_user": return "تفعيل حساب";
      case "release_funds": return "تحرير أموال";
      case "refund_transaction": return "استرجاع أموال";
      case "resolve_dispute": return "حل نزاع";
      case "send_notification": return "إرسال تنبيه";
      case "send_global_notification": return "إرسال تنبيه عام";
      case "update_settings": return "تحديث الإعدادات";
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("approve") || action.includes("unsuspend") || action.includes("release")) return "text-green-600 bg-green-50";
    if (action.includes("reject") || action.includes("suspend") || action.includes("refund")) return "text-red-600 bg-red-50";
    if (action.includes("notification")) return "text-blue-600 bg-blue-50";
    return "text-slate-600 bg-slate-50";
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <History className="w-8 h-8 text-slate-700" />
          <h1 className="text-3xl font-bold text-slate-900">سجلات المسؤولين</h1>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100">
                <TableHead className="text-right">المسؤول</TableHead>
                <TableHead className="text-right">الإجراء</TableHead>
                <TableHead className="text-right">الهدف</TableHead>
                <TableHead className="text-right">التفاصيل</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-slate-400" />
                        <span className="font-medium">مسؤول #{log.adminId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User size={14} />
                        <span>#{log.targetUserId || log.targetId || "نظام"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md text-slate-600 text-sm">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Clock size={12} />
                        {new Date(log.createdAt).toLocaleString("ar-LY")}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    <Activity className="mx-auto mb-2 opacity-20" />
                    لا توجد سجلات حالياً
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
