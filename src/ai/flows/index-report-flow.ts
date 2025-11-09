'use server';
/**
 * @fileOverview This file defines a Genkit flow for indexing a document's text into ChromaDB.
 *
 * - indexReport - A function that takes text content, splits it into chunks, generates embeddings, and stores them in ChromaDB.
 * - IndexReportInput - The input type for the indexReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Collection, CloudClient, CohereEmbeddingFunction } from 'chromadb';

// Define the input schema for the indexing flow
const IndexReportInputSchema = z.object({
  text: z.string().describe('The text content of the document to be indexed.'),
  reportId: z.string().describe('The unique ID of the report.'),
  userId: z.string().describe('The ID of the user who owns the report.'),
});
export type IndexReportInput = z.infer<typeof IndexReportInputSchema>;

// Exported function to be called from the frontend
export async function indexReport(
  input: IndexReportInput
): Promise<{ success: boolean }> {
  return indexReportFlow(input);
}

/**
 * Splits a long string of text into smaller chunks of a specified size.
 * @param text The text to split.
 * @param chunkSize The desired size of each chunk.
 * @returns An array of text chunks.
 */
function chunkText(text: string, chunkSize = 1000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

let myCollection: Collection | null = null;
const getMyCollection = async () => {
    if (!myCollection) {
      if (!process.env.COHERE_API_KEY) {
        throw new Error("COHERE_API_KEY environment variable not set.");
      }
      const embedder = new CohereEmbeddingFunction(process.env.COHERE_API_KEY);
      const chromaClient = new CloudClient({
        apiKey: process.env.CHROMA_API_KEY,
        tenant: process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE,
      });
      myCollection = await chromaClient.getOrCreateCollection({
        name: 'reports-collection',
        embeddingFunction: embedder
      });
    }
    return myCollection;
  };

const indexReportFlow = ai.defineFlow(
  {
    name: 'indexReportFlow',
    inputSchema: IndexReportInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    // 1. Chunk the document text
    const textChunks = chunkText(input.text);

    if (textChunks.length === 0) {
      console.log('No text to index.');
      return { success: true };
    }

    // 2. Prepare data for ChromaDB
    const ids = textChunks.map(
      (_, index) => `${input.reportId}-chunk-${index}`
    );
    const metadatas = textChunks.map(() => ({
      userId: input.userId,
      reportId: input.reportId,
    }));

    // 3. Add to ChromaDB collection.
    // ChromaDB will automatically handle embedding generation using the configured Cohere model.
    try {
      const collection = await getMyCollection();
      await collection.add({
        ids: ids,
        documents: textChunks,
        metadatas: metadatas,
      });
      console.log(`Successfully indexed ${textChunks.length} chunks for report ${input.reportId}`);
      return { success: true };

    } catch (error) {
      console.error('Failed to index data in ChromaDB:', error);
      // We are not throwing the error to prevent the entire flow from failing.
      // In a production app, you'd want more robust error handling/retry logic.
      return { success: false };
    }
  }
);
