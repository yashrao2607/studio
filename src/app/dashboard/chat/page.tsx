
"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Loader2, Paperclip } from 'lucide-react';
import { answerQuestionsAboutReport } from '@/ai/flows/answer-questions-about-report';
import { useToast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { extractTextFromDocument } from '@/ai/flows/extract-text-from-document';
import { indexReport } from '@/ai/flows/index-report-flow';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type Message = {
  sender: 'user' | 'ai';
  text: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isUploading]);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || !firestore) return;
    
    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const dataUri = await readFileAsDataURL(file);
      const { text } = await extractTextFromDocument({ fileDataUri: dataUri });

      if (!text) {
        throw new Error("Could not extract text from the document.");
      }

      const storage = getStorage();
      const storageRef = ref(storage, `users/${user.uid}/reports/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(snapshot.ref);

      const reportsRef = collection(firestore, 'users', user.uid, 'reports');
      const docRef = await addDoc(reportsRef, {
        name: file.name,
        text: text,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
      });
      
      toast({ title: 'Success', description: 'Report uploaded. Now indexing for AI chat...' });
      
      const indexingResult = await indexReport({ text, reportId: docRef.id, userId: user.uid });
      if (indexingResult.success) {
        toast({ title: 'Indexing Complete', description: 'You can now ask questions about this report.' });
      } else {
        throw new Error("Failed to index the report for AI chat.");
      }

    } catch (err: any) {
      console.error("Error processing file:", err);
      toast({ variant: 'destructive', title: 'Processing Failed', description: err.message || 'There was an error processing your report.' });
    } finally {
        setIsUploading(false);
        // Reset file input
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading || !user) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
        const result = await answerQuestionsAboutReport({ question: currentInput, userId: user.uid });
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
         {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Bot size={48} className="mx-auto" />
              <p className="mt-2">Ask me anything about your reports.</p>
              <p className="text-xs">Upload documents using the paperclip icon to begin.</p>
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
        {isUploading && (
            <div className="flex items-start gap-3 justify-center">
                <div className="rounded-2xl p-3 max-w-md bg-muted flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Processing your document...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-background">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder={"Ask about your reports..."}
                className="pr-24"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading || isUploading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileChange(e.target.files)} accept=".pdf,image/*" />
                <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isUploading}>
                  <Paperclip className="h-5 w-5" />
                   <span className="sr-only">Upload Document</span>
                </Button>
                <Button size="icon" onClick={handleSendMessage} disabled={isLoading || isUploading || !input}>
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
