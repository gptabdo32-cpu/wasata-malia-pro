import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/core/hooks/useAuth";
import { toast } from "sonner";
import {
  Shield,
  Send,
  Lock,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface MediatorPanelProps {
  mediatorRequestId: number;
  conversationId: number;
  mediatorId?: number;
  mediatorName?: string;
  status: "pending" | "accepted" | "active" | "resolved" | "cancelled";
}

export default function MediatorPanel({
  mediatorRequestId,
  conversationId,
  mediatorId,
  mediatorName = "وسيط وثقلي",
  status,
}: MediatorPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [activeTab, setActiveTab] = useState("messages");
  const [showPrivateChat, setShowPrivateChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: mediatorMessages } = trpc.mediator.getMediatorMessages.useQuery(
    { conversationId, limit: 50, offset: 0 },
    { refetchInterval: 2000, enabled: status === "active" }
  );

  const sendMediatorMessageMutation = trpc.mediator.sendMediatorMessage.useMutation();

  useEffect(() => {
    if (mediatorMessages) {
      setMessages(mediatorMessages);
      scrollToBottom();
    }
  }, [mediatorMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    try {
      await sendMediatorMessageMutation.mutateAsync({
        mediatorRequestId,
        conversationId,
        content: messageInput,
        messageType: "text",
      });
      setMessageInput("");
      toast.success("تم إرسال الرسالة");
    } catch (error) {
      toast.error("فشل إرسال الرسالة");
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "resolved":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "accepted":
        return <AlertCircle className="w-4 h-4" />;
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "pending":
        return "قيد الانتظار";
      case "accepted":
        return "تم قبول الطلب";
      case "active":
        return "نشط";
      case "resolved":
        return "تم الحل";
      default:
        return "غير معروف";
    }
  };

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-lg">{mediatorName}</h3>
              <p className="text-sm text-amber-100">وسيط معتمد</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(status)} flex items-center gap-1`}>
            {getStatusIcon(status)}
            {getStatusLabel(status)}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {status === "pending" ? (
          // Pending State
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="font-semibold text-yellow-900">جاري تعيين الوسيط</p>
              <p className="text-sm text-yellow-800 mt-1">
                سيتم تعيين وسيط في غضون ساعتين
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 ماذا يحدث الآن؟</p>
              <ul className="space-y-1 text-xs">
                <li>✓ تم استلام طلبك</li>
                <li>✓ تم خصم رسم الوسيط (10 دينار)</li>
                <li>⏳ جاري البحث عن وسيط متاح</li>
              </ul>
            </div>
          </div>
        ) : status === "accepted" ? (
          // Accepted State
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-semibold text-blue-900">تم قبول الطلب</p>
              <p className="text-sm text-blue-800 mt-1">
                الوسيط قد قبل طلبك وسيدخل الدردشة قريباً
              </p>
            </div>
          </div>
        ) : (
          // Active/Resolved State
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                الرسائل
              </TabsTrigger>
              <TabsTrigger value="private" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                خاص
              </TabsTrigger>
            </TabsList>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-3">
              <div className="bg-white rounded-lg border border-gray-200 h-64 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>لا توجد رسائل من الوسيط</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-amber-50 border border-amber-200 rounded-lg p-2"
                    >
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-900">
                            {mediatorName}
                          </p>
                          <p className="text-sm text-gray-800 break-words">
                            {msg.content}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString("ar-LY")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - Only for mediator */}
              {mediatorId === user?.id && status === "active" && (
                <div className="flex gap-2">
                  <Input
                    placeholder="اكتب رسالتك..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Private Chat Tab */}
            <TabsContent value="private" className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <Lock className="w-4 h-4 inline mr-2" />
                محادثة خاصة بينك وبين الوسيط فقط
              </div>
              <Button
                onClick={() => setShowPrivateChat(!showPrivateChat)}
                variant="outline"
                className="w-full"
              >
                {showPrivateChat ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    إغلاق المحادثة الخاصة
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    فتح المحادثة الخاصة
                  </>
                )}
              </Button>
              {showPrivateChat && (
                <div className="bg-white rounded-lg border border-gray-200 p-3 text-center text-gray-500">
                  <p className="text-sm">المحادثة الخاصة متاحة في قسم منفصل</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-3 rounded-b-lg text-xs text-gray-600 text-center">
        <Lock className="w-3 h-3 inline mr-1" />
        جميع الرسائل موثقة وآمنة. لا يمكن حذف رسائل الوسيط.
      </div>
    </Card>
  );
}
