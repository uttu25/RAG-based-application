
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Send, 
  Bot, 
  User, 
  Plus, 
  Trash2, 
  Loader2, 
  ChevronRight,
  BookOpen,
  Info
} from 'lucide-react';
import { DocumentProcessor } from './services/documentProcessor';
import { GeminiService } from './services/geminiService';
import { UploadedFile, Message, DocumentChunk } from './types';

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [allChunks, setAllChunks] = useState<DocumentChunk[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! Upload some documents (PDF or Word) and I can help you answer questions based on their content.',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnswering]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    setIsProcessing(true);
    const newFiles: UploadedFile[] = [];
    const newChunks: DocumentChunk[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const id = Math.random().toString(36).substring(7);
      
      try {
        const text = await DocumentProcessor.processFile(file);
        const chunks = DocumentProcessor.chunkText(text, id, file.name);
        
        newFiles.push({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          status: 'ready',
          content: text
        });
        
        newChunks.push(...chunks);
      } catch (error) {
        console.error("Error processing file:", file.name, error);
        newFiles.push({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          status: 'error',
          content: ''
        });
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    setAllChunks(prev => [...prev, ...newChunks]);
    setIsProcessing(false);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setAllChunks(prev => prev.filter(c => c.documentId !== id));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isAnswering) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsAnswering(true);

    try {
      if (allChunks.length === 0) {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-ai',
          role: 'assistant',
          content: "Please upload some documents first so I can provide grounded answers.",
          timestamp: Date.now()
        }]);
      } else {
        const context = await GeminiService.getRelevantContext(userMessage.content, allChunks);
        const answer = await GeminiService.askQuestion(userMessage.content, context);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-ai',
          role: 'assistant',
          content: answer,
          timestamp: Date.now()
        }]);
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: "I encountered an error while processing your request. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Document Management */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight">DocuGenie RAG</h1>
          </div>
          <p className="text-sm text-gray-500">Intelligent Document Assistant</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Uploaded Documents</h2>
            {files.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                <Upload className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No documents yet. Click the upload button to start.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map(file => (
                  <div key={file.id} className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 rounded text-indigo-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • {file.status}</p>
                      </div>
                      <button 
                        onClick={() => removeFile(file.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <label className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 cursor-pointer transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Add Documents</span>
            <input 
              type="file" 
              className="hidden" 
              multiple 
              accept=".pdf,.docx,.txt" 
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
          </label>
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-indigo-600 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Analyzing contents...</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content - Chat Interface */}
      <main className="flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-600">
              {allChunks.length > 0 ? `${allChunks.length} content segments embedded` : 'Awaiting documents'}
            </span>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                <Info className="w-3 h-3" />
                <span>Powered by Gemini 3 Flash</span>
             </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex gap-4 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                    <Bot className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === 'assistant' 
                    ? 'bg-white border border-gray-100 text-gray-800' 
                    : 'bg-indigo-600 text-white'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <div className={`text-[10px] mt-2 opacity-50 ${message.role === 'assistant' ? 'text-gray-400' : 'text-indigo-100'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 border border-indigo-700 shadow-sm">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isAnswering && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-gray-200 shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={allChunks.length > 0 ? "Ask a question about your documents..." : "Upload documents to start chatting"}
              disabled={allChunks.length === 0 || isAnswering}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isAnswering || allChunks.length === 0}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="max-w-3xl mx-auto text-[10px] text-gray-400 text-center mt-3">
            DocuGenie uses AI to analyze your files. Results may vary based on document quality and clarity.
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
