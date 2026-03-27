import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Redirect } from "wouter";
import {
  Settings,
  Save,
  Globe,
  ShieldCheck,
  CreditCard,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function SettingsManagement() {
  const { user, isAuthenticated, loading } = useAuth();
  
  const { data: settings, refetch: refetchSettings } = trpc.admin.getSettings.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const updateSettingsMutation = trpc.admin.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات بنجاح");
      refetchSettings();
    },
    onError: (err) => {
      toast.error("فشل حفظ الإعدادات: " + err.message);
    },
  });

  const [formData, setFormData] = useState({
    platformName: "",
    platformDescription: "",
    contactEmail: "",
    supportPhone: "",
    escrowCommissionPercentage: "",
    productCommissionPercentage: "",
    minWithdrawalAmount: "",
    isRegistrationEnabled: true,
    isEscrowEnabled: true,
    isProductMarketplaceEnabled: true,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        platformName: settings.platformName || "",
        platformDescription: settings.platformDescription || "",
        contactEmail: settings.contactEmail || "",
        supportPhone: settings.supportPhone || "",
        escrowCommissionPercentage: settings.escrowCommissionPercentage || "2.5",
        productCommissionPercentage: settings.productCommissionPercentage || "5.0",
        minWithdrawalAmount: settings.minWithdrawalAmount || "10.0",
        isRegistrationEnabled: settings.isRegistrationEnabled ?? true,
        isEscrowEnabled: settings.isEscrowEnabled ?? true,
        isProductMarketplaceEnabled: settings.isProductMarketplaceEnabled ?? true,
      });
    }
  }, [settings]);

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || user?.role !== "admin") return <Redirect to="/" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-900">إعدادات المنصة</h1>
          </div>
          <Button 
            onClick={handleSubmit} 
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={updateSettingsMutation.isPending}
          >
            <Save size={18} />
            {updateSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* General Settings */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6 text-blue-700 border-b pb-4">
                <Globe size={20} />
                <h2 className="text-xl font-bold">الإعدادات العامة</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">اسم المنصة</label>
                  <Input 
                    value={formData.platformName}
                    onChange={(e) => setFormData({...formData, platformName: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">وصف المنصة</label>
                  <Textarea 
                    className="min-h-[100px]"
                    value={formData.platformDescription}
                    onChange={(e) => setFormData({...formData, platformDescription: e.target.value})}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Mail size={14} /> بريد التواصل
                    </label>
                    <Input 
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Phone size={14} /> رقم الدعم
                    </label>
                    <Input 
                      value={formData.supportPhone}
                      onChange={(e) => setFormData({...formData, supportPhone: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Financial Settings */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6 text-green-700 border-b pb-4">
                <CreditCard size={20} />
                <h2 className="text-xl font-bold">الإعدادات المالية والعمولات</h2>
              </div>
              
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">عمولة نظام الضمان (%)</label>
                    <Input 
                      type="number"
                      step="0.1"
                      value={formData.escrowCommissionPercentage}
                      onChange={(e) => setFormData({...formData, escrowCommissionPercentage: e.target.value})}
                    />
                    <p className="text-xs text-slate-500">النسبة التي يتم اقتطاعها من صفقات الضمان.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">عمولة المنتجات الرقمية (%)</label>
                    <Input 
                      type="number"
                      step="0.1"
                      value={formData.productCommissionPercentage}
                      onChange={(e) => setFormData({...formData, productCommissionPercentage: e.target.value})}
                    />
                    <p className="text-xs text-slate-500">النسبة التي يتم اقتطاعها من مبيعات المتجر.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">الحد الأدنى للسحب (ل.د)</label>
                  <Input 
                    type="number"
                    value={formData.minWithdrawalAmount}
                    onChange={(e) => setFormData({...formData, minWithdrawalAmount: e.target.value})}
                  />
                </div>
              </div>
            </Card>

            {/* Feature Toggles */}
            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6 text-purple-700 border-b pb-4">
                <ShieldCheck size={20} />
                <h2 className="text-xl font-bold">إدارة ميزات المنصة</h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                  <div>
                    <p className="font-bold text-slate-900">التسجيل الجديد</p>
                    <p className="text-xs text-slate-500">تفعيل أو تعطيل تسجيل حسابات جديدة.</p>
                  </div>
                  <Switch 
                    checked={formData.isRegistrationEnabled}
                    onCheckedChange={(checked) => setFormData({...formData, isRegistrationEnabled: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                  <div>
                    <p className="font-bold text-slate-900">نظام الضمان</p>
                    <p className="text-xs text-slate-500">تفعيل أو تعطيل إنشاء صفقات ضمان جديدة.</p>
                  </div>
                  <Switch 
                    checked={formData.isEscrowEnabled}
                    onCheckedChange={(checked) => setFormData({...formData, isEscrowEnabled: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                  <div>
                    <p className="font-bold text-slate-900">سوق المنتجات</p>
                    <p className="text-xs text-slate-500">تفعيل أو تعطيل بيع المنتجات الرقمية.</p>
                  </div>
                  <Switch 
                    checked={formData.isProductMarketplaceEnabled}
                    onCheckedChange={(checked) => setFormData({...formData, isProductMarketplaceEnabled: checked})}
                  />
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4 bg-blue-50 border-blue-200 flex items-start gap-3">
            <CheckCircle2 className="text-blue-600 shrink-0 mt-1" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-bold mb-1">تذكير:</p>
              <p>يتم تطبيق التغييرات فور حفظها. بعض الإعدادات قد تؤثر على تجربة المستخدمين الحاليين والعمليات المالية القائمة.</p>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
