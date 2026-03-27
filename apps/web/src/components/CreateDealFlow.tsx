import React, { useState } from 'react';
import { sanitizeObject } from '@/lib/security';
import { Package, Laptop, UserCheck, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

type DealType = "physical" | "digital_account" | "service";

type CreateDealPayload = {
  title: string;
  amount: string;
  sellerId: number;
  dealType: DealType;
  specifications: Record<string, unknown>;
  description?: string;
};

interface CreateDealFlowProps {
  onComplete: (data: CreateDealPayload) => void;
  onCancel: () => void;
}

/**
 * CreateDealFlow Component
 * 
 * A multi-step form for creating different types of escrow transactions:
 * 1. Physical Goods
 * 2. Digital Accounts
 * 3. Services
 * 
 * Features:
 * - Step-by-step navigation
 * - Type-specific form fields
 * - Input sanitization before submission
 * 
 * @param onComplete - Callback function called when the form is successfully submitted
 * @param onCancel - Callback function called when the user cancels the process
 */
export const CreateDealFlow: React.FC<CreateDealFlowProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [dealType, setDealType] = useState<DealType | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    sellerId: '',
    // Physical fields
    shippingCompany: '',
    trackingNumber: '',
    inspectionPeriod: '',
    // Digital fields
    accountType: '',
    followersCount: '',
    linkedEmail: '',
    verificationPeriod: '',
    // Service fields
    description: '',
    deliveryPeriod: '',
    hasMilestones: false,
  });

  const handleTypeSelect = (type: DealType) => {
    setDealType(type);
    setStep(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const specifications: Record<string, unknown> = {};
    
    if (dealType === 'physical') {
      specifications.shippingCompany = formData.shippingCompany;
      specifications.trackingNumber = formData.trackingNumber;
      specifications.inspectionPeriod = formData.inspectionPeriod;
    } else if (dealType === 'digital_account') {
      specifications.accountType = formData.accountType;
      specifications.followersCount = formData.followersCount;
      specifications.linkedEmail = formData.linkedEmail;
      specifications.verificationPeriod = formData.verificationPeriod;
    } else if (dealType === 'service') {
      specifications.description = formData.description;
      specifications.deliveryPeriod = formData.deliveryPeriod;
      specifications.hasMilestones = formData.hasMilestones;
    }

    // Sanitize all form data before sending to server
    const sanitizedData = sanitizeObject({
      title: formData.title.trim(),
      amount: formData.amount.trim(),
      sellerId: Number.parseInt(formData.sellerId, 10),
      dealType: dealType as DealType,
      specifications,
      ...(dealType === "service" ? { description: formData.description.trim() } : {}),
    }) as CreateDealPayload;

    onComplete(sanitizedData);
  };

  return (
    <div className="w-full max-w-4xl mx-auto font-arabic" dir="rtl">
      {/* Stepper Header */}
      <div className="flex justify-between items-center mb-8 px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > s ? <CheckCircle2 size={20} /> : s}
            </div>
            {s < 3 && (
              <div className={`w-20 h-1 mx-2 rounded ${
                step > s ? 'bg-blue-600' : 'bg-slate-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card 
            className={`cursor-pointer hover:border-blue-500 hover:shadow-md transition-all ${dealType === 'physical' ? 'border-blue-500 bg-blue-50/50' : ''}`}
            onClick={() => handleTypeSelect('physical')}
          >
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="text-blue-600" size={32} />
              </div>
              <CardTitle>📦 سلعة مادية</CardTitle>
              <CardDescription>شراء أو بيع منتجات يتم شحنها</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer hover:border-blue-500 hover:shadow-md transition-all ${dealType === 'digital_account' ? 'border-blue-500 bg-blue-50/50' : ''}`}
            onClick={() => handleTypeSelect('digital_account')}
          >
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Laptop className="text-purple-600" size={32} />
              </div>
              <CardTitle>💻 حساب رقمي</CardTitle>
              <CardDescription>بيع حسابات التواصل أو الألعاب</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer hover:border-blue-500 hover:shadow-md transition-all ${dealType === 'service' ? 'border-blue-500 bg-blue-50/50' : ''}`}
            onClick={() => handleTypeSelect('service')}
          >
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="text-green-600" size={32} />
              </div>
              <CardTitle>🧑‍💻 خدمة</CardTitle>
              <CardDescription>تصميم، برمجة، ترجمة، عمل حر</CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card className="animate-in fade-in slide-in-from-left-4 duration-500">
          <CardHeader>
            <CardTitle>تفاصيل الصفقة</CardTitle>
            <CardDescription>أدخل المعلومات الأساسية لبدء عملية الوساطة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان الصفقة</Label>
                <Input id="title" name="title" placeholder="مثلاً: شراء هاتف آيفون 13" value={formData.title} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (بالدينار الليبي)</Label>
                <Input id="amount" name="amount" type="number" placeholder="0.00" value={formData.amount} onChange={handleInputChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellerId">معرف البائع (ID)</Label>
              <Input id="sellerId" name="sellerId" placeholder="أدخل رقم تعريف البائع في المنصة" value={formData.sellerId} onChange={handleInputChange} />
            </div>
            
            <div className="pt-4 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronRight className="ml-2" size={16} /> السابق
              </Button>
              <Button onClick={() => setStep(3)} disabled={!formData.title || !formData.amount || !formData.sellerId}>
                التالي <ChevronLeft className="mr-2" size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="animate-in fade-in slide-in-from-left-4 duration-500">
          <CardHeader>
            <CardTitle>
              {dealType === 'physical' && 'تفاصيل السلعة المادية'}
              {dealType === 'digital_account' && 'تفاصيل الحساب الرقمي'}
              {dealType === 'service' && 'تفاصيل الخدمة'}
            </CardTitle>
            <CardDescription>أكمل البيانات الإضافية المطلوبة لنوع هذه الصفقة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {dealType === 'physical' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingCompany">شركة الشحن</Label>
                    <Input id="shippingCompany" name="shippingCompany" placeholder="مثلاً: أرامكس" value={formData.shippingCompany} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trackingNumber">رقم الشحنة</Label>
                    <Input id="trackingNumber" name="trackingNumber" placeholder="رقم التتبع" value={formData.trackingNumber} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="inspectionPeriod">مدة الفحص (بالأيام)</Label>
                    <Input id="inspectionPeriod" name="inspectionPeriod" type="number" placeholder="عدد الأيام المسموح بها للفحص" value={formData.inspectionPeriod} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              {dealType === 'digital_account' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountType">نوع الحساب</Label>
                    <Input id="accountType" name="accountType" placeholder="تيك توك، انستقرام، ببجي..." value={formData.accountType} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="followersCount">عدد المتابعين / المستوى</Label>
                    <Input id="followersCount" name="followersCount" placeholder="مثلاً: 50k" value={formData.followersCount} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedEmail">البريد المرتبط</Label>
                    <Input id="linkedEmail" name="linkedEmail" type="email" placeholder="example@mail.com" value={formData.linkedEmail} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verificationPeriod">مدة التحقق (بالساعات)</Label>
                    <Input id="verificationPeriod" name="verificationPeriod" type="number" placeholder="عدد الساعات لنقل الملكية" value={formData.verificationPeriod} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              {dealType === 'service' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">وصف الخدمة المطلوب تنفيذها</Label>
                    <Textarea id="description" name="description" placeholder="اشرح بالتفصيل ما سيقوم به البائع..." className="min-h-[100px]" value={formData.description} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryPeriod">مدة التسليم (بالأيام)</Label>
                    <Input id="deliveryPeriod" name="deliveryPeriod" type="number" placeholder="كم يوم يستغرق العمل؟" value={formData.deliveryPeriod} onChange={handleInputChange} />
                  </div>
                </div>
              )}

              <div className="pt-6 flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  <ChevronRight className="ml-2" size={16} /> السابق
                </Button>
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={onCancel}>
                    إلغاء
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    تأكيد وإنشاء الصفقة <ArrowRight className="mr-2" size={16} />
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
