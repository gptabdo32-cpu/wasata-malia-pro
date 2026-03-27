import React, { useState } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ChatBox from "@/components/ChatBox";
import { MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Messaging() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationUserId, setNewConversationUserId] = useState("");
  const [newConversationSubject, setNewConversationSubject] = useState("");

  const { data: conversations, refetch } = trpc.chat.getConversations.useQuery();
  const createConversationMutation = trpc.chat.createConversation.useMutation();

  const activeConversation = conversations?.find((conversation: any) => conversation.id === selectedConversation);

  const handleCreateConversation = async () => {
    const otherUserId = Number(newConversationUserId);
    if (!Number.isFinite(otherUserId) || otherUserId <= 0) {
      toast.error("يرجى إدخال رقم مستخدم صحيح");
      return;
    }

    try {
      const result = await createConversationMutation.mutateAsync({
        otherUserId,
        subject: newConversationSubject.trim() || undefined,
      });
      await refetch();
      setSelectedConversation(result.conversationId);
      setShowNewConversation(false);
      setNewConversationUserId("");
      setNewConversationSubject("");
      toast.success("تم إنشاء المحادثة بنجاح");
    } catch {
      toast.error("فشل إنشاء المحادثة");
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">يرجى تسجيل الدخول أولاً</p>
          <Button onClick={() => setLocation("/")} className="bg-blue-600">
            العودة للرئيسية
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              الرسائل والدردشات
            </h1>
            <p className="text-gray-600 mt-2">تواصل آمن وموثق مع المشترين والبائعين</p>
          </div>
          <Button onClick={() => setShowNewConversation(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            محادثة جديدة
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="h-[600px] overflow-y-auto">
              <div className="p-4">
                <h2 className="font-semibold text-lg mb-4">المحادثات</h2>
                {!conversations || conversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد محادثات حتى الآن</p>
                    <p className="text-sm mt-2">ستظهر محادثاتك هنا عند بدء تواصل جديد</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv: any) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv.id)}
                        className={`w-full text-right p-3 rounded-lg transition-colors ${selectedConversation === conv.id ? "bg-blue-100 border-2 border-blue-600" : "bg-gray-50 hover:bg-gray-100 border border-gray-200"}`}
                      >
                        <h3 className="font-semibold text-sm">{conv.subject}</h3>
                        <p className="text-xs text-gray-500 mt-1">{conv.otherUserName}</p>
                        {conv.updatedAt && (
                          <p className="text-xs text-gray-400 mt-1">{new Date(conv.updatedAt).toLocaleDateString("ar-LY")}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedConversation ? (
              <ChatBox
                conversationId={selectedConversation}
                otherUserName={activeConversation?.otherUserName ?? "المستخدم الآخر"}
                otherUserId={activeConversation?.otherUserId ?? 0}
              />
            ) : (
              <Card className="h-[600px] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-blue-400 opacity-50" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">اختر محادثة</h3>
                  <p className="text-gray-500 mb-6">اختر محادثة من القائمة لبدء الدردشة</p>
                  <div className="bg-white rounded-lg p-6 max-w-sm mx-auto shadow-sm border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">✨ ميزات الدردشة الآمنة:</h4>
                    <ul className="text-sm text-gray-600 space-y-2 text-right">
                      <li>✓ رسائل نصية فورية</li>
                      <li>✓ مشاركة الصور والملفات</li>
                      <li>✓ رسائل صوتية مسجلة</li>
                      <li>✓ توثيق كامل للنزاعات</li>
                      <li>✓ تشفير الرسائل الحساسة</li>
                      <li>✓ سجل دائم للمحادثات</li>
                    </ul>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        <Card className="mt-8 bg-blue-50 border-blue-200 p-6">
          <h3 className="font-semibold text-blue-900 mb-3">📋 معلومات عن نظام الدردشة الآمن</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-1">🔒 الأمان</p>
              <p>جميع الرسائل محفوظة وآمنة مع إمكانية التشفير للرسائل الحساسة</p>
            </div>
            <div>
              <p className="font-semibold mb-1">📸 الوسائط المتعددة</p>
              <p>شارك الصور والرسائل الصوتية كأدلة توثيق للنزاعات والمعاملات</p>
            </div>
            <div>
              <p className="font-semibold mb-1">⏱️ السجل الدائم</p>
              <p>احتفظ بسجل كامل لجميع المحادثات لفض النزاعات والمراجعة</p>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء محادثة جديدة</DialogTitle>
            <DialogDescription>
              أدخل رقم المستخدم الآخر وعنوانًا اختياريًا لبدء المحادثة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">رقم المستخدم الآخر</label>
              <Input
                type="number"
                min="1"
                value={newConversationUserId}
                onChange={(e) => setNewConversationUserId(e.target.value)}
                placeholder="مثال: 24"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">عنوان اختياري</label>
              <Input
                value={newConversationSubject}
                onChange={(e) => setNewConversationSubject(e.target.value)}
                placeholder="مثال: مناقشة تفاصيل المعاملة"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>إلغاء</Button>
              <Button onClick={handleCreateConversation} disabled={createConversationMutation.isPending}>
                {createConversationMutation.isPending ? "جاري الإنشاء..." : "إنشاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
