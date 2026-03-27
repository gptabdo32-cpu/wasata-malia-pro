import { Card } from "@/components/ui/card";
import { ShieldAlert, Scale, RotateCcw, ShieldCheck } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 font-arabic" dir="rtl">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">التوثيق القانوني والسياسات</h1>
          <p className="text-slate-600">نلتزم بالشفافية والعدالة في جميع المعاملات عبر منصة واثق لي</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Terms of Use */}
          <Card className="p-8 border-t-4 border-t-blue-600 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Scale className="text-blue-600" size={28} />
              <h2 className="text-2xl font-bold text-slate-900">شروط الاستخدام</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-900">أولاً: الأهلية والتعريفات</p>
              <p>يجب أن يكون المستخدم بالغاً سن الرشد القانوني في الدولة الليبية (18 عاماً) أو تحت إشراف ولي أمره، ويقر بصحة جميع البيانات المقدمة.</p>
              
              <p className="font-bold text-slate-900">ثانياً: الالتزامات المالية</p>
              <p>تلتزم منصة واثق لي بحفظ الأموال في حساب وسيط، ولا يتم تحويلها للبائع إلا بعد تأكيد المشتري بالاستلام، أو بقرار من إدارة المنصة في حال النزاع.</p>

              <p className="font-bold text-slate-900">ثالثاً: المسؤولية القانونية</p>
              <p>المنصة وسيط تقني فقط، ولا تتحمل مسؤولية جودة المنتجات المادية، ولكنها تضمن وصول المنتج المتفق عليه عبر نظام الوساطة.</p>
            </div>
          </Card>

          {/* Refund Policy */}
          <Card className="p-8 border-t-4 border-t-red-600 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <RotateCcw className="text-red-600" size={28} />
              <h2 className="text-2xl font-bold text-slate-900">سياسة الاسترجاع</h2>
            </div>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-900">1. حالات استرداد الأموال</p>
              <p>يحق للمشتري استرداد كامل مبلغه في حال لم يقم البائع بتسليم المنتج في الوقت المحدد، أو في حال كان المنتج مخالفاً للمواصفات المتفق عليها جذرياً.</p>
              
              <p className="font-bold text-slate-900">2. الرسوم والعمولات</p>
              <p>في حال تم الإرجاع بسبب خطأ من البائع، يتم استرداد كامل المبلغ للمشتري، أما في حال الإلغاء بدون سبب مقنع، قد يتم خصم عمولة المنصة (2.5%).</p>

              <p className="font-bold text-slate-900">3. آلية حل النزاعات</p>
              <p>يتم الفصل في النزاعات خلال مدة لا تتجاوز 48 ساعة عمل، بناءً على الأدلة المقدمة في صفحة النزاع (محادثات، صور، فيديوهات الاستلام).</p>
            </div>
          </Card>
        </div>

        {/* Safety & Trust */}
        <Card className="p-8 bg-green-50 border-none shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className="bg-green-100 p-4 rounded-full">
            <ShieldCheck className="text-green-600" size={48} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-900 mb-2">التزامنا تجاه السوق الليبي</h3>
            <p className="text-green-800 opacity-90 leading-relaxed">
              نسعى في واثق لي لبناء اقتصاد رقمي آمن وموثوق في ليبيا، ونطبق القوانين التجارية الليبية المعمول بها لضمان حقوق جميع الأطراف بكل عدالة وشفافية.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
