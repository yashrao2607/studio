"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { answerQuestionsAboutReport } from '@/ai/flows/answer-questions-about-report';
import { useToast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

type Message = {
  sender: 'user' | 'ai';
  text: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const reportsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    // Query to get all reports for the current user
    return query(collection(firestore, 'users', user.uid, 'reports'), orderBy('createdAt', 'desc'));
  }, [user, firestore]);

  const { data: reports, loading: reportsLoading } = useCollection(reportsQuery);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;

    if (!reports || reports.length === 0) {
        toast({
            variant: "destructive",
            title: "No Reports Found",
            description: "Please upload at least one report on the 'Reports' page before asking questions.",
        });
        return;
    }

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        // Combine the text from all reports into a single context
        const reportTexts = reports.map((report) => `Report Name: ${report.name}\nContent:\n${report.text}`).filter(Boolean);
        
        if (reportTexts.length === 0) {
            const aiMessage: Message = { sender: 'ai', text: "It seems none of your uploaded reports contain extractable text. Please try uploading different documents." };
            setMessages((prev) => [...prev, aiMessage]);
            setIsLoading(false);
            return;
        }

        const result = await answerQuestionsAboutReport({ reports: reportTexts, question: input });
        const aiMessage: Message = { sender: 'ai', text: result.answer };
        setMessages((prev) => [...prev, aiMessage]);
    } catch(error) {
        console.error("Error communicating with AI:", error);
        const errorMessage: Message = { sender: 'ai', text: "Sorry, I encountered an error while processing your question. Please try again." };
        setMessages((prev) => [...prev, errorMessage]);
        toast({
            variant: "destructive",
            title: "AI Communication Error",
            description: "There was an issue getting a response from the AI. Please check your connection and try again.",
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'ai' && (
              <Avatar className="w-8 h-8 border">
                <AvatarFallback><Bot size={18} /></AvatarFallback>
              </Avatar>
            )}
            <div className={`rounded-2xl p-3 max-w-lg prose prose-sm dark:prose-invert ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <p className="text-sm">{msg.text}</p>
            </div>
             {msg.sender === 'user' && (
              <Avatar className="w-8 h-8 border">
                <AvatarFallback><User size={18} /></AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
         {messages.length === 0 && !reportsLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Bot size={48} className="mx-auto" />
              <p className="mt-2">Ask me anything about your reports.</p>
              <p className="text-xs">Upload documents in the 'Reports' tab to begin.</p>
            </div>
          </div>
        )}
        {isLoading && (
            <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8 border">
                    <AvatarFallback><Bot size={18} /></AvatarFallback>
                </Avatar>
                <div className="rounded-2xl p-3 max-w-md bg-muted flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-background">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder={reportsLoading ? "Loading your reports..." : (reports && reports.length > 0 ? "Ask about your reports..." : "Upload a report to start chatting")}
                className="pr-12"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading || reportsLoading || !reports || reports.length === 0}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <Button size="icon" onClick={handleSendMessage} disabled={isLoading || reportsLoading || !input}>
                  <Send className="h-5 w-5" />
                   <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">You can ask questions about all the documents you have uploaded in the Reports page.</p>
      </div>
    </div>
  );
}

    