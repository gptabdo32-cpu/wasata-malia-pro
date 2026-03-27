import { useState } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { sanitizeHtml } from "@/lib/security";
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Clock,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Info,
} from "lucide-react";
import { SmartEscrowDetails } from "@/components/SmartEscrowDetails";
import { Image } from "@/components/ui/image";

export default function ProductDetail() {
  const { user, isAuthenticated } = useAuth();
  const { type, id } = useParams<{ type: string; id: string }>();
  const [activeImage, setActiveImage] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Fetch product details
  const { data: product, isLoading } = trpc.products.getById.useQuery(
    { id: parseInt(id), type: type as any }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-4xl font-black text-slate-900 mb-4">المنتج غير موجود</h1>
        <p className="text-slate-500 mb-8">عذراً، يبدو أن هذا المنتج قد تم حذفه أو أن الرابط غير صحيح.</p>
        <Button asChild className="bg-orange-500 hover:bg-orange-600 rounded-2xl px-8 font-bold">
          <Link href="/products">العودة للسوق</Link>
        </Button>
      </div>
    );
  }

  const images = product.images || [product.thumbnailUrl || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80"];
  const specs = product.specifications || {};

  return (
    <div className="min-h-screen bg-slate-50 py-12 font-arabic" dir="rtl">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-8">
          <Link href="/" className="hover:text-orange-500 transition-colors">الرئيسية</Link>
          <ChevronLeft size={14} />
          <Link href="/products" className="hover:text-orange-500 transition-colors">السوق</Link>
          <ChevronLeft size={14} />
          <span className="text-slate-900 truncate max-w-[200px]">{product.title}</span>
        </nav>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* 1️⃣ صور المنتج (Slider) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-white shadow-xl shadow-slate-200 group">
              <Image 
                src={images[activeImage]} 
                alt={product.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                containerClassName="w-full h-full"
              />
              
              {images.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-900 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-900 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              <div className="absolute top-6 right-6 flex flex-col gap-3">
                <button className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-lg">
                  <Heart size={20} />
                </button>
                <button className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors shadow-lg">
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-4 transition-all ${
                      activeImage === idx ? "border-orange-500 scale-95" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image 
                      src={img} 
                      className="w-full h-full object-cover" 
                      alt={`Thumbnail ${idx}`} 
                      containerClassName="w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* 2️⃣ وصف كامل */}
            <Card className="p-8 border-none shadow-sm rounded-[2rem] bg-white space-y-6">
              <h3 className="text-2xl font-black text-slate-900">وصف المنتج</h3>
              <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
                {sanitizeHtml(product.description || "لا يوجد وصف متاح لهذا المنتج حالياً.")}
              </p>
              
              {/* 3️⃣ الخصائص الرئيسية (JSON) */}
              {Object.keys(specs).length > 0 && (
                <div className="pt-8 border-t border-slate-100">
                  <h4 className="text-xl font-black text-slate-900 mb-6">المواصفات والتفاصيل</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(specs).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <span className="text-slate-500 font-bold">{key}</span>
                        <span className="text-slate-900 font-black">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* 4️⃣ نظام الضمان الذكي (Smart Escrow) */}
            <div className="mt-8">
              <h3 className="text-2xl font-black text-slate-900 mb-6">نظام الضمان الذكي</h3>
              <SmartEscrowDetails 
                escrowId={parseInt(id)} 
                dealType={type === "service" ? "service" : "physical"} 
              />
            </div>

            {/* 5️⃣ تقييمات العملاء */}
            <Card className="p-8 border-none shadow-sm rounded-[2rem] bg-white space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">تقييمات العملاء</h3>
                <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-2xl">
                  <Star className="fill-orange-500 text-orange-500" size={20} />
                  <span className="text-xl font-black text-orange-600">{product.averageRating || "0.0"}</span>
                  <span className="text-slate-400 text-sm font-bold">({product.totalReviews || 0} تقييم)</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Sample Review */}
                <div className="p-6 bg-slate-50 rounded-[2rem] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black">م</div>
                      <div>
                        <h5 className="font-black text-slate-900">محمد علي</h5>
                        <span className="text-xs text-slate-400 font-bold">منذ يومين</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className="fill-orange-500 text-orange-500" />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed">تجربة ممتازة جداً، البائع موثوق والمنتج وصلني تماماً كما في الوصف. شكراً وثّقلي على الأمان.</p>
                </div>
              </div>
            </Card>
          </div>

          {/* 4️⃣ سعر وتوافر (Sidebar) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-8 border-none shadow-2xl shadow-slate-200 rounded-[3rem] bg-white sticky top-24 space-y-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-600 border-none px-3 py-1 rounded-full text-xs font-black uppercase">
                    {type === "digital" ? "منتج رقمي" : type === "physical" ? "منتج مادي" : type === "vehicle" ? "مركبة" : "خدمة"}
                  </Badge>
                  {product.condition && (
                    <Badge className="bg-slate-100 text-slate-600 border-none px-3 py-1 rounded-full text-xs font-black uppercase">
                      {product.condition === "new" ? "جديد" : "مستعمل"}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight">{product.title}</h1>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
                  <div className="flex items-center gap-1">
                    <MapPin size={16} className="text-orange-500" />
                    {product.city || "ليبيا"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={16} className="text-orange-500" />
                    نشر منذ 3 ساعات
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-400">السعر النهائي</span>
                  <span className="text-4xl font-black text-slate-900">{product.price} <span className="text-lg">ل.د</span></span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-green-500 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={() => setShowBookingModal(true)}
                  className="w-full h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xl font-black shadow-xl shadow-orange-200 transition-all hover:-translate-y-1"
                >
                  {type === "service" ? "احجز الآن" : "اطلب الآن"}
                </Button>
                <Button variant="outline" className="w-full h-16 border-2 border-slate-100 rounded-2xl text-lg font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-3">
                  <MessageCircle size={24} />
                  تواصل مع البائع
                </Button>
              </div>

              <div className="pt-8 border-t border-slate-100 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900">وساطة وثّقلي الآمنة</h5>
                    <p className="text-xs text-slate-500 font-bold">أموالك في أمان حتى تستلم وتؤكد</p>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-2xl flex gap-3">
                  <Info className="text-blue-500 flex-shrink-0" size={20} />
                  <p className="text-xs text-blue-700 font-bold leading-relaxed">
                    عند الضغط على "اطلب الآن"، سيتم حجز المبلغ في نظام الوساطة ولن يتم تسليمه للبائع إلا بعد تأكيدك للاستلام.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 4️⃣ تجربة الحجز والشراء (Modal) */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-white rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-8">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 mx-auto mb-4">
                  <ShoppingCart size={40} />
                </div>
                <h3 className="text-3xl font-black text-slate-900">تأكيد الطلب</h3>
                <p className="text-slate-500 font-bold">أنت على وشك شراء "{product.title}"</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-slate-500 font-bold">سعر المنتج</span>
                  <span className="text-slate-900 font-black">{product.price} ل.د</span>
                </div>
                <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-slate-500 font-bold">رسوم الوساطة (2.5%)</span>
                  <span className="text-slate-900 font-black">{(parseFloat(product.price) * 0.025).toFixed(2)} ل.د</span>
                </div>
                <div className="flex justify-between p-6 bg-orange-500 text-white rounded-2xl">
                  <span className="font-bold">الإجمالي المطلوب</span>
                  <span className="text-2xl font-black">{(parseFloat(product.price) * 1.025).toFixed(2)} ل.د</span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  className="flex-1 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black"
                  onClick={() => setShowBookingModal(false)}
                >
                  إلغاء
                </Button>
                <Button 
                  className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-200"
                  onClick={() => {
                    // Here we would call the createTransaction mutation
                    alert("سيتم توجيهك لصفحة الدفع...");
                    setShowBookingModal(false);
                  }}
                >
                  تأكيد ودفع
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
