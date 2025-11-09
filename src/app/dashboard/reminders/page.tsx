
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, Loader2, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import emailjs from '@emailjs/browser';

const reminderFormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  message: z.string().min(5, 'Message must be at least 5 characters.'),
});

type Reminder = z.infer<typeof reminderFormSchema> & { id: number };

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reminderFormSchema>>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      email: '',
      message: '',
    },
  });

  async function onSubmit(values: z.infer<typeof reminderFormSchema>) {
    setIsSending(true);

    const templateParams = {
        'reminder_message': values.message,
        'to_email': values.email,
    };

    try {
      const serviceID = 'service_ttbt6td';
      const templateID = 'template_651b2is';
      const publicKey = 'TD1Fw3yR8-K8hFRY1';

      await emailjs.send(serviceID, templateID, templateParams, publicKey);
      
      const newReminder = { ...values, id: Date.now() };
      setReminders(prev => [newReminder, ...prev]);
      toast({
        title: 'Reminder Sent!',
        description: `Email scheduled for ${values.email}.`,
      });
      form.reset({ email: '', message: ''});

    } catch (error: any) {
      console.error('EmailJS Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error Sending Reminder',
        description: "Failed to send email. Please check that your EmailJS template variable is exactly {{reminder_message}} and that the 'To Email' field in your template settings is set to {{to_email}}. Variables cannot contain spaces.",
        duration: 10000,
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Set a New Reminder</CardTitle>
          <CardDescription>Fill out the form to schedule a reminder via Email.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="patient@example.com" {...field} className="pl-9" disabled={isSending} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Message</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea placeholder="e.g. 'Time to take your morning medication.'" {...field} className="pl-9" disabled={isSending} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSending ? 'Sending Email...' : 'Send Email Reminder'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Reminder History</CardTitle>
          <CardDescription>View all your scheduled email reminders.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient Email</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.length > 0 ? (
                reminders.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{r.message}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => {
                         setReminders(rems => rems.filter(rem => rem.id !== r.id));
                         toast({ title: 'Reminder Deleted', description: 'The reminder has been removed.'});
                       }}>
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">No reminders set yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
