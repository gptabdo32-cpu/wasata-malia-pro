import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Redirect } from "wouter";
import {
  Package,
  Search,
  CheckCircle,
  XCircle,
  ExternalLink,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ProductManagement() {
  const { user, isAuthenticated, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products, refetch: refetchProducts } = trpc.admin.listProducts.useQuery(
    { search: searchTerm },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const toggleStatusMutation = trpc.admin.toggleProductStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة المنتج بنجاح");
      refetchProducts();
    },
    onError: (err) => {
      toast.error("فشل تحديث حالة المنتج: " + err.message);
    },
  });

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || user?.role !== "admin") return <Redirect to="/" />;

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Package className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">إدارة المنتجات الرقمية</h1>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-8">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              placeholder="ابحث عن منتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </Card>

        {/* Products Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100">
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">البائع</TableHead>
                <TableHead className="text-right">السعر</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && products.length > 0 ? (
                products.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.thumbnailUrl ? (
                          <img src={p.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover border" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                            <Package size={16} className="text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium">{p.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">
                        <Tag size={12} />
                        {p.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">بائع #{p.sellerId}</TableCell>
                    <TableCell className="font-bold text-blue-600">{p.price} ل.د</TableCell>
                    <TableCell>
                      {p.isActive ? (
                        <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                          <CheckCircle size={14} /> نشط
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs font-bold flex items-center gap-1">
                          <XCircle size={14} /> معطل
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className={p.isActive ? "text-red-600 border-red-100 hover:bg-red-50" : "text-green-600 border-green-100 hover:bg-green-50"}
                          onClick={() => toggleStatusMutation.mutate({ productId: p.id, isActive: !p.isActive })}
                          disabled={toggleStatusMutation.isPending}
                        >
                          {p.isActive ? "تعطيل" : "تفعيل"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-slate-400" title="معاينة">
                          <ExternalLink size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    لا توجد منتجات مطابقة
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
