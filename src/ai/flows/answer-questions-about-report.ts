'use server';

/**
 * @fileOverview A flow that answers questions about a user-uploaded report using a RAG pipeline with ChromaDB.
 *
 * - answerQuestionsAboutReport - A function that accepts a user's question and returns a context-aware answer.
 * - AnswerQuestionsAboutReportInput - The input type for the answerQuestionsAboutReport function.
 * - AnswerQuestionsAboutReportOutput - The return type for the answerQuestionsAboutReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Collection, CloudClient, CohereEmbeddingFunction } from 'chromadb';

const AnswerQuestionsAboutReportInputSchema = z.object({
  question: z.string().describe('The question to ask about the reports.'),
  userId: z.string().describe('The ID of the user asking the question.'),
});
export type AnswerQuestionsAboutReportInput = z.infer<
  typeof AnswerQuestionsAboutReportInputSchema
>;

const AnswerQuestionsAboutReportOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about the report.'),
});
export type AnswerQuestionsAboutReportOutput = z.infer<
  typeof AnswerQuestionsAboutReportOutputSchema
>;

export async function answerQuestionsAboutReport(
  input: AnswerQuestionsAboutReportInput
): Promise<AnswerQuestionsAboutReportOutput> {
  return answerQuestionsAboutReportFlow(input);
}

// ChromaDB Client Initialization
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


// The main RAG flow
const answerQuestionsAboutReportFlow = ai.defineFlow(
  {
    name: 'answerQuestionsAboutReportFlow',
    inputSchema: AnswerQuestionsAboutReportInputSchema,
    outputSchema: AnswerQuestionsAboutReportOutputSchema,
  },
  async (input) => {
    // Phase 2: Retrieval
    // 1. ChromaDB will automatically create an embedding for the query text.
    
    // 2. Perform a semantic search in ChromaDB
    const collection = await getMyCollection();
    const queryResults = await collection.query({
        queryTexts: [input.question],
        nResults: 5, // Retrieve the top 5 most relevant chunks
        where: {
            "userId": input.userId // Filter results for the current user
        }
    });

    // 3. Assemble the context from the retrieved chunks
    const retrievedDocs = queryResults.documents[0] || [];
    const context = retrievedDocs.join('\n\n---\n\n');

    if (retrievedDocs.length === 0) {
        return { answer: "I couldn't find any relevant information in your documents to answer that question. Please try uploading more documents or rephrasing your question." };
    }

    // Phase 3: Generation
    // 4. Define a prompt template that includes the context
    const finalPrompt = `You are an AI assistant that answers questions based *only* on the provided context from user-uploaded documents. If the answer is not found in the context, say "I could not find an answer in the provided documents."

Context from documents:
"""
${context}
"""

Question:
"""
${input.question}
"""

Based on the context above, what is the answer?`;
    
    // 5. Call the LLM to generate an answer
    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: finalPrompt,
    });

    return { answer: text };
  }
);
