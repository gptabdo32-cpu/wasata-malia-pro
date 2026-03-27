import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { 
  Wallet, 
  Send, 
  Receipt, 
  ShieldCheck, 
  Smartphone, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft,
  Zap,
  Lock,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "../components/ui/skeleton";

/**
 * Wathiqly ID & Pay Wallet Dashboard
 * Main UI for P2P transfers, bill payments, and identity status
 */
const WalletID: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [transferPhone, setTransferPhone] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [billProvider, setBillProvider] = useState("libyana");
  const [billIdentifier, setBillIdentifier] = useState("");
  const [billAmount, setBillAmount] = useState("");

  // TRPC Queries & Mutations
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = trpc.wallet.getBalance.useQuery();
  const { data: userProfile } = trpc.user.getProfile.useQuery();
  
  const sendMoneyMutation = trpc.walletId.sendMoney.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إرسال ${data.amount} د.ل بنجاح برقم مرجعي: ${data.reference}`);
      setTransferPhone("");
      setTransferAmount("");
      refetchWallet();
    },
    onError: (err) => {
      toast.error(err.message || "فشلت عملية التحويل");
    }
  });

  const payBillMutation = trpc.walletId.payBill.useMutation({
    onSuccess: (data) => {
      toast.success(`تم دفع الفاتورة لشركة ${data.provider} بنجاح.`);
      setBillIdentifier("");
      setBillAmount("");
      refetchWallet();
    },
    onError: (err) => {
      toast.error(err.message || "فشلت عملية دفع الفاتورة");
    }
  });

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferPhone || !transferAmount) return;
    sendMoneyMutation.mutate({
      receiverPhone: transferPhone,
      amount: transferAmount,
    });
  };

  const handlePayBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billIdentifier || !billAmount) return;
    payBillMutation.mutate({
      provider: billProvider as any,
      billIdentifier,
      amount: billAmount,
    });
  };

  if (walletLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8" dir="rtl">
      {/* Wallet Overview Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              محفظة وثّقلي الرقمية
            </CardTitle>
            <CardDescription>إدارة أموالك ومدفوعاتك في مكان واحد</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">الرصيد المتاح</p>
                <h2 className="text-4xl font-black text-primary">
                  {wallet?.balance || "0.00"} <span className="text-lg font-normal">د.ل</span>
                </h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                  <ArrowDownLeft className="w-4 h-4" /> إيداع
                </Button>
                <Button variant="outline" className="gap-2">
                  <ArrowUpRight className="w-4 h-4" /> سحب
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
              <ShieldCheck className="w-5 h-5" />
              الهوية الرقمية الموثقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">حالة التوثيق:</span>
                <Badge variant={userProfile?.isIdentityVerified ? "default" : "destructive"}>
                  {userProfile?.isIdentityVerified ? "موثق بالكامل" : "غير موثق"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">مستوى التحقق:</span>
                <span className="font-bold">Lvl {userProfile?.verificationLevel || 0}</span>
              </div>
              <Button size="sm" variant="outline" className="w-full gap-2 mt-2">
                <ExternalLink className="w-4 h-4" /> إدارة الهوية الموحدة (SSO)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto mb-8">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="p2p">تحويل P2P</TabsTrigger>
          <TabsTrigger value="bills">دفع فواتير</TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("p2p")}>
              <CardHeader>
                <Send className="w-8 h-8 text-blue-500 mb-2" />
                <CardTitle>تحويل فوري (P2P)</CardTitle>
                <CardDescription>أرسل الأموال لأي مستخدم برقم هاتفه</CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("bills")}>
              <CardHeader>
                <Smartphone className="w-8 h-8 text-orange-500 mb-2" />
                <CardTitle>دفع الفواتير</CardTitle>
                <CardDescription>ليبيانا، المدار، انترنت، وكهرباء</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <Lock className="w-8 h-8 text-purple-500 mb-2" />
                <CardTitle>بوابة الهوية</CardTitle>
                <CardDescription>استخدم حسابك للدخول للمواقع الأخرى</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        {/* P2P Transfer Tab */}
        <TabsContent value="p2p">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>تحويل أموال فوري</CardTitle>
              <CardDescription>أرسل الأموال بأمان وسرعة إلى مستخدمي وثّقلي الآخرين</CardDescription>
            </CardHeader>
            <form onSubmit={handleTransfer}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم هاتف المستلم</Label>
                  <Input 
                    id="phone" 
                    placeholder="091XXXXXXX" 
                    value={transferPhone}
                    onChange={(e) => setTransferPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ (د.ل)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="0.00" 
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-3 text-sm text-blue-800">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>سيتم التحقق من هوية المستلم قبل إتمام العملية. تأكد من إدخال الرقم الصحيح.</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full gap-2" disabled={sendMoneyMutation.isPending}>
                  {sendMoneyMutation.isPending ? "جاري التحويل..." : "إرسال الآن"}
                  <Send className="w-4 h-4" />
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Bill Payment Tab */}
        <TabsContent value="bills">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>دفع الفواتير والخدمات</CardTitle>
              <CardDescription>اختر الخدمة وأدخل بيانات الدفع</CardDescription>
            </CardHeader>
            <form onSubmit={handlePayBill}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>مزود الخدمة</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["libyana", "almadar", "ltt", "gecol", "water_auth", "government"].map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={billProvider === p ? "default" : "outline"}
                        className="text-xs capitalize"
                        onClick={() => setBillProvider(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billId">رقم الهاتف / رقم الحساب</Label>
                  <Input 
                    id="billId" 
                    placeholder="رقم المشترك" 
                    value={billIdentifier}
                    onChange={(e) => setBillIdentifier(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billAmount">المبلغ</Label>
                  <Input 
                    id="billAmount" 
                    type="number" 
                    placeholder="0.00" 
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full gap-2" variant="secondary" disabled={payBillMutation.isPending}>
                  <Zap className="w-4 h-4" />
                  {payBillMutation.isPending ? "جاري المعالجة..." : "دفع الفاتورة"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                سجل العمليات المالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>لا توجد عمليات حديثة للعرض.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WalletID;
