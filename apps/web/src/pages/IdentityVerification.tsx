import React, { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, Smartphone } from "lucide-react";

const IdentityVerification = () => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const { data: status, refetch: refetchStatus } = trpc.verify.getStatus.useQuery();
  const sendOtpMutation = trpc.verify.sendOtp.useMutation();
  const checkOtpMutation = trpc.verify.checkOtp.useMutation();

  useEffect(() => {
    if (status) {
      if (status.verificationLevel >= 1) setStep(2);
    }
  }, [status]);

  const handleSendOtp = async () => {
    try {
      const result = await sendOtpMutation.mutateAsync({ phone: phone.trim() || undefined });
      setChallengeId(result.challengeId);
      toast.success(result.sentTo === "phone" ? "تم إرسال رمز التحقق إلى رقمك" : "تم إنشاء رمز التحقق على الجهاز");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "فشل إرسال الرمز");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await checkOtpMutation.mutateAsync({ phone: phone.trim() || undefined, code: otp });
      toast.success("تم التحقق من الهاتف بنجاح");
      setStep(2);
      refetchStatus();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "رمز التحقق غير صحيح");
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">التحقق من الهوية</h1>
        <p className="text-muted-foreground">أكمل الخطوات التالية لتأمين حسابك وزيادة حدود المعاملات</p>
      </div>

      {/* Stepper */}
      <div className="flex justify-center mb-8 relative">
        {[1, 2].map((s) => (
          <div key={s} className="flex flex-col items-center z-10 mx-8">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              step >= s ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground"
            }`}>
              {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
            </div>
            <span className="text-xs mt-2">{s === 1 ? "رقم الهاتف" : "مكتمل"}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          {step === 1 && (
            <>
              <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> التحقق من الهاتف</CardTitle>
              <CardDescription>يمكن ربط رقم الهاتف بالحساب ثم التحقق برمز OTP قصير.</CardDescription>
            </>
          )}
          {step === 2 && (
            <>
              <CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 className="w-5 h-5" /> تم التحقق بنجاح</CardTitle>
              <CardDescription>حسابك الآن موثق جزئياً عبر الهاتف.</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="09XXXXXXXX (اختياري)" value={phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} />
                <Button onClick={handleSendOtp} disabled={sendOtpMutation.isPending}>إرسال</Button>
              </div>
              <Input placeholder="أدخل رمز التحقق (6 أرقام)" value={otp} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)} maxLength={6} />
              <Button className="w-full" onClick={handleVerifyOtp} disabled={checkOtpMutation.isPending || otp.length !== 6}>تأكيد الرمز</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 text-center py-4">
              {challengeId && <p className="text-sm text-muted-foreground">مرجع التحقق: {challengeId}</p>}
              <Button className="w-full" onClick={() => window.location.href = '/dashboard'}>الذهاب للوحة التحكم</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IdentityVerification;
