import React from 'react';
import { trpc } from '@/lib/trpc';
import { 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Link as LinkIcon, 
  MapPin, 
  ShieldCheck, 
  Activity,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface SmartEscrowDetailsProps {
  escrowId: number;
  dealType: 'physical' | 'digital_account' | 'service';
}

/**
 * SmartEscrowDetails Component
 * 
 * Displays the technical and blockchain details of a smart escrow transaction.
 * 
 * Features:
 * - Milestone tracking for services
 * - IoT device monitoring for physical goods
 * - Blockchain log transparency
 * - Real-time progress visualization
 * 
 * @param escrowId - The unique identifier of the escrow transaction
 * @param dealType - The type of deal (physical, digital_account, or service)
 */
export const SmartEscrowDetails: React.FC<SmartEscrowDetailsProps> = ({ escrowId, dealType }) => {
  const { data: milestones, isLoading: loadingMilestones } = trpc.smartEscrow.getMilestones.useQuery({ escrowId });
  const { data: devices, isLoading: loadingDevices } = trpc.smartEscrow.getDevices.useQuery({ escrowId });
  const { data: logs, isLoading: loadingLogs } = trpc.smartEscrow.getBlockchainLogs.useQuery({ escrowId });

  const completedMilestones = milestones?.filter(m => m.status === 'completed' || m.status === 'released').length || 0;
  const progress = milestones?.length ? (completedMilestones / milestones.length) * 100 : 0;

  return (
    <div className="space-y-6 font-arabic" dir="rtl">
      {/* Milestones Section (Services) */}
      {dealType === 'service' && (
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Activity size={20} />
                </div>
                <div>
                  <CardTitle className="text-lg">مراحل الإنجاز (Milestones)</CardTitle>
                  <CardDescription>تتبع تقدم العمل وتحرير الدفعات تلقائياً</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {completedMilestones} / {milestones?.length || 0} مكتملة
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">نسبة الإنجاز الكلية</span>
                <span className="font-bold text-blue-600">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-4">
              {milestones?.map((milestone, index) => (
                <div key={milestone.id} className="flex items-start gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className={`mt-1 p-1 rounded-full ${
                    milestone.status === 'released' ? 'bg-green-100 text-green-600' : 
                    milestone.status === 'completed' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {milestone.status === 'released' || milestone.status === 'completed' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800">{milestone.title}</h4>
                      <span className="font-mono text-sm font-bold text-slate-900">{milestone.amount} د.ل</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{milestone.description}</p>
                    {milestone.verificationType !== 'manual' && (
                      <div className="mt-2 flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded">
                        <LinkIcon size={12} />
                        تحقق تلقائي عبر {milestone.verificationType}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!milestones || milestones.length === 0) && (
                <div className="text-center py-8 text-slate-400">
                  لا توجد مراحل محددة لهذه الصفقة بعد.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IoT Devices Section (Physical Goods) */}
      {dealType === 'physical' && (
        <Card className="border-purple-100 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Cpu size={20} />
              </div>
              <div>
                <CardTitle className="text-lg">تتبع الحالة (IoT Monitoring)</CardTitle>
                <CardDescription>مراقبة المنتج عبر أجهزة الاستشعار الذكية</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices?.map((device) => (
                <div key={device.id} className="p-4 rounded-xl border border-purple-50 bg-purple-50/30">
                  <div className="flex justify-between items-center mb-3">
                    <Badge className={device.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}>
                      {device.status === 'active' ? 'متصل' : 'تنبيه'}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">{device.deviceId}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {device.deviceType === 'gps_tracker' ? <MapPin className="text-purple-500" size={18} /> : <Activity className="text-purple-500" size={18} />}
                      <div>
                        <p className="text-xs text-slate-500">آخر قراءة</p>
                        <p className="text-sm font-bold">
                          {device.deviceType === 'gps_tracker' ? 'طرابلس، ليبيا' : 'درجة الحرارة: 22°C'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!devices || devices.length === 0) && (
                <div className="col-span-2 text-center py-8 text-slate-400 border border-dashed rounded-xl">
                  لم يتم ربط أجهزة IoT بهذه الصفقة.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blockchain Transparency Section */}
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <CardTitle className="text-lg">سجل الشفافية (Blockchain Logs)</CardTitle>
              <CardDescription>سجل غير قابل للتغيير لجميع حركات الصفقة</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs?.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{log.action}</p>
                    <p className="text-xs text-slate-400 font-mono">{log.txHash.substring(0, 16)}...</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                  <ExternalLink size={14} className="ml-1" />
                  عرض
                </Button>
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <div className="text-center py-6 text-slate-400 text-sm">
                سيتم تسجيل الحركات على البلوك تشين عند بدء الصفقة.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
