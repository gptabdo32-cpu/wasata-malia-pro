import { useState, useEffect } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import {
  Search,
  Filter,
  Star,
  ShoppingCart,
  Heart,
  Grid3x3,
  List,
  ChevronDown,
  MapPin,
  Tag,
  Clock,
  ArrowUpDown,
  ShieldCheck,
} from "lucide-react";

export default function Products() {
  const { user, isAuthenticated } = useAuth();
  const searchParams = new URLSearchParams(useSearch());
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedType, setSelectedType] = useState<"digital" | "physical" | "vehicle" | "service">((searchParams.get("type") as any) || "digital");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState<"all" | "new" | "used">("all");

  // Fetch products using the new API
  const { data: products, isLoading } = trpc.products.searchProducts.useQuery(
    {
      query: searchQuery,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      type: selectedType,
      limit: 50,
      offset: 0,
      filters: {
        minPrice: priceRange[0].toString(),
        maxPrice: priceRange[1].toString(),
        city: selectedCity !== "all" ? selectedCity : undefined,
        condition: selectedCondition !== "all" ? selectedCondition : undefined,
        sortBy: sortBy as any,
      }
    }
  );

  const types = [
    { id: "digital", name: "منتجات رقمية", icon: Tag },
    { id: "physical", name: "منتجات مادية", icon: ShoppingCart },
    { id: "vehicle", name: "سيارات ومركبات", icon: Clock },
    { id: "service", name: "خدمات وتجارب", icon: MapPin },
  ];

  const categories: Record<string, { id: string, name: string }[]> = {
    digital: [
      { id: "all", name: "الكل" },
      { id: "games", name: "حسابات ألعاب" },
      { id: "social", name: "سوشيال ميديا" },
      { id: "tools", name: "أدوات رقمية" },
    ],
    physical: [
      { id: "all", name: "الكل" },
      { id: "phones", name: "هواتف" },
      { id: "watches", name: "ساعات" },
      { id: "accessories", name: "إكسسوارات" },
    ],
    vehicle: [
      { id: "all", name: "الكل" },
      { id: "cars", name: "سيارات" },
      { id: "bikes", name: "دراجات" },
      { id: "trucks", name: "شاحنات" },
    ],
    service: [
      { id: "all", name: "الكل" },
      { id: "hotels", name: "فنادق" },
      { id: "resorts", name: "استراحات" },
      { id: "weddings", name: "أعراس" },
    ],
  };

  const cities = ["all", "طرابلس", "بنغازي", "مصراتة", "الزاوية", "البيضاء", "طبرق", "سبها"];

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        {/* Header & Search */}
        <div className="mb-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">تصفح السوق</h1>
              <p className="text-slate-500">اكتشف آلاف العروض الموثوقة في ليبيا</p>
            </div>
            <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
              {types.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedType(t.id as any);
                    setSelectedCategory("all");
                  }}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    selectedType === t.id 
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
                    : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <t.icon size={16} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={22} />
            <Input
              placeholder={`ابحث في ${types.find(t => t.id === selectedType)?.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-14 h-14 bg-white border-none rounded-2xl shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 text-lg text-right"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* 2️⃣ الفلترة المتقدمة (Sidebar) */}
          <aside className="lg:col-span-1 space-y-6">
            <Card className="p-6 border-none shadow-sm rounded-[2rem] sticky top-24">
              <div className="flex items-center gap-2 mb-6 text-slate-900">
                <Filter size={20} className="text-orange-500" />
                <h3 className="font-black text-xl">تصفية النتائج</h3>
              </div>

              <div className="space-y-8">
                {/* Category */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-500">الفئة الفرعية</label>
                  <div className="flex flex-wrap gap-2">
                    {categories[selectedType].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          selectedCategory === cat.id
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-500">السعر (ل.د)</label>
                    <span className="text-xs font-bold text-orange-600">{priceRange[0]} - {priceRange[1]}</span>
                  </div>
                  <Slider
                    defaultValue={[0, 10000]}
                    max={10000}
                    step={100}
                    value={priceRange}
                    onValueChange={setPriceRange}
                    className="py-4"
                  />
                </div>

                {/* City */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-500">المدينة</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full p-3 bg-slate-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    {cities.map(city => (
                      <option key={city} value={city}>{city === "all" ? "كل المدن" : city}</option>
                    ))}
                  </select>
                </div>

                {/* Condition */}
                {selectedType !== "service" && (
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-500">الحالة</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["all", "new", "used"].map((cond) => (
                        <button
                          key={cond}
                          onClick={() => setSelectedCondition(cond as any)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            selectedCondition === cond
                              ? "bg-orange-500 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {cond === "all" ? "الكل" : cond === "new" ? "جديد" : "مستعمل"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full rounded-xl border-slate-200 text-slate-500 font-bold"
                  onClick={() => {
                    setPriceRange([0, 10000]);
                    setSelectedCategory("all");
                    setSelectedCity("all");
                    setSelectedCondition("all");
                    setSearchQuery("");
                  }}
                >
                  إعادة تعيين
                </Button>
              </div>
            </Card>
          </aside>

          {/* 3️⃣ عرض المنتجات (Main Content) */}
          <main className="lg:col-span-3 space-y-6">
            {/* Sort & View Mode */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <ArrowUpDown size={18} />
                  <span className="text-sm font-bold">فرز حسب:</span>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-sm font-black text-slate-900 focus:ring-0 outline-none cursor-pointer"
                >
                  <option value="newest">الأحدث</option>
                  <option value="popular">الأكثر مبيعاً</option>
                  <option value="price-low">الأقل سعراً</option>
                  <option value="price-high">الأعلى سعراً</option>
                  <option value="rating">الأعلى تقييماً</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg ${viewMode === "grid" ? "bg-slate-900" : "text-slate-400"}`}
                >
                  <Grid3x3 size={18} />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg ${viewMode === "list" ? "bg-slate-900" : "text-slate-400"}`}
                >
                  <List size={18} />
                </Button>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="p-4 animate-pulse rounded-[2rem] border-none shadow-sm">
                    <div className="w-full aspect-square bg-slate-100 rounded-2xl mb-4" />
                    <div className="h-4 bg-slate-100 rounded mb-2 w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </Card>
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                {products.map((product: any) => (
                  <Link key={product.id} href={`/product/${selectedType}/${product.id}`}>
                    <Card className={`group overflow-hidden border-none bg-white rounded-[2rem] hover:shadow-2xl transition-all cursor-pointer ${viewMode === "list" ? "flex gap-6 p-4" : "flex flex-col"}`}>
                      {/* Image */}
                      <div className={`relative overflow-hidden flex-shrink-0 ${viewMode === "list" ? "w-48 h-48 rounded-2xl" : "aspect-square rounded-t-[2rem]"}`}>
                        <img 
                          src={product.thumbnailUrl || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80"} 
                          alt={product.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          {product.isFeatured && (
                            <Badge className="bg-orange-500 text-white border-none px-3 py-1 rounded-full text-[10px] font-black uppercase">مميز</Badge>
                          )}
                          {product.condition && (
                            <Badge className="bg-white/90 backdrop-blur-sm text-slate-900 border-none px-3 py-1 rounded-full text-[10px] font-black uppercase">
                              {product.condition === "new" ? "جديد" : "مستعمل"}
                            </Badge>
                          )}
                        </div>
                        <button className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm">
                          <Heart size={18} />
                        </button>
                      </div>

                      {/* Info */}
                      <div className={`flex-1 ${viewMode === "list" ? "py-2" : "p-6"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={12} className={i < Math.floor(product.averageRating || 0) ? "fill-orange-500 text-orange-500" : "text-slate-200"} />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">({product.totalReviews || 0})</span>
                        </div>
                        
                        <h3 className="font-black text-slate-900 text-lg line-clamp-1 mb-1 group-hover:text-orange-500 transition-colors">{product.title}</h3>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">{product.description}</p>
                        
                        <div className="flex items-center gap-3 mb-4 text-[11px] font-bold text-slate-400">
                          <div className="flex items-center gap-1">
                            <MapPin size={12} />
                            {product.city || "ليبيا"}
                          </div>
                          <div className="flex items-center gap-1">
                            <ShieldCheck size={12} className="text-green-500" />
                            بائع موثوق
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex flex-col">
                            <span className="text-2xl font-black text-slate-900">{product.price} <span className="text-xs">ل.د</span></span>
                          </div>
                          <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-6 font-bold shadow-lg shadow-orange-100">
                            {selectedType === "service" ? "احجز الآن" : "اطلب الآن"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart size={48} className="text-slate-200" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">لا توجد نتائج</h3>
                <p className="text-slate-500 mb-8">جرب تغيير كلمات البحث أو الفلاتر المختارة</p>
                <Button 
                  variant="outline" 
                  className="rounded-2xl px-8 font-bold border-slate-200"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setPriceRange([0, 10000]);
                  }}
                >
                  إعادة تعيين كل الفلاتر
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
