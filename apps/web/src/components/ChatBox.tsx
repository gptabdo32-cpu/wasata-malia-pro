import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/core/hooks/useAuth";
import { Send, Paperclip, Mic, X } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: number;
  senderId: number;
  messageType: "text" | "image" | "audio" | "file";
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaDuration?: number;
  createdAt: Date;
}

interface ChatBoxProps {
  conversationId: number;
  otherUserName: string;
  otherUserId: number;
}

export default function ChatBox({
  conversationId,
  otherUserName,
  otherUserId,
}: ChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messagesData } = trpc.chat.getMessages.useQuery(
    { conversationId, limit: 50, offset: 0 },
    { refetchInterval: 2000 }
  );

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const sendImageMutation = trpc.chat.sendImage.useMutation();
  const sendAudioMutation = trpc.chat.sendAudio.useMutation();

  useEffect(() => {
    if (messagesData) {
      setMessages(messagesData as Message[]);
      scrollToBottom();
    }
  }, [messagesData]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      await sendMessageMutation.mutateAsync({
        conversationId,
        content: inputValue,
      });
      setInputValue("");
      toast.success("تم إرسال الرسالة");
    } catch (error) {
      toast.error("فشل إرسال الرسالة");
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(",")[1];

        await sendImageMutation.mutateAsync({
          conversationId,
          imageData: base64Data,
          fileName: file.name,
        });
        toast.success("تم إرسال الصورة");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("فشل إرسال الصورة");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        const chunks = audioChunksRef.current ?? [];
        chunks.push(event.data);
        audioChunksRef.current = chunks;
      };

      mediaRecorder.onstop = async () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current ?? [], {
          type: "audio/mp3",
        });
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          const base64Data = base64.split(",")[1];

          try {
            await sendAudioMutation.mutateAsync({
              conversationId,
              audioData: base64Data,
              duration: recordingTime,
              fileName: `audio-${Date.now()}.mp3`,
            });
            toast.success("تم إرسال الرسالة الصوتية");
          } catch (error) {
            toast.error("فشل إرسال الرسالة الصوتية");
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error("فشل الوصول إلى الميكروفون");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => {
        track.stop();
      });
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold">{otherUserName}</h3>
        <p className="text-sm text-blue-100">دردشة آمنة وموثقة</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>لا توجد رسائل حتى الآن. ابدأ المحادثة!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  message.senderId === user?.id
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                {message.messageType === "text" && (
                  <p className="break-words">{message.content}</p>
                )}

                {message.messageType === "image" && message.mediaUrl && (
                  <img
                    src={message.mediaUrl}
                    alt="رسالة صورة"
                    className="max-w-xs rounded cursor-pointer hover:opacity-80"
                    onClick={() => window.open(message.mediaUrl, "_blank")}
                  />
                )}

                {message.messageType === "audio" && message.mediaUrl && (
                  <div className="flex items-center gap-2">
                    <audio
                      controls
                      className="h-8"
                      src={message.mediaUrl}
                    />
                    {message.mediaDuration && (
                      <span className="text-xs opacity-75">
                        {message.mediaDuration}s
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs mt-1 opacity-75">
                  {new Date(message.createdAt).toLocaleTimeString("ar-LY")}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4 rounded-b-lg">
        {isRecording && (
          <div className="mb-3 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-600">
                جاري التسجيل: {recordingTime}s
              </span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={stopRecording}
              className="h-8"
            >
              <X className="w-4 h-4 mr-1" />
              إيقاف
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="اكتب رسالتك هنا..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            disabled={isRecording}
            className="flex-1"
          />

          {/* Attachment Button */}
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isRecording}
            />
            <Button
              variant="outline"
              size="icon"
              disabled={isRecording}
              asChild
            >
              <span>
                <Paperclip className="w-4 h-4" />
              </span>
            </Button>
          </label>

          {/* Audio Button */}
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
          >
            <Mic className="w-4 h-4" />
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isRecording}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          💡 يمكنك إرسال رسائل نصية وصور ورسائل صوتية. جميع الرسائل موثقة
          للتحقق من النزاعات.
        </p>
      </div>
    </div>
  );
}
