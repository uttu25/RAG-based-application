
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export class GeminiService {
  /**
   * For simplicity and high performance without a complex vector DB, 
   * we use a sophisticated prompt-based RAG approach. 
   * Given our context window of 1M+ tokens in Gemini 1.5/2.5 models, 
   * for standard documents, we can actually pass the most relevant 
   * chunks directly in the prompt.
   */
  static async askQuestion(question: string, context: string) {
    const modelName = 'gemini-3-flash-preview';
    
    const prompt = `
      You are an expert document assistant. I will provide you with chunks of text from several documents.
      Answer the question using ONLY the provided context. 
      If the answer is not in the context, say "I'm sorry, I don't have enough information in the uploaded documents to answer that."
      
      Always cite the source document name if possible.
      
      CONTEXT:
      ---
      ${context}
      ---
      
      QUESTION: ${question}
      
      ANSWER:
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.2, // Low temperature for factual accuracy
      }
    });

    return response.text || "No response generated.";
  }

  /**
   * Although Gemini 1.5 models have massive context, we still simulate 
   * embedding-based retrieval to provide a "RAG" experience as requested.
   * Since we can't easily perform high-speed cosine similarity on 
   * thousands of embeddings purely in JS without a library like 'hnswlib-js', 
   * we will use a "Reranking" or "Relevance Search" approach.
   */
  static async getRelevantContext(query: string, chunks: any[]): Promise<string> {
    // If we have very few chunks, just send them all.
    // Otherwise, we perform a keyword-based filter before sending to Gemini
    // Or, better yet, we can ask Gemini to filter the chunks for us (Small context RAG)
    
    // For this implementation, we will perform a simple keyword overlap matching 
    // to pick the top 20 most relevant chunks to keep the prompt size manageable 
    // and focus on speed.
    
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    
    const scoredChunks = chunks.map(chunk => {
      let score = 0;
      const chunkTextLower = chunk.text.toLowerCase();
      queryTerms.forEach(term => {
        if (chunkTextLower.includes(term)) score += 1;
      });
      return { chunk, score };
    });

    const topChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(item => `[Source: ${item.chunk.documentName}]\n${item.chunk.text}`)
      .join('\n\n---\n\n');

    return topChunks;
  }
}
