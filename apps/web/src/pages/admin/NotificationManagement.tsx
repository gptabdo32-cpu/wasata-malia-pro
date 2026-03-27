import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Redirect } from "wouter";
import {
  Bell,
  Send,
  Users,
  User,
  Info,
  Megaphone,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NotificationManagement() {
  const { user, isAuthenticated, loading } = useAuth();
  
  // Single user notification state
  const [userId, setUserId] = useState("");
  const [singleTitle, setSingleTitle] = useState("");
  const [singleMessage, setSingleMessage] = useState("");
  const [singleType, setSingleType] = useState<"system" | "marketing" | "transaction" | "dispute">("system");

  // Global notification state
  const [globalTitle, setGlobalTitle] = useState("");
  const [globalMessage, setGlobalMessage] = useState("");
  const [globalType, setGlobalType] = useState<"system" | "marketing">("system");

  const sendSingleMutation = trpc.admin.sendNotification.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال التنبيه بنجاح");
      setUserId("");
      setSingleTitle("");
      setSingleMessage("");
    },
    onError: (err) => {
      toast.error("فشل إرسال التنبيه: " + err.message);
    },
  });

  const sendGlobalMutation = trpc.admin.sendGlobalNotification.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال التنبيه العام بنجاح لجميع المستخدمين");
      setGlobalTitle("");
      setGlobalMessage("");
    },
    onError: (err) => {
      toast.error("فشل إرسال التنبيه العام: " + err.message);
    },
  });

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || user?.role !== "admin") return <Redirect to="/" />;

  const handleSendSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !singleTitle || !singleMessage) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    sendSingleMutation.mutate({
      userId: parseInt(userId),
      title: singleTitle,
      message: singleMessage,
      type: singleType,
    });
  };

  const handleSendGlobal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalTitle || !globalMessage) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    sendGlobalMutation.mutate({
      title: globalTitle,
      message: globalMessage,
      type: globalType,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Bell className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-slate-900">إدارة التنبيهات</h1>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 max-w-md mx-auto">
            <TabsTrigger value="single" className="gap-2">
              <User size={16} />
              تنبيه فردي
            </TabsTrigger>
            <TabsTrigger value="global" className="gap-2">
              <Users size={16} />
              تنبيه عام
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Card className="max-w-2xl mx-auto p-8">
              <div className="flex items-center gap-2 mb-6 text-indigo-700">
                <Info size={20} />
                <h2 className="text-xl font-bold">إرسال تنبيه لمستخدم محدد</h2>
              </div>
              
              <form onSubmit={handleSendSingle} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">معرف المستخدم (User ID)</label>
                  <Input 
                    type="number" 
                    placeholder="مثال: 123" 
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">نوع التنبيه</label>
                  <Select value={singleType} onValueChange={(v) => setSingleType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">نظام</SelectItem>
                      <SelectItem value="transaction">معاملة</SelectItem>
                      <SelectItem value="dispute">نزاع</SelectItem>
                      <SelectItem value="marketing">تسويق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">عنوان التنبيه</label>
                  <Input 
                    placeholder="أدخل عنواناً واضحاً..." 
                    value={singleTitle}
                    onChange={(e) => setSingleTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">نص التنبيه</label>
                  <Textarea 
                    placeholder="أكتب محتوى التنبيه هنا..." 
                    className="min-h-[150px]"
                    value={singleMessage}
                    onChange={(e) => setSingleMessage(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
                  disabled={sendSingleMutation.isPending}
                >
                  <Send size={18} />
                  {sendSingleMutation.isPending ? "جاري الإرسال..." : "إرسال التنبيه"}
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="global">
            <Card className="max-w-2xl mx-auto p-8 border-orange-100 bg-orange-50/10">
              <div className="flex items-center gap-2 mb-6 text-orange-700">
                <Megaphone size={20} />
                <h2 className="text-xl font-bold">إرسال تنبيه عام (لجميع المستخدمين)</h2>
              </div>

              <div className="mb-6 p-4 bg-orange-100 text-orange-800 rounded-lg text-sm flex gap-3">
                <Info className="shrink-0 mt-0.5" size={18} />
                <p>تنبيه: سيصل هذا الإشعار إلى جميع المستخدمين المسجلين في المنصة. يرجى التأكد من صحة المعلومات قبل الإرسال.</p>
              </div>
              
              <form onSubmit={handleSendGlobal} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">تصنيف التنبيه العام</label>
                  <Select value={globalType} onValueChange={(v) => setGlobalType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">تحديث النظام / صيانة</SelectItem>
                      <SelectItem value="marketing">عرض جديد / تسويق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">عنوان التنبيه العام</label>
                  <Input 
                    placeholder="مثال: تحديث جديد في شروط الاستخدام" 
                    value={globalTitle}
                    onChange={(e) => setGlobalTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">نص التنبيه العام</label>
                  <Textarea 
                    placeholder="أكتب محتوى التنبيه الذي سيظهر لجميع المستخدمين..." 
                    className="min-h-[150px]"
                    value={globalMessage}
                    onChange={(e) => setGlobalMessage(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-orange-600 hover:bg-orange-700 gap-2"
                  disabled={sendGlobalMutation.isPending}
                >
                  <Send size={18} />
                  {sendGlobalMutation.isPending ? "جاري الإرسال للجميع..." : "إرسال للكل"}
                </Button>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
