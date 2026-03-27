import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelpCircle, ShieldCheck, Wallet, RefreshCcw } from "lucide-react";

export default function FAQ() {
  const faqs = [
    {
      question: "أين تذهب أموالي عند بدء الصفقة؟",
      answer: "بمجرد تمويلك للصفقة، يتم حجز الأموال في حساب 'واثق لي' الوسيط (Escrow Account). لا يتم تسليم هذه الأموال للبائع إلا بعد تأكيدك (كمشتري) باستلام المنتج أو الخدمة ومطابقتها للمواصفات المتفق عليها.",
      icon: <Wallet className="text-blue-500" size={20} />
    },
    {
      question: "كيف أسترد حقي في حال لم يلتزم البائع؟",
      answer: "في حال وجود أي مشكلة، يمكنك فتح 'نزاع' (Dispute) من لوحة التحكم. سيقوم فريق 'واثق لي' بمراجعة الأدلة المقدمة من الطرفين والتدخل يدوياً للفصل في النزاع وإرجاع الحق لصاحبه.",
      icon: <RefreshCcw className="text-red-500" size={20} />
    },
    {
      question: "ما هي ضمانات الأمان في المنصة؟",
      answer: "نستخدم تقنيات تشفير متقدمة لحماية بياناتك، ونقوم بالتحقق من هوية المستخدمين (KYC). بالإضافة إلى ذلك، نظام الوساطة يضمن عدم ضياع أموالك في صفقات وهمية.",
      icon: <ShieldCheck className="text-green-500" size={20} />
    },
    {
      question: "هل يمكنني إلغاء الصفقة بعد تمويلها؟",
      answer: "يمكن إلغاء الصفقة بموافقة الطرفين، أو في حال تأخر البائع عن التسليم في الوقت المحدد، حيث يمكنك فتح نزاع للمطالبة باسترداد المبلغ كاملاً.",
      icon: <HelpCircle className="text-amber-500" size={20} />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 font-arabic" dir="rtl">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">الأسئلة الشائعة</h1>
          <p className="text-slate-600">كل ما تحتاج لمعرفته حول كيفية عمل منصة واثق لي وضمان حقوقك</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <Card key={index} className="p-4 border-none shadow-sm hover:shadow-md transition-shadow">
              <Accordion type="single" collapsible>
                <AccordionItem value={`item-${index}`} className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2">
                    <div className="flex items-center gap-3 text-right">
                      {faq.icon}
                      <span className="font-bold text-slate-800">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 leading-relaxed pt-4 border-t border-slate-100 mt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-6 bg-blue-600 rounded-2xl text-white text-center">
          <h3 className="text-xl font-bold mb-2">لديك سؤال آخر؟</h3>
          <p className="opacity-90 mb-4">فريق الدعم الفني متواجد لمساعدتك على مدار الساعة</p>
          <Button variant="secondary" className="font-bold">تواصل معنا</Button>
        </div>
      </div>
    </div>
  );
}
