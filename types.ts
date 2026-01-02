
export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  embedding?: number[];
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  content: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: { name: string; text: string }[];
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}
