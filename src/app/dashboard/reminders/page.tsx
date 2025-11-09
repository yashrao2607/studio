
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, Loader2, Mail, MessageSquare, Calendar as CalendarIcon, Clock, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import emailjs from '@emailjs/browser';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';

const reminderFormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  medicine: z.string().min(2, 'Medicine name is required.'),
  date: z.date({
    required_error: "A date is required.",
  }),
  time: z.string().min(1, 'Time is required'),
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
      medicine: '',
      time: '',
      message: '',
    },
  });

  async function onSubmit(values: z.infer<typeof reminderFormSchema>) {
    setIsSending(true);

    const formattedDate = format(values.date, "PPP");

    const templateParams = {
        'to_email': values.email,
        'medicine': values.medicine,
        'date': formattedDate,
        'time': values.time,
        'reminder_message': values.message,
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
        description: `Email has been sent to ${values.email}.`,
      });
      form.reset();

    } catch (error: any) {
      console.error('EmailJS Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error Sending Reminder',
        description: "Failed to send email. Please check that your EmailJS template variables (e.g. {{medicine}}, {{time}}, {{date}}) exactly match the keys sent from the app. Variables cannot contain spaces or special characters. Also, ensure the 'To Email' field in your template settings is set to {{to_email}}.",
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
          <CardDescription>Fill out the form to send a reminder email. The email is sent instantly.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="medicine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicine Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Pill className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g. Paracetamol" {...field} className="pl-9" disabled={isSending} />
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
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                disabled={isSending}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0,0,0,0))
                                }
                                initialFocus
                            />
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
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="time" {...field} className="pl-9" disabled={isSending} />
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Message</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea placeholder="e.g. 'Don't forget to take it with food.'" {...field} className="pl-9" disabled={isSending} />
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
          <CardDescription>View all your sent email reminders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {reminders.length > 0 ? (
                    reminders.map((r) => (
                    <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.email}</TableCell>
                        <TableCell>{r.medicine}</TableCell>
                        <TableCell>{format(r.date, "PP")} at {r.time}</TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => {
                            setReminders(rems => rems.filter(rem => rem.id !== r.id));
                            toast({ title: 'Reminder Deleted', description: 'The reminder has been removed from history.'});
                        }}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={4} className="text-center">No reminders sent yet.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
