'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting text from an uploaded document (PDF or image) using AI.
 *
 * - extractTextFromDocument - A function that takes a file (PDF or image) as input and returns its text content.
 * - ExtractTextFromDocumentInput - The input type for the extractTextFromDocument function.
 * - ExtractTextFromDocumentOutput - The return type for the extractTextFromDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTextFromDocumentInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A document file (PDF or image) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextFromDocumentInput = z.infer<typeof ExtractTextFromDocumentInputSchema>;

const ExtractTextFromDocumentOutputSchema = z.object({
  text: z.string().describe('The extracted text content of the document.'),
});
export type ExtractTextFromDocumentOutput = z.infer<typeof ExtractTextFromDocumentOutputSchema>;

export async function extractTextFromDocument(input: ExtractTextFromDocumentInput): Promise<ExtractTextFromDocumentOutput> {
  return extractTextFromDocumentFlow(input);
}


const extractTextFromDocumentFlow = ai.defineFlow(
  {
    name: 'extractTextFromDocumentFlow',
    inputSchema: ExtractTextFromDocumentInputSchema,
    outputSchema: ExtractTextFromDocumentOutputSchema,
  },
  async input => {
    const { text } = await ai.generate({
        prompt: `Extract all the text from the following document and return it in a JSON object with a single key "text".

Document: {{media url=fileDataUri}}`,
    });
    
    try {
        const parsed = JSON.parse(text);
        return ExtractTextFromDocumentOutputSchema.parse(parsed);
    } catch(e) {
        console.error("Failed to parse JSON from AI response for text extraction:", e);
        // Fallback: if parsing fails, wrap the raw text in the expected object structure.
        return { text: text };
    }
  }
);
