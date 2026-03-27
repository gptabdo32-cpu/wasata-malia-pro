import { useState, useEffect } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { 
  Wallet, 
  Phone, 
  CreditCard, 
  Building2, 
  Zap, 
  Banknote, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

type PaymentMethod = "phone_credit" | "topup_card" | "bank_transfer" | "sadad" | "tadawul" | "edfaali" | "cash";

const COMMISSIONS: Record<PaymentMethod, number> = {
  phone_credit: 0.30, // 30% commission (100 -> 70)
  topup_card: 0.01,   // 1%
  bank_transfer: 0.02, // 2% average
  sadad: 0.01,        // 1%
  tadawul: 0.01,      // 1%
  edfaali: 0.01,      // 1%
  cash: 0.00,         // 0%
};

export default function AdvancedPayment() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("sadad");
  const [amount, setAmount] = useState("");
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"select" | "details" | "confirm" | "success">("select");

  const utils = trpc.useUtils();

  // Real wallet data
  const { data: wallet, isLoading: isLoadingWallet } = trpc.wallet.getBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const depositMutation = trpc.wallet.requestDeposit.useMutation({
    onSuccess: () => {
      setStep("success");
      toast.success("تم تقديم طلب الإيداع بنجاح");
      utils.wallet.getBalance.invalidate();
      utils.wallet.getTransactionHistory.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
      setIsSubmitting(false);
    }
  });

  useEffect(() => {
    const val = parseFloat(amount) || 0;
    const commission = val * COMMISSIONS[selectedMethod];
    setConvertedAmount(val - commission);
  }, [amount, selectedMethod]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="p-8 text-center max-w-md shadow-xl border-t-4 border-blue-600">
          <ShieldCheck className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">يجب تسجيل الدخول</h2>
          <p className="text-slate-600 mb-6">يرجى تسجيل الدخول للوصول إلى صفحة الدفع الآمنة</p>
          <Button onClick={() => setLocation("/")} className="w-full bg-blue-600">العودة للرئيسية</Button>
        </Card>
      </div>
    );
  }

  const handleConfirm = () => {
    setIsSubmitting(true);
    depositMutation.mutate({
      amount: amount,
      paymentMethod: selectedMethod,
      paymentDetails: {
        timestamp: new Date().toISOString(),
        userPhone: user?.phone || "N/A",
      }
    });
  };

  const methods = [
    { id: "phone_credit", name: "رصيد هاتف", icon: Phone, color: "bg-orange-100 text-orange-600", desc: "ليبيانا / المدار" },
    { id: "sadad", name: "سداد (SADAD)", icon: Zap, color: "bg-blue-100 text-blue-600", desc: "محفظة سداد الإلكترونية" },
    { id: "edfaali", name: "إدفعلي", icon: CreditCard, color: "bg-green-100 text-green-600", desc: "مصرف التجارة والتنمية" },
    { id: "tadawul", name: "تداول", icon: CreditCard, color: "bg-purple-100 text-purple-600", desc: "بطاقات تداول" },
    { id: "bank_transfer", name: "تحويل بنكي", icon: Building2, color: "bg-indigo-100 text-indigo-600", desc: "جميع المصارف الليبية" },
    { id: "topup_card", name: "بطاقة تعبئة", icon: CreditCard, color: "bg-pink-100 text-pink-600", desc: "كروت المنصة الخاصة" },
    { id: "cash", name: "كاش / فرع", icon: Banknote, color: "bg-slate-100 text-slate-600", desc: "الدفع في فروعنا" },
  ];

  const currentBalance = parseFloat(wallet?.balance || "0");

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">مركز الدفع الآمن</h1>
            <p className="text-slate-600 mt-1">اشحن محفظتك بكل سهولة وشفافية</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="text-left">
              <p className="text-xs text-slate-500">رصيدك الحالي</p>
              {isLoadingWallet ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <p className="text-xl font-bold text-blue-600">{currentBalance.toFixed(2)} د.ل</p>
              )}
            </div>
            <Wallet className="w-8 h-8 text-blue-600 opacity-20" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { id: "select", label: "الوسيلة" },
            { id: "details", label: "المبلغ" },
            { id: "confirm", label: "التأكيد" },
            { id: "success", label: "النتيجة" }
          ].map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.id ? "bg-blue-600 text-white" : 
                idx < ["select", "details", "confirm", "success"].indexOf(step) ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {idx < ["select", "details", "confirm", "success"].indexOf(step) ? "✓" : idx + 1}
              </div>
              <span className={`text-sm hidden md:block ${step === s.id ? "font-bold text-blue-600" : "text-slate-500"}`}>{s.label}</span>
              {idx < 3 && <div className="flex-1 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        {step === "select" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {methods.map((m) => (
              <Card 
                key={m.id}
                className={`p-6 cursor-pointer transition-all hover:shadow-md border-2 ${selectedMethod === m.id ? "border-blue-600 ring-2 ring-blue-100" : "border-transparent"}`}
                onClick={() => {
                  setSelectedMethod(m.id as PaymentMethod);
                  setStep("details");
                }}
              >
                <div className={`w-12 h-12 rounded-lg ${m.color} flex items-center justify-center mb-4`}>
                  <m.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">{m.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{m.desc}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">عمولة {COMMISSIONS[m.id as PaymentMethod] * 100}%</Badge>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {step === "details" && (
          <Card className="p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="sm" onClick={() => setStep("select")}>← تغيير الوسيلة</Button>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="font-bold">{methods.find(m => m.id === selectedMethod)?.name}</span>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">عمولة {COMMISSIONS[selectedMethod] * 100}%</Badge>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-lg font-bold mb-2 block">المبلغ المراد شحنه (د.ل)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="text-2xl h-16 pr-4 pl-12 font-bold"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <span className="absolute left-4 top-5 text-slate-400 font-bold">د.ل</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex justify-between mb-4">
                  <span className="text-slate-600">المبلغ المدفوع:</span>
                  <span className="font-bold">{parseFloat(amount || "0").toFixed(2)} د.ل</span>
                </div>
                <div className="flex justify-between mb-4 text-red-600">
                  <span className="flex items-center gap-1">العمولة ({COMMISSIONS[selectedMethod] * 100}%): <Info className="w-3 h-3" /></span>
                  <span>- {(parseFloat(amount || "0") * COMMISSIONS[selectedMethod]).toFixed(2)} د.ل</span>
                </div>
                <div className="h-px bg-slate-200 my-4" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">الرصيد النهائي في المحفظة:</span>
                  <span className="text-2xl font-bold text-green-600">{convertedAmount.toFixed(2)} د.ل</span>
                </div>
              </div>

              {selectedMethod === "phone_credit" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>تنبيه هام:</strong> يتم تحويل الرصيد بنسبة (100 إلى 70) حسب أسعار السوق الليبي الحالية. بعد تحويل الرصيد، لا يمكن التراجع عن العملية.
                  </p>
                </div>
              )}

              <Button 
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
                disabled={!amount || parseFloat(amount) <= 0}
                onClick={() => setStep("confirm")}
              >
                متابعة العملية
              </Button>
            </div>
          </Card>
        )}

        {step === "confirm" && (
          <Card className="p-8 shadow-lg border-2 border-blue-100">
            <h2 className="text-2xl font-bold mb-6 text-center">تأكيد عملية الدفع</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between p-4 bg-slate-50 rounded-lg">
                <span className="text-slate-600">وسيلة الدفع:</span>
                <span className="font-bold">{methods.find(m => m.id === selectedMethod)?.name}</span>
              </div>
              <div className="flex justify-between p-4 bg-slate-50 rounded-lg">
                <span className="text-slate-600">المبلغ الإجمالي:</span>
                <span className="font-bold">{amount} د.ل</span>
              </div>
              <div className="flex justify-between p-4 bg-slate-50 rounded-lg">
                <span className="text-slate-600">العمولة المستقطعة:</span>
                <span className="font-bold text-red-600">{(parseFloat(amount) * COMMISSIONS[selectedMethod]).toFixed(2)} د.ل</span>
              </div>
              <div className="flex justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-blue-900 font-bold">الصافي للمحفظة:</span>
                <span className="text-xl font-bold text-blue-600">{convertedAmount.toFixed(2)} د.ل</span>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-8 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-800">
                بالضغط على تأكيد، أنت توافق على شروط الخدمة والعمولات الموضحة. <strong>هذه العملية غير قابلة للإلغاء.</strong>
              </p>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setStep("details")}>تعديل</Button>
              <Button 
                className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700" 
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري المعالجة...
                  </>
                ) : (
                  "تأكيد الدفع الآن"
                )}
              </Button>
            </div>
          </Card>
        )}

        {step === "success" && (
          <Card className="p-12 text-center shadow-xl border-t-8 border-green-500">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold mb-2">تم استلام طلبك!</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              طلب الإيداع الخاص بك قيد المعالجة حالياً. سيتم تحديث رصيدك فور التأكد من وصول المبلغ. يمكنك متابعة حالة الطلب من سجل المعاملات.
            </p>
            <div className="flex flex-col gap-3">
              <Button className="w-full bg-blue-600" onClick={() => setLocation("/dashboard")}>الذهاب للوحة التحكم</Button>
              <Button variant="outline" className="w-full" onClick={() => {
                setStep("select");
                setAmount("");
              }}>إجراء عملية أخرى</Button>
            </div>
          </Card>
        )}

        {/* Footer Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">تشفير كامل</h4>
              <p className="text-xs text-slate-500">جميع بياناتك المالية مشفرة وآمنة تماماً.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Info className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">شفافية تامة</h4>
              <p className="text-xs text-slate-500">لا توجد رسوم مخفية، ترى كل شيء قبل الدفع.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">دعم فني 24/7</h4>
              <p className="text-xs text-slate-500">فريقنا جاهز لمساعدتك في أي وقت.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
