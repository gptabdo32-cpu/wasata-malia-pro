import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Redirect } from "wouter";
import {
  Gavel,
  Search,
  Eye,
  CheckCircle,
  Clock,
  MessageSquare,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type DisputeStatus = "open" | "under_review" | "resolved" | "closed";
type ResolutionDecision = "buyer" | "seller";

type AdminDisputeMessage = {
  id: number;
  senderName: string;
  message: string;
  createdAt: string | Date;
};

type AdminDisputeEvidence = {
  id: number;
  fileUrl: string;
  fileType: "image" | "video" | "document";
  description: string | null;
  uploaderName: string;
  createdAt: string | Date;
};

type AdminDisputeRow = {
  id: number;
  escrowId: number;
  title: string;
  amount: string;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  buyerId: number | null;
  sellerId: number | null;
  buyerName: string;
  sellerName: string;
  buyerEmail: string | null;
  sellerEmail: string | null;
  messages: AdminDisputeMessage[];
  evidence: AdminDisputeEvidence[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

function formatCurrency(amount: string | number) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("ar-LY", {
    style: "currency",
    currency: "LYD",
  }).format(Number.isFinite(value) ? value : 0);
}

function getEvidenceLabel(item: AdminDisputeEvidence, index: number) {
  return item.description || item.fileUrl.split("/").pop() || `ملف #${item.id ?? index + 1}`;
}

export default function DisputeManagement() {
  const { user, isAuthenticated, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "under_review" | "resolved" | "closed">("all");
  const [selectedDispute, setSelectedDispute] = useState<AdminDisputeRow | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [resolutionDecision, setResolutionDecision] = useState<ResolutionDecision>("buyer");

  const { data: disputes, refetch: refetchDisputes } = trpc.admin.listDisputes.useQuery(
    { search: searchTerm },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const disputeRows = useMemo(() => (disputes ?? []) as AdminDisputeRow[], [disputes]);

  const resolveMutation = trpc.admin.resolveDispute.useMutation({
    onSuccess: () => {
      toast.success("تم حل النزاع بنجاح");
      void refetchDisputes();
      setSelectedDispute(null);
      setResolutionText("");
    },
    onError: (err: unknown) => {
      toast.error(`فشل حل النزاع: ${err instanceof Error ? err.message : "خطأ غير معروف"}`);
    },
  });

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || user?.role !== "admin") return <Redirect to="/" />;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
            <AlertCircle size={14} />
            مفتوح
          </span>
        );
      case "under_review":
      case "in_review":
        return (
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
            <Clock size={14} />
            قيد المراجعة
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
            <CheckCircle size={14} />
            مُحل
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
            غير محدد
          </span>
        );
    }
  };

  const handleResolve = () => {
    if (!selectedDispute) return;
    if (!resolutionText.trim()) {
      toast.error("يجب إدخال تفاصيل الحل");
      return;
    }

    resolveMutation.mutate({
      disputeId: selectedDispute.id,
      resolutionText,
      decision: resolutionDecision,
    });
  };

  const visibleDisputes = statusFilter === "all"
    ? disputeRows
    : disputeRows.filter((row) => row.status === statusFilter);

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Gavel className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-slate-900">إدارة النزاعات</h1>
        </div>

        <Card className="p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ابحث عن النزاع..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="حالة النزاع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="open">مفتوح</SelectItem>
                <SelectItem value="under_review">قيد المراجعة</SelectItem>
                <SelectItem value="resolved">مُحل</SelectItem>
                <SelectItem value="closed">مغلق</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100">
                <TableHead className="text-right">معرّف النزاع</TableHead>
                <TableHead className="text-right">المشتري</TableHead>
                <TableHead className="text-right">البائع</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">السبب</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleDisputes.length > 0 ? (
                visibleDisputes.map((dispute) => (
                  <TableRow key={dispute.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">#{dispute.id}</TableCell>
                    <TableCell className="text-slate-600">{dispute.buyerName}</TableCell>
                    <TableCell className="text-slate-600">{dispute.sellerName}</TableCell>
                    <TableCell className="font-bold text-slate-900">{formatCurrency(dispute.amount)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-slate-600 text-sm">{dispute.reason}</TableCell>
                    <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => setSelectedDispute(dispute)}
                          title="عرض التفاصيل"
                        >
                          <Eye size={16} />
                        </Button>

                        {dispute.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-purple-600 hover:text-purple-700"
                            onClick={() => setSelectedDispute(dispute)}
                            title="حل النزاع"
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
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    لا توجد نزاعات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={Boolean(selectedDispute)} onOpenChange={(open: boolean) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl font-arabic" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل النزاع #{selectedDispute?.id}</DialogTitle>
            <DialogDescription>عرض وحل النزاع بين المشتري والبائع</DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4 bg-slate-50">
                  <p className="text-sm text-slate-600 mb-1">المشتري</p>
                  <p className="font-bold text-slate-900">{selectedDispute.buyerName}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedDispute.buyerEmail}</p>
                </Card>

                <Card className="p-4 bg-slate-50">
                  <p className="text-sm text-slate-600 mb-1">البائع</p>
                  <p className="font-bold text-slate-900">{selectedDispute.sellerName}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedDispute.sellerEmail}</p>
                </Card>

                <Card className="p-4 bg-slate-50">
                  <p className="text-sm text-slate-600 mb-1">المبلغ</p>
                  <p className="font-bold text-slate-900">{formatCurrency(selectedDispute.amount)}</p>
                </Card>

                <Card className="p-4 bg-slate-50">
                  <p className="text-sm text-slate-600 mb-1">الحالة</p>
                  {getStatusBadge(selectedDispute.status)}
                </Card>
              </div>

              <Card className="p-4 bg-amber-50 border-amber-200">
                <p className="text-sm text-slate-600 mb-2 flex items-center gap-2">
                  <AlertCircle size={16} />
                  سبب النزاع
                </p>
                <p className="text-slate-900">{selectedDispute.reason}</p>
              </Card>

              {selectedDispute.evidence.length > 0 && (
                <Card className="p-4">
                  <p className="text-sm text-slate-600 mb-3 flex items-center gap-2">
                    <FileText size={16} />
                    الأدلة المرفوعة
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedDispute.evidence.map((evidenceItem, index) => (
                      <div
                        key={evidenceItem.id}
                        className="p-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 truncate"
                      >
                        {getEvidenceLabel(evidenceItem, index)}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {selectedDispute.messages.length > 0 && (
                <Card className="p-4">
                  <p className="text-sm text-slate-600 mb-3 flex items-center gap-2">
                    <MessageSquare size={16} />
                    المحادثات الموثقة
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedDispute.messages.map((msg) => (
                      <div key={msg.id} className="p-2 bg-slate-50 rounded text-xs">
                        <p className="font-bold text-slate-900">{msg.senderName}</p>
                        <p className="text-slate-600">{msg.message}</p>
                        <p className="text-slate-400 text-xs mt-1">
                          {new Date(msg.createdAt).toLocaleString("ar-LY")}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {selectedDispute.status !== "resolved" && (
                <Card className="p-4 border-green-200 bg-green-50">
                  <p className="text-sm text-slate-600 mb-3 font-bold">حل النزاع</p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-900 mb-2 block">القرار</label>
                      <Select value={resolutionDecision} onValueChange={(v: string) => setResolutionDecision(v as ResolutionDecision)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buyer">
                            <span className="flex items-center gap-2">
                              <CheckCircle size={14} className="text-green-600" />
                              لصالح المشتري
                            </span>
                          </SelectItem>
                          <SelectItem value="seller">
                            <span className="flex items-center gap-2">
                              <CheckCircle size={14} className="text-blue-600" />
                              لصالح البائع
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-900 mb-2 block">تفاصيل الحل</label>
                      <Textarea
                        placeholder="اشرح قرارك وتفاصيل الحل..."
                        value={resolutionText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResolutionText(e.target.value)}
                        className="min-h-24"
                      />
                    </div>

                    <Button
                      onClick={handleResolve}
                      disabled={resolveMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {resolveMutation.isPending ? "جاري الحفظ..." : "حفظ الحل"}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
