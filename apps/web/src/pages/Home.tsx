import { useState } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import {
  Shield,
  Search,
  Gamepad2,
  Hotel,
  Smartphone,
  Car,
  Star,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  Zap,
} from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "service", name: "خدمات وتجارب", icon: Hotel, color: "bg-blue-500" },
    { id: "digital", name: "منتجات رقمية", icon: Gamepad2, color: "bg-purple-500" },
    { id: "physical", name: "منتجات مادية", icon: Smartphone, color: "bg-orange-500" },
    { id: "vehicle", name: "سيارات ومركبات", icon: Car, color: "bg-green-500" },
  ];

  const featuredOffers = [
    {
      id: 1,
      title: "حسابات ببجي مستويات عالية",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
      category: "digital",
      price: "150 ل.د",
    },
    {
      id: 2,
      title: "آيفون 15 برو ماكس - مستعمل نظيف",
      image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=800&q=80",
      category: "physical",
      price: "4500 ل.د",
    },
    {
      id: 3,
      title: "حجز استراحات - تاجوراء",
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
      category: "service",
      price: "300 ل.د / يوم",
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-arabic" dir="rtl">
      {/* 1️⃣ شريط التنقل الرئيسي */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black text-slate-900 hidden sm:block">وثّقلي</span>
            </Link>

            {/* 2️⃣ شريط البحث */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
              <Input
                placeholder="ابحث عن منتج، مدينة، أو فئة..."
                className="w-full pr-12 h-11 bg-slate-100 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-orange-500 transition-all text-right"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            {/* Auth Actions */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Button variant="ghost" className="rounded-xl" asChild>
                  <Link href="/dashboard">حسابي</Link>
                </Button>
              ) : (
                <Button className="bg-orange-500 hover:bg-orange-600 rounded-xl px-6" asChild>
                  <a href={getLoginUrl()}>دخول</a>
                </Button>
              )}
            </div>
          </div>

          {/* Quick Links Bar */}
          <div className="flex items-center gap-6 py-3 overflow-x-auto no-scrollbar text-sm font-medium text-slate-600 border-t border-slate-100">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/products?type=${cat.id}`} className="whitespace-nowrap hover:text-orange-500 transition-colors flex items-center gap-2">
                <cat.icon size={16} />
                {cat.name}
              </Link>
            ))}
            <Link href="/products?sort=popular" className="whitespace-nowrap hover:text-orange-500 transition-colors flex items-center gap-2 text-orange-600">
              <Zap size={16} />
              عروض اليوم
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* 3️⃣ قسم العروض المميزة (سلايدر) */}
        <section className="relative group">
          <div className="overflow-hidden rounded-[2rem] aspect-[21/9] relative bg-slate-900">
            <img 
              src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80" 
              className="w-full h-full object-cover opacity-60"
              alt="Featured Offer"
            />
            <div className="absolute inset-0 flex flex-col justify-center px-12 text-white space-y-4">
              <span className="bg-orange-500 w-fit px-4 py-1 rounded-full text-sm font-bold">خصم لفترة محدودة</span>
              <h2 className="text-4xl md:text-6xl font-black leading-tight">تسوق بأمان <br/> في أكبر سوق ليبي</h2>
              <p className="text-lg text-slate-200 max-w-lg">وثّقلي تضمن لك حقك في كل عملية شراء أو حجز. وساطة آمنة 100%.</p>
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl w-fit px-8 font-bold">تصفح العروض</Button>
            </div>
            
            {/* Slider Controls */}
            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft size={24} />
            </button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={24} />
            </button>
          </div>
        </section>

        {/* 4️⃣ الأقسام المختصرة */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">تصفح حسب الفئة</h3>
            <Link href="/products" className="text-orange-500 font-bold hover:underline">عرض الكل</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/products?type=${cat.id}`}>
                <Card className="p-8 flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-none bg-white rounded-[2rem] group">
                  <div className={`w-20 h-20 rounded-3xl ${cat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <cat.icon size={36} />
                  </div>
                  <span className="font-bold text-slate-800 text-lg">{cat.name}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* الأكثر مبيعاً / عروض اليوم */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">الأكثر مبيعاً اليوم</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredOffers.map((offer) => (
              <Card key={offer.id} className="overflow-hidden border-none bg-white rounded-[2rem] hover:shadow-2xl transition-all group cursor-pointer">
                <div className="aspect-video relative overflow-hidden">
                  <img src={offer.image} alt={offer.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold text-orange-600">
                    <Star size={14} className="fill-orange-600" />
                    4.9
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                      {categories.find(c => c.id === offer.category)?.name}
                    </span>
                    <h4 className="text-xl font-bold text-slate-900 line-clamp-1">{offer.title}</h4>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-2xl font-black text-slate-900">{offer.price}</span>
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6">
                      اطلب الآن
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-black text-slate-900">وثّقلي</span>
              </div>
              <p className="text-slate-500 max-w-md leading-relaxed">
                المنصة الليبية الأولى للوساطة الآمنة. نضمن لك تجربة تسوق وحجز خالية من المخاطر، سواء كنت تشتري حساب ألعاب، هاتف، أو تحجز استراحة.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-slate-900 mb-6">روابط سريعة</h5>
              <ul className="space-y-4 text-slate-500">
                <li><Link href="/products" className="hover:text-orange-500 transition-colors">تصفح المنتجات</Link></li>
                <li><Link href="/faq" className="hover:text-orange-500 transition-colors">الأسئلة الشائعة</Link></li>
                <li><Link href="/terms" className="hover:text-orange-500 transition-colors">شروط الاستخدام</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-slate-900 mb-6">تواصل معنا</h5>
              <ul className="space-y-4 text-slate-500">
                <li>دعم فني 24/7</li>
                <li>طرابلس، ليبيا</li>
                <li>support@wathiqly.ly</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 text-center text-slate-400 text-sm">
            <p>© 2026 وثّقلي. صنع بكل حب في ليبيا 🇱🇾</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
