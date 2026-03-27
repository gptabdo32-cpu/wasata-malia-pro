import { useState } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { DollarSign, ArrowDownLeft, ArrowUpRight, History, AlertCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function WalletManagement() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  
  // Transfer state
  const [transferEmail, setTransferEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const utils = trpc.useUtils();

  // Real data from tRPC
  const { data: wallet, isLoading: isLoadingWallet } = trpc.wallet.getBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: isLoadingTransactions } = trpc.wallet.getTransactionHistory.useQuery(
    { limit: 20 },
    { enabled: isAuthenticated }
  );

  const transferMutation = trpc.wallet.transfer.useMutation({
    onSuccess: () => {
      toast.success("تم التحويل بنجاح");
      setTransferEmail("");
      setTransferAmount("");
      setTransferNote("");
      utils.wallet.getBalance.invalidate();
      utils.wallet.getTransactionHistory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "فشل في إتمام عملية التحويل");
    },
  });

  // التحقق من تسجيل الدخول
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">يجب تسجيل الدخول</h2>
          <p className="text-slate-600 mb-6">يجب عليك تسجيل الدخول للوصول إلى محفظتك</p>
          <Button onClick={() => setLocation("/")} className="w-full">
            العودة للرئيسية
          </Button>
        </Card>
      </div>
    );
  }

  const currentBalance = parseFloat(wallet?.balance || "0");
  const currency = "LYD";

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferEmail || !transferAmount) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (parseFloat(transferAmount) > currentBalance) {
      toast.error("الرصيد غير كافٍ");
      return;
    }

    transferMutation.mutate({
      recipientEmail: transferEmail,
      amount: transferAmount,
      description: transferNote,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">محفظتي</h1>
          <p className="text-blue-100">إدارة رصيدك، الإيداع، السحب، والتحويل بين الحسابات</p>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 mb-2">الرصيد الحالي</p>
              {isLoadingWallet ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : (
                <h2 className="text-5xl font-bold">{currentBalance.toFixed(2)}</h2>
              )}
              <p className="text-blue-100 mt-2">{currency}</p>
            </div>
            <DollarSign className="w-20 h-20 opacity-20" />
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="transfer" className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transfer" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              تحويل داخلي
            </TabsTrigger>
            <TabsTrigger value="deposit" className="flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              إيداع
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              سحب
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              السجل
            </TabsTrigger>
          </TabsList>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900">تحويل إلى حساب آخر</h3>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  بدون عمولة
                </div>
              </div>
              
              <form onSubmit={handleTransfer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-email" className="text-slate-700 font-semibold">
                      البريد الإلكتروني للمستلم
                    </Label>
                    <Input
                      id="transfer-email"
                      type="email"
                      placeholder="example@email.com"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-amount" className="text-slate-700 font-semibold">
                      المبلغ ({currency})
                    </Label>
                    <div className="relative">
                      <Input
                        id="transfer-amount"
                        type="number"
                        placeholder="0.00"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        step="0.01"
                        min="0.01"
                        className="pl-12"
                        required
                      />
                      <span className="absolute left-4 top-3 text-slate-500">{currency}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-note" className="text-slate-700 font-semibold">
                    ملاحظة (اختياري)
                  </Label>
                  <Input
                    id="transfer-note"
                    placeholder="مثلاً: دفعة مقابل خدمة..."
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600">
                    <strong>تنبيه:</strong> يرجى التأكد من البريد الإلكتروني للمستلم بدقة. عمليات التحويل الداخلي فورية ولا يمكن التراجع عنها.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={transferMutation.isPending}
                >
                  {transferMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري التحويل...
                    </>
                  ) : (
                    "إتمام التحويل"
                  )}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Deposit Tab */}
          <TabsContent value="deposit">
            <Card className="p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">إضافة أموال إلى محفظتك</h3>
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600">
                    <strong>ملاحظة:</strong> يتم معالجة طلبات الإيداع عبر مركز الدفع المطور الخاص بنا.
                  </p>
                </div>

                <Button 
                  type="button" 
                  size="lg" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setLocation("/payment")}
                >
                  انتقل لمركز الدفع المطور
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw">
            <Card className="p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">سحب الأموال من محفظتك</h3>
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600">
                    <strong>ملاحظة:</strong> يتم معالجة طلبات السحب خلال 1-3 أيام عمل.
                  </p>
                </div>

                <Button 
                  type="button" 
                  size="lg" 
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={() => setLocation("/wallet")} // Should point to a withdrawal form if exists
                >
                  طلب سحب (قريباً)
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">سجل المعاملات</h3>
              
              {isLoadingTransactions ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                </div>
              ) : !transactions || transactions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">لا توجد معاملات حتى الآن</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 font-semibold text-slate-600">التاريخ</th>
                        <th className="pb-4 font-semibold text-slate-600">الوصف</th>
                        <th className="pb-4 font-semibold text-slate-600">النوع</th>
                        <th className="pb-4 font-semibold text-slate-600">المبلغ</th>
                        <th className="pb-4 font-semibold text-slate-600">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {transactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 text-slate-600">
                            {format(new Date(tx.createdAt), "yyyy-MM-dd")}
                          </td>
                          <td className="py-4 text-slate-900 font-medium">{tx.description}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              tx.type === "deposit" ? "bg-green-100 text-green-700" : 
                              tx.type === "transfer" ? "bg-blue-100 text-blue-700" :
                              "bg-orange-100 text-orange-700"
                            }`}>
                              {tx.type === "deposit" ? "إيداع" : 
                               tx.type === "transfer" ? "تحويل" : "سحب"}
                            </span>
                          </td>
                          <td className={`py-4 font-bold ${
                            tx.type === "deposit" || (tx.type === "transfer" && tx.description.includes("من")) 
                            ? "text-green-600" : "text-red-600"
                          }`}>
                            {tx.type === "deposit" || (tx.type === "transfer" && tx.description.includes("من")) ? "+" : "-"}
                            {parseFloat(tx.amount).toFixed(2)} {currency}
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              tx.status === "completed" ? "bg-green-100 text-green-700" : 
                              tx.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {tx.status === "completed" ? "مكتمل" : 
                               tx.status === "pending" ? "قيد الانتظار" : "فاشل"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
