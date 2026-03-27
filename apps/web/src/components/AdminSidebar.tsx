import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Gavel,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Bell,
  History,
  Package,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/core/hooks/useAuth";

const adminMenuItems = [
  {
    label: "لوحة القيادة",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "إدارة المستخدمين",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "إدارة المعاملات",
    href: "/admin/transactions",
    icon: DollarSign,
  },
  {
    label: "إدارة النزاعات",
    href: "/admin/disputes",
    icon: Gavel,
  },
  {
    label: "إدارة التنبيهات",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    label: "إدارة المنتجات",
    href: "/admin/products",
    icon: Package,
  },
  {
    label: "العمولات والأرباح",
    href: "/admin/commissions",
    icon: PieChart,
  },
  {
    label: "سجلات المسؤولين",
    href: "/admin/logs",
    icon: History,
  },
  {
    label: "الإعدادات",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminSidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white shadow-lg"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 h-screen w-64 bg-slate-900 text-white transform transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
        dir="rtl"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">وثّ</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">وثّقلي</h1>
              <p className="text-xs text-slate-400">لوحة التحكم الإدارية</p>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-2">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <a
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight size={16} />}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-800">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-slate-800"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
