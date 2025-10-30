"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, BarChart, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { summarizeUploadedReport } from '@/ai/flows/summarize-uploaded-report';
import { extractTextFromDocument } from '@/ai/flows/extract-text-from-document';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Report = {
  id: string;
  name: string;
  createdAt: any;
  imageUrl: string;
  text?: string;
};

export default function ReportsPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const reportsRef = useMemo(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'reports');
  }, [user, firestore]);

  const { data: reports, loading: reportsLoading, error } = useCollection(reportsRef);

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || !firestore) return;
    
    const file = files[0];
    setIsUploading(true);
    
    try {
      // 1. Convert file to data URI
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async (e) => {
        const dataUri = e.target?.result as string;

        // 2. Extract text using AI
        const { text } = await extractTextFromDocument({ fileDataUri: dataUri });

        // 3. Upload image to Firebase Storage
        const storage = getStorage();
        const storageRef = ref(storage, `users/${user.uid}/reports/${file.name}_${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(snapshot.ref);

        // 4. Save report to Firestore
        if (reportsRef) {
            await addDoc(reportsRef, {
              name: file.name,
              text: text,
              imageUrl: imageUrl,
              createdAt: serverTimestamp(),
            });
        }

        toast({ title: 'Success', description: 'Report uploaded and processed successfully.' });
      };

      reader.onerror = (error) => {
        console.error("File reading error:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not read the file.' });
        setIsUploading(false);
      }

    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'There was an error processing your report.' });
      setIsUploading(false);
    } finally {
      // Set inside onload/onerror to ensure it's called after async operations
      // setIsUploading(false);
    }
  };
  
  // This function is called when the file reader is done.
  const onReaderLoad = async (e: ProgressEvent<FileReader>, file: File) => {
    if (!user || !firestore || !reportsRef) return;
    try {
        const dataUri = e.target?.result as string;

        // 2. Extract text using AI
        const { text } = await extractTextFromDocument({ fileDataUri: dataUri });

        // 3. Upload file to Firebase Storage
        const storage = getStorage();
        // Use a unique name to avoid overwrites
        const storageRef = ref(storage, `users/${user.uid}/reports/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // 4. Save report to Firestore
        await addDoc(reportsRef, {
            name: file.name,
            text: text,
            imageUrl: downloadURL, // The URL to view the file (image or otherwise)
            createdAt: serverTimestamp(),
        });
        
        toast({ title: 'Success', description: 'Report uploaded and processed successfully.' });

    } catch (err) {
        console.error("Error processing file:", err);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'There was an error processing your report.' });
    } finally {
        setIsUploading(false);
    }
  }


  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };
  
  const handleAnalyze = async (report: Report) => {
    if (!report.imageUrl) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot analyze this report. Image URL is missing.' });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setIsModalOpen(true);
    try {
      const result = await summarizeUploadedReport({ fileDataUri: report.imageUrl });
      setAnalysisResult(result.summary);
    } catch(error) {
      console.error(error);
      setAnalysisResult('Failed to analyze the report. Please try again.');
      toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not get summary from AI.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (report: Report) => {
    if(!user || !firestore) return;
    
    const isConfirmed = confirm(`Are you sure you want to delete "${report.name}"?`);
    if(!isConfirmed) return;

    try {
      // Delete from Firestore
      const reportDocRef = doc(firestore, 'users', user.uid, 'reports', report.id);
      await deleteDoc(reportDocRef);

      // Delete from Storage
      const storage = getStorage();
      const imageRef = ref(storage, report.imageUrl);
      await deleteObject(imageRef);

      toast({ title: "Report Deleted", description: `"${report.name}" has been removed.` });
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({ variant: "destructive", title: "Deletion Failed", "description": "Could not delete the report." });
    }
  };


  return (
    <div className="space-y-6">
       {!user && (
         <Alert variant="destructive">
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to upload and manage reports. Please log in to continue.
          </AlertDescription>
        </Alert>
      )}
      <Card
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed transition-colors ${isDragging ? 'border-primary bg-primary/10' : ''} ${!user || isUploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <label htmlFor="file-upload" className={user ? "cursor-pointer" : "cursor-not-allowed"}>
          <CardContent className="p-6 flex flex-col items-center justify-center space-y-2 text-center">
            {isUploading ? (
              <>
                <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                <p className="text-lg font-semibold">Processing your report...</p>
                <p className="text-muted-foreground">This may take a moment. Please wait.</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-12 h-12 text-muted-foreground" />
                <p className="text-lg font-semibold">Drag & drop files here, or click to select</p>
                <p className="text-muted-foreground">PDF or Image files are supported</p>
              </>
            )}
            <input id="file-upload" type="file" className="hidden" onChange={(e) => handleFileChange(e.target.files)} accept=".pdf,image/*" disabled={!user || isUploading}/>
          </CardContent>
        </label>
      </Card>
      <div>
        <h2 className="text-2xl font-semibold mb-4">Uploaded Reports</h2>
        {reportsLoading && <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"><Loader2 className="animate-spin" /></div>}
        {!reportsLoading && reports && reports.length === 0 && (
            <p className="text-muted-foreground">No reports uploaded yet. Upload one to get started.</p>
        )}
        {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>Could not load reports.</AlertDescription></Alert>}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports?.map((report) => (
            <Card key={report.id} className="overflow-hidden group">
              <CardHeader className="p-0 relative">
                <Image
                  src={report.imageUrl}
                  alt={report.name}
                  width={400}
                  height={300}
                  className="object-cover w-full h-48"
                  // Show a generic icon for non-image files
                  onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUtdGV4dCI+PHBhdGggZD0iTTE0LjUgMiBITCBhMiAyIDAgMCAwLTIgMnYxNmEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJWOVoiLz48cG9seWxpbmUgcG9pbnRzPSIxNCAyIDE0IDkgMjEgOSIvPjxwYXRoIGQ9Ik0xNiAxM0g4Ii8+PHBhdGggZD0iTTE2IDE3SDgiLz48cGF0aCBkPSJNMTAgOUg4Ii8+PC9zdmc+'; e.currentTarget.className="object-contain w-full h-48 p-4 text-muted-foreground"; }}
                />
                 <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(report)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete report</span>
                  </Button>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="truncate">{report.name}</CardTitle>
                <CardDescription>Uploaded on {report.createdAt?.toDate().toLocaleDateString()}</CardDescription>
              </CardContent>
              <CardFooter className="p-4 flex gap-2">
                <Button asChild variant="outline" className="w-full">
                   <a href={report.imageUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" /> View
                   </a>
                </Button>
                <Button className="w-full" onClick={() => handleAnalyze(report)}>
                   <BarChart className="mr-2 h-4 w-4" /> Analyze
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Report Analysis</DialogTitle>
            <DialogDescription>
              AI-powered summary of your report.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {isAnalyzing ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
                {analysisResult}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    