
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MessageSquare, Phone, User, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const reminderFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().min(10, 'Please enter a valid phone number.'),
  message: z.string().min(5, 'Message must be at least 5 characters.'),
  date: z.date({ required_error: 'A date is required.' }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:MM format.'),
});

type Reminder = z.infer<typeof reminderFormSchema> & { id: number };

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reminderFormSchema>>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      message: '',
      time: '09:00',
    },
  });

  async function onSubmit(values: z.infer<typeof reminderFormSchema>) {
    setIsSending(true);
    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: values.phone,
          message: values.message,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to send reminder.');
      }

      const newReminder = { ...values, id: Date.now() };
      setReminders(prev => [newReminder, ...prev]);
      toast({
        title: 'Reminder Sent!',
        description: `SMS scheduled for ${values.name}.`,
      });
      form.reset({ name: '', phone: '', message: '', time: '09:00' });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Sending Reminder',
        description: error.message || 'An unknown error occurred.',
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
          <CardDescription>Fill out the form to schedule a medication reminder via SMS.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g. John Doe" {...field} className="pl-9" disabled={isSending} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="9999999999" {...field} className="pl-9" disabled={isSending} />
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                              disabled={isSending}
                            >
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time (24h)</FormLabel>
                       <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="HH:MM" {...field} className="pl-9" disabled={isSending} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSending ? 'Sending...' : 'Send Reminder'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Reminder History</CardTitle>
          <CardDescription>View all your scheduled reminders.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.length > 0 ? (
                reminders.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{format(r.date, 'PPP')} at {r.time}</TableCell>
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
