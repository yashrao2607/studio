'use server';
/**
 * @fileOverview This file defines a Genkit flow for summarizing uploaded reports (PDF or image) using AI.
 *
 * - summarizeUploadedReport - A function that takes a file (PDF or image) as input and returns a concise summary of its key findings.
 * - SummarizeUploadedReportInput - The input type for the summarizeUploadedReport function.
 * - SummarizeUploadedReportOutput - The return type for the summarizeUploadedReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeUploadedReportInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      'A report file (PDF or image) as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type SummarizeUploadedReportInput = z.infer<typeof SummarizeUploadedReportInputSchema>;

const SummarizeUploadedReportOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the report\'s key findings.'),
});
export type SummarizeUploadedReportOutput = z.infer<typeof SummarizeUploadedReportOutputSchema>;

export async function summarizeUploadedReport(input: SummarizeUploadedReportInput): Promise<SummarizeUploadedReportOutput> {
  return summarizeUploadedReportFlow(input);
}

const summarizeReportPrompt = ai.definePrompt({
  name: 'summarizeReportPrompt',
  input: {schema: SummarizeUploadedReportInputSchema},
  output: {schema: SummarizeUploadedReportOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert AI assistant that summarizes reports and papers.

  Summarize the key findings of the following report.

  Report: {{media url=fileDataUri}}`,
});

const summarizeUploadedReportFlow = ai.defineFlow(
  {
    name: 'summarizeUploadedReportFlow',
    inputSchema: SummarizeUploadedReportInputSchema,
    outputSchema: SummarizeUploadedReportOutputSchema,
  },
  async input => {
    const {output} = await summarizeReportPrompt(input);
    return output!;
  }
);
