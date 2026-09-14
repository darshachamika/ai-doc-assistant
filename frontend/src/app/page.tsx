'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, RotateCcw } from 'lucide-react';
import type { Message } from '../types/chat';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Session ID initialize කිරීම සහ History Load කරගැනීම
  useEffect(() => {
    let currentSession = localStorage.getItem('ai_chat_session_id');
    if (!currentSession) {
      currentSession = crypto.randomUUID();
      localStorage.setItem('ai_chat_session_id', currentSession);
    }
    setSessionId(currentSession);
    loadChatHistory(currentSession);
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // DB එකෙන් History fetch කිරීම
  const loadChatHistory = async (session: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/chat/history/${session}`);
      if (!res.ok) return;
      const historyData = await res.json();

      const formattedMessages: Message[] = [];
      historyData.forEach((item: { id: number; user_prompt: string; ai_response: string; created_at: string }) => {
        formattedMessages.push({
          id: `user-${item.id}`,
          role: 'user',
          content: item.user_prompt,
          timestamp: new Date(item.created_at),
        });
        formattedMessages.push({
          id: `ai-${item.id}`,
          role: 'assistant',
          content: item.ai_response,
          timestamp: new Date(item.created_at),
        });
      });

      setMessages(formattedMessages);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  // Chat Session එක Reset කිරීම
  const handleNewChat = () => {
    const newSession = crypto.randomUUID();
    localStorage.setItem('ai_chat_session_id', newSession);
    setSessionId(newSession);
    setMessages([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userPrompt = input.trim();
    setInput('');

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userPrompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 2. Stream AI response from FastAPI backend
      const response = await fetch('http://127.0.0.1:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, session_id: sessionId }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming connection failed');
      }

      const botMessageId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId ? { ...msg, content: accumulatedText } : msg
          )
        );
      }

      // 3. Stream එක අවසන් වූ පසු Database එකට save කිරීම
      if (accumulatedText.trim()) {
        await fetch('http://127.0.0.1:8000/api/chat/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request: { prompt: userPrompt, session_id: sessionId },
            ai_response: accumulatedText,
          }),
        });
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ Failed to get stream response from backend.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-wide">AI Document Assistant</h1>
            <p className="text-xs text-slate-400 font-mono">Session: {sessionId.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Chat
          </button>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            SQLite Sync
          </span>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Bot className="w-12 h-12 stroke-[1.5]" />
            <p className="text-sm">Ask anything to stream the AI response and save it to SQLite.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center border border-indigo-500/30 shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </section>

      <footer className="border-t border-slate-800 bg-slate-900/50 p-4 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your prompt here..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl flex items-center justify-center transition shadow-lg shadow-indigo-600/20"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </footer>
    </main>
  );
}