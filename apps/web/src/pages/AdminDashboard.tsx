import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Redirect, Link } from "wouter";
import {
  ShieldAlert,
  Users,
  DollarSign,
  Gavel,
  AlertTriangle,
  Settings,
  BarChart3,
  LogOut,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!isAuthenticated || user?.role !== "admin") return <Redirect to="/" />;

  const adminMenuItems = [
    {
      title: "إدارة المستخدمين",
      description: "عرض وإدارة جميع المستخدمين والتحقق من هويتهم",
      icon: Users,
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "إدارة المعاملات",
      description: "مراقبة جميع المعاملات والمدفوعات على المنصة",
      icon: DollarSign,
      color: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "إدارة النزاعات",
      description: "حل النزاعات بين المشترين والبائعين",
      icon: Gavel,
      color: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      title: "الأنشطة المريبة",
      description: "مراقبة الأنشطة المريبة والاحتيالية",
      icon: AlertTriangle,
      color: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      title: "الإحصائيات",
      description: "عرض إحصائيات المنصة والعمولات",
      icon: BarChart3,
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "الإعدادات",
      description: "إدارة إعدادات المنصة والسياسات",
      icon: Settings,
      color: "bg-gray-100",
      iconColor: "text-gray-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 font-arabic" dir="rtl">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">لوحة التحكم الإدارية</h1>
                <p className="text-sm text-slate-600">مرحباً، {user?.name}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <LogOut className="w-4 h-4 ml-2" />
                العودة للرئيسية
              </Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6 bg-white border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold text-slate-900">-</p>
                </div>
                <Users className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </Card>

            <Card className="p-6 bg-white border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">إجمالي المعاملات</p>
                  <p className="text-2xl font-bold text-slate-900">-</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </Card>

            <Card className="p-6 bg-white border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">النزاعات النشطة</p>
                  <p className="text-2xl font-bold text-slate-900">-</p>
                </div>
                <Gavel className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </Card>

            <Card className="p-6 bg-white border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">الأنشطة المريبة</p>
                  <p className="text-2xl font-bold text-slate-900">-</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
              </div>
            </Card>
          </div>
        </div>

        {/* Admin Menu */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">أدوات الإدارة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminMenuItems.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <Card
                  key={idx}
                  className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-105 bg-white"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`w-6 h-6 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-slate-600 mb-4">{item.description}</p>
                      <Button size="sm" className="w-full">
                        الدخول
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="p-6 bg-white">
          <h2 className="text-xl font-bold text-slate-900 mb-6">الأنشطة الأخيرة</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">الوقت</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                    لا توجد أنشطة حالياً
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Admin Info */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2">معلومات المسؤول</h3>
          <p className="text-sm text-blue-800">
            أنت الآن في لوحة التحكم الإدارية. يمكنك من هنا إدارة جميع جوانب المنصة بما في ذلك المستخدمين والمعاملات والنزاعات والأمان.
          </p>
        </div>
      </div>
    </div>
  );
}
