import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '../components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  ShieldCheck, AlertTriangle, XCircle, Clock, Key, BarChart3, Activity, Settings
} from 'lucide-react';

export default function BusinessDashboard() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const statsQuery = trpc.diaas.getClientStats.useQuery(
    { clientId, clientSecret },
    { enabled: isAuthenticated }
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientId && clientSecret) {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ShieldCheck className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">وثّقلي للأعمال</CardTitle>
            <CardDescription>سجل الدخول للوصول إلى لوحة تحكم الهوية الرقمية</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client ID</label>
                <Input 
                  value={clientId} 
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="wth_client_..." 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Secret</label>
                <Input 
                  type="password"
                  value={clientSecret} 
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="wth_secret_..." 
                />
              </div>
              <Button type="submit" className="w-full">دخول</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = statsQuery.data?.stats;
  const chartData = stats ? [
    { name: 'مقبول', value: stats.approved, color: '#10b981' },
    { name: 'مرفوض', value: stats.rejected, color: '#ef4444' },
    { name: 'مراجعة', value: stats.flagged, color: '#f59e0b' },
    { name: 'قيد الانتظار', value: stats.pending, color: '#64748b' },
  ] : [];

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">لوحة تحكم الأعمال</h1>
          <p className="text-slate-500">مرحباً بك، {statsQuery.data?.clientName}</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setIsAuthenticated(false)}>تسجيل الخروج</Button>
          <Button className="flex gap-2">
            <Settings className="w-4 h-4" /> الإعدادات
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="إجمالي الطلبات" 
          value={stats?.totalRequests || 0} 
          icon={<Activity className="w-6 h-6 text-blue-500" />} 
          description="جميع محاولات التحقق"
        />
        <StatCard 
          title="طلبات مقبولة" 
          value={stats?.approved || 0} 
          icon={<ShieldCheck className="w-6 h-6 text-emerald-500" />} 
          description="تم التحقق بنجاح"
        />
        <StatCard 
          title="طلبات مرفوضة" 
          value={stats?.rejected || 0} 
          icon={<XCircle className="w-6 h-6 text-red-500" />} 
          description="فشل في التحقق"
        />
        <StatCard 
          title="تحت المراجعة" 
          value={stats?.flagged || 0} 
          icon={<AlertTriangle className="w-6 h-6 text-amber-500" />} 
          description="تتطلب مراجعة يدوية"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> توزيع الحالات
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Usage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" /> آخر النشاطات (API Logs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوقت</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>وقت الاستجابة</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsQuery.data?.recentUsage.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{new Date(log.createdAt).toLocaleString('ar-LY')}</TableCell>
                    <TableCell className="font-mono text-xs">{log.endpoint}</TableCell>
                    <TableCell>
                      <Badge variant={log.statusCode === 200 ? 'success' : 'destructive'}>
                        {log.statusCode}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.responseTimeMs}ms</TableCell>
                    <TableCell className="text-xs">{log.ipAddress}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" /> مفاتيح API الخاصة بك
          </CardTitle>
          <CardDescription>استخدم هذه المفاتيح للمصادقة عند استدعاء API وثّقلي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-100 rounded-lg">
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Client ID</p>
              <p className="font-mono">{clientId}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(clientId)}>نسخ</Button>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-100 rounded-lg">
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Client Secret</p>
              <p className="font-mono">********************************</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(clientSecret)}>نسخ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon, description }: { title: string, value: number | string, icon: React.ReactNode, description: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {icon}
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-bold">{value}</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
