import { useState } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  ShoppingCart,
  Store,
  Users,
  ArrowRight,
  CheckCircle,
  Zap,
  TrendingUp,
  Shield,
} from "lucide-react";

export default function SelectUserType() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<"buyer" | "seller" | "both" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mutation to update user type
  const updateUserType = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      // Redirect based on selected type
      if (selectedType === "buyer") {
        setLocation("/products");
      } else if (selectedType === "seller") {
        setLocation("/dashboard");
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: any) => {
      alert(`خطأ: ${error.message}`);
      setIsLoading(false);
    },
  });

  const handleSelectType = async (type: "buyer" | "seller" | "both") => {
    setSelectedType(type);
    setIsLoading(true);
    try {
      await updateUserType.mutateAsync({ userType: type });
    } catch (err) {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 font-arabic" dir="rtl">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            اختر نوع حسابك
          </h1>
          <p className="text-lg text-muted-foreground">
            اختر ما يناسبك لتبدأ رحلتك معنا في عالم التجارة الآمنة
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Buyer Option */}
          <Card
            onClick={() => !isLoading && handleSelectType("buyer")}
            className={`p-8 cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 ${
              selectedType === "buyer"
                ? "border-blue-600 bg-blue-50"
                : "border-transparent hover:border-blue-200"
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6">
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-2">مشتري</h3>
              <p className="text-muted-foreground mb-6">
                ابحث عن المنتجات والخدمات وشتري بأمان وثقة
              </p>

              {/* Features */}
              <div className="space-y-3 mb-8 text-right w-full">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">تصفح آلاف المنتجات</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">حماية كاملة للمشتري</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">وساطة آمنة للأموال</span>
                </div>
              </div>

              <Button
                onClick={() => !isLoading && handleSelectType("buyer")}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading && selectedType === "buyer" ? "جاري التحديث..." : "اختر كمشتري"}
              </Button>
            </div>
          </Card>

          {/* Seller Option */}
          <Card
            onClick={() => !isLoading && handleSelectType("seller")}
            className={`p-8 cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 md:scale-105 relative ${
              selectedType === "seller"
                ? "border-green-600 bg-green-50"
                : "border-transparent hover:border-green-200"
            }`}
          >
            <div className="absolute -top-3 right-6 bg-green-600 text-white px-4 py-1 rounded-full text-sm font-bold">
              الأكثر شهرة
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
                <Store className="w-8 h-8 text-green-600" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-2">تاجر</h3>
              <p className="text-muted-foreground mb-6">
                بع منتجاتك وخدماتك لآلاف المشترين بأمان
              </p>

              {/* Features */}
              <div className="space-y-3 mb-8 text-right w-full">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">لوحة تحكم احترافية</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">أدوات بيع متقدمة</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">دعم 24/7 للتجار</span>
                </div>
              </div>

              <Button
                onClick={() => !isLoading && handleSelectType("seller")}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading && selectedType === "seller" ? "جاري التحديث..." : "اختر كتاجر"}
              </Button>
            </div>
          </Card>

          {/* Both Option */}
          <Card
            onClick={() => !isLoading && handleSelectType("both")}
            className={`p-8 cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 ${
              selectedType === "both"
                ? "border-purple-600 bg-purple-50"
                : "border-transparent hover:border-purple-200"
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-purple-600" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-2">الاثنان معاً</h3>
              <p className="text-muted-foreground mb-6">
                كن مشتري وتاجر في نفس الوقت واستفد من كل المميزات
              </p>

              {/* Features */}
              <div className="space-y-3 mb-8 text-right w-full">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">مميزات المشتري والتاجر</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">مرونة كاملة</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">أرباح إضافية</span>
                </div>
              </div>

              <Button
                onClick={() => !isLoading && handleSelectType("both")}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isLoading && selectedType === "both" ? "جاري التحديث..." : "اختر الاثنان"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Comparison Table */}
        <Card className="p-8 mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">مقارنة المميزات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="px-4 py-3 font-bold text-foreground">المميزة</th>
                  <th className="px-4 py-3 font-bold text-center">مشتري</th>
                  <th className="px-4 py-3 font-bold text-center">تاجر</th>
                  <th className="px-4 py-3 font-bold text-center">الاثنان</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3">تصفح المنتجات</td>
                  <td className="px-4 py-3 text-center">✓</td>
                  <td className="px-4 py-3 text-center">✓</td>
                  <td className="px-4 py-3 text-center">✓</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3">الشراء الآمن</td>
                  <td className="px-4 py-3 text-center">✓</td>
                  <td className="px-4 py-3 text-center">✓</td>
                  <td className="px-4 py-3 text-center">✓</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3">بيع المنتجات</td>
                  <td className="px-4 py-3 text-center">✗</td>
                  <td className="px-4 py-3 text-center">✓</td>
                  <td className="px-4 py-3 text-center">✓</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3">لوحة التحكم</td>
                  <td className="px-4 py-3 text-center">✗</td>
                  <td className="px-4 py-3 text-center">✓</td>
                  <td className="px-4 py-3 text-center">✓</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3">إحصائيات المبيعات</td>
                  <td className="px-4 py-3 text-center">✗</td>
                  <td className="px-4 py-3 text-center">✓</td>
                  <td className="px-4 py-3 text-center">✓</td>
                </tr>
                <tr className="hover:bg-muted/50">
                  <td className="px-4 py-3">الدعم الأولوي</td>
                  <td className="px-4 py-3 text-center">✗</td>
                  <td className="px-4 py-3 text-center">✓</td>
                  <td className="px-4 py-3 text-center">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Info Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-4">
              <Zap className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-foreground mb-2">سريع وسهل</h3>
                <p className="text-sm text-muted-foreground">
                  ابدأ الآن بنقرة واحدة وغير رأيك في أي وقت
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-foreground mb-2">آمن وموثوق</h3>
                <p className="text-sm text-muted-foreground">
                  حسابك محمي بأحدث تقنيات الأمان
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-purple-50 border-purple-200">
            <div className="flex items-start gap-4">
              <TrendingUp className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-foreground mb-2">نمو مستمر</h3>
                <p className="text-sm text-muted-foreground">
                  زيادة أرباحك وتوسيع نطاق عملك
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
