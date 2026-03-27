import { useAuth } from '@/core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Redirect, useLocation } from 'wouter';
import { CreateDealFlow } from '@/components/CreateDealFlow';
import { Shield } from 'lucide-react';

export default function CreateTransaction() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const createTransactionMutation = trpc.escrow.createTransaction.useMutation({
    onSuccess: (data) => {
      toast.success('تم إنشاء الصفقة بنجاح');
      setLocation('/dashboard');
    },
    onError: (error) => {
      toast.error(error.message || 'حدث خطأ في إنشاء الصفقة');
    },
  });

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center font-arabic'>
        <div className='text-center'>
          <div className='w-12 h-12 rounded-full bg-muted animate-pulse mx-auto mb-4'></div>
          <p className='text-muted-foreground'>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to='/' />;
  }

  const handleComplete = (data: {
    sellerId: number;
    title: string;
    amount: string;
    dealType: "physical" | "digital_account" | "service";
    specifications?: Record<string, unknown>;
    description?: string;
  }) => {
    createTransactionMutation.mutate({
      sellerId: data.sellerId,
      title: data.title,
      amount: data.amount,
      dealType: data.dealType,
      specifications: data.specifications,
      description: data.description,
      paymentMethod: "sadad",
    });
  };

  return (
    <div className='min-h-screen bg-slate-50 py-12 font-arabic' dir="rtl">
      <div className='container max-w-5xl mx-auto px-4'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-slate-900 mb-4'>إنشاء صفقة جديدة</h1>
          <p className='text-lg text-slate-600 max-w-2xl mx-auto'>
            اختر نوع الصفقة المناسب لضمان حقوقك وحقوق الطرف الآخر من خلال نظام الوساطة الموثوق.
          </p>
          
          <div className='mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100'>
            <Shield size={16} />
            نظام حماية متكامل يضمن لك استلام حقك بالكامل
          </div>
        </div>

        <CreateDealFlow 
          onComplete={handleComplete} 
          onCancel={() => setLocation('/dashboard')} 
        />
        
        <div className="mt-12 text-center text-slate-400 text-sm">
          جميع الصفقات تخضع لشروط وأحكام منصة وثقلي للوساطة المالية.
        </div>
      </div>
    </div>
  );
}
