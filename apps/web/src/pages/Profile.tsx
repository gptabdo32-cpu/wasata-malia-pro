import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, MapPin, Mail, Phone, Shield, Fingerprint } from "lucide-react";
import { SocialTrustScore } from "@/components/SocialTrustScore";
import { Redirect } from "wouter";

export default function Profile() {
  const { user, isAuthenticated, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    bio: "",
    city: "",
    phone: "",
    userType: user?.userType || "buyer",
  });

  const { data: profile } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: stats } = trpc.user.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const safeStats = stats ?? {
    balance: "0",
    totalEarned: "0",
    totalWithdrawn: "0",
    averageRating: 0,
    totalReviews: 0,
    isTrustedSeller: false,
  };

  const { data: trustData } = trpc.trust.getTrustProfile.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  useEffect(() => {
    if (!profile) return;
    setFormData({
      name: profile.name || "",
      bio: profile.bio || "",
      city: profile.city || "",
      phone: profile.phone || "",
      userType: profile.userType || "buyer",
    });
  }, [profile]);

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الملف الشخصي بنجاح");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ في تحديث الملف الشخصي");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    if (value !== "buyer" && value !== "seller" && value !== "both") return;
    setFormData((prev) => ({ ...prev, userType: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{user?.name}</h1>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                  {safeStats.isTrustedSeller && (
                    <span className="badge-trusted">
                      <Shield className="w-3 h-3" />
                      تاجر موثوق
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "إلغاء" : "تعديل الملف"}
            </Button>
          </div>
        </div>

        {/* Trust Score & Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-1">
            {trustData && (
              <SocialTrustScore 
                score={parseFloat(trustData.score.currentScore as string)}
                stats={{
                  successfulTransactions: trustData.score.successfulTransactionsCount || 0,
                  totalTransactions: trustData.score.totalTransactionsCount || 0,
                  kycLevel: user?.verificationLevel || 0
                }}
                badges={trustData.badges as any}
              />
            )}
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">الرصيد الحالي</p>
              <p className="text-2xl font-bold text-primary">{safeStats.balance} ل.د</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">إجمالي الأرباح</p>
              <p className="text-2xl font-bold text-green-600">{safeStats.totalEarned} ل.د</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">إجمالي السحب</p>
              <p className="text-2xl font-bold text-blue-600">{safeStats.totalWithdrawn} ل.د</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">التقييم</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-amber-500">{safeStats.averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({safeStats.totalReviews})</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Profile Form */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6 text-foreground">معلومات الملف الشخصي</h2>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="form-group">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="أدخل اسمك الكامل"
                  className="form-input"
                />
              </div>

              {/* Bio */}
              <div className="form-group">
                <Label htmlFor="bio">السيرة الذاتية</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="أخبرنا عن نفسك (اختياري)"
                  className="form-textarea"
                  rows={4}
                />
              </div>

              {/* User Type */}
              <div className="form-group">
                <Label htmlFor="userType">نوع المستخدم</Label>
                <Select value={formData.userType} onValueChange={handleSelectChange}>
                  <SelectTrigger className="form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">مشتري فقط</SelectItem>
                    <SelectItem value="seller">بائع فقط</SelectItem>
                    <SelectItem value="both">بائع ومشتري</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="form-group">
                <Label htmlFor="city">المدينة</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="أدخل مدينتك"
                  className="form-input"
                />
              </div>

              {/* Phone */}
              <div className="form-group">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+218 XXX XXX XXX"
                  className="form-input"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Display Mode */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الاسم الكامل</p>
                  <p className="text-foreground font-medium">{formData.name || "لم يتم تعيينه"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">نوع المستخدم</p>
                  <p className="text-foreground font-medium">
                    {formData.userType === "buyer"
                      ? "مشتري"
                      : formData.userType === "seller"
                        ? "بائع"
                        : "بائع ومشتري"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">البريد الإلكتروني</p>
                  <p className="text-foreground font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">رقم الهاتف</p>
                  <p className="text-foreground font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {formData.phone || "لم يتم تعيينه"}
                  </p>
                </div>
              </div>

              {formData.city && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">المدينة</p>
                  <p className="text-foreground font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {formData.city}
                  </p>
                </div>
              )}

              {formData.bio && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">السيرة الذاتية</p>
                  <p className="text-foreground">{formData.bio}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Account Settings */}
        <Card className="p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6 text-foreground">إعدادات الحساب</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
              <div>
                <p className="font-medium text-foreground">التحقق من البريد الإلكتروني</p>
                <p className="text-sm text-muted-foreground">
                  {user?.isEmailVerified ? "تم التحقق" : "لم يتم التحقق"}
                </p>
              </div>
              {!user?.isEmailVerified && <Button size="sm">تحقق الآن</Button>}
            </div>

            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
              <div>
                <p className="font-medium text-foreground">التحقق من رقم الهاتف</p>
                <p className="text-sm text-muted-foreground">
                  {user?.isPhoneVerified ? "تم التحقق" : "لم يتم التحقق"}
                </p>
              </div>
              {!user?.isPhoneVerified && <Button size="sm">تحقق الآن</Button>}
            </div>

            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
              <div>
                <p className="font-medium text-foreground">التحقق من الهوية</p>
                <p className="text-sm text-muted-foreground">
                  {user?.isIdentityVerified ? "تم التحقق" : "لم يتم التحقق"}
                </p>
              </div>
              {!user?.isIdentityVerified && <Button size="sm">تحقق الآن</Button>}
            </div>

            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Fingerprint className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">التحقق السلوكي (Behavioral Biometrics)</p>
                  <p className="text-sm text-muted-foreground">
                    طبقة أمان إضافية تحلل نمط استخدامك للتطبيق
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  نشط
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
