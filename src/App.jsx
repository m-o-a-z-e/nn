import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Sparkles, BookOpen, Sun, Moon } from 'lucide-react';

const START_WEBHOOK =
  'https://n8nabdullahanas.dpdns.org/webhook/rusa-ifla-chat-start-v2';

const STATUS_WEBHOOK =
  'https://n8nabdullahanas.dpdns.org/webhook/rusa-ifla-chat-status-v2';

const POLL_INTERVAL = 3000;
const MAX_WAIT_TIME = 10 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateSafeId = () => {
  try {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch (e) {
    console.error('ID generation error:', e);
  }

  return (
    'id-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 11)
  );
};

export default function App() {
  const [sessionId] = useState(() => {
    let id = sessionStorage.getItem('chat-session-id');

    if (!id) {
      id = generateSafeId();
      sessionStorage.setItem('chat-session-id', id);
    }

    return id;
  });

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'أهلاً بك! أنا **ميسرة**، الوكيل المرجعي الذكي لمكتبة كلية الآداب بجامعة طنطا. كيف يمكنني مساعدتك اليوم؟'
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const pollForResult = async (taskId) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < MAX_WAIT_TIME) {
      try {
        const url = new URL(STATUS_WEBHOOK);
        url.searchParams.set('taskId', taskId);
        url.searchParams.set('sessionId', sessionId);

        const response = await fetch(url.toString(), {
          method: 'GET',
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();

          if (data.status === 'completed') {
            if (!data.output) {
              throw new Error('اكتمل التنفيذ ولكن لم يتم إرجاع إجابة.');
            }
            return data.output;
          }

          if (data.status === 'error') {
            throw new Error(data.error || 'حدث خطأ أثناء تنفيذ الطلب.');
          }
        }
      } catch (error) {
        console.warn('Temporary polling error:', error);
      }

      await sleep(POLL_INTERVAL);
    }

    throw new Error(
      'استغرق تنفيذ الطلب وقتاً أطول من المتوقع. يرجى إعادة المحاولة.'
    );
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const taskId = generateSafeId();

    setInput('');

    const newMessages = [
      ...messages,
      {
        role: 'user',
        content: userMessage
      }
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const startResponse = await fetch(START_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatInput: userMessage,
          sessionId,
          taskId
        })
      });

      if (!startResponse.ok) {
        throw new Error(`تعذر بدء الطلب. HTTP ${startResponse.status}`);
      }

      const output = await pollForResult(taskId);

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: output
        }
      ]);
    } catch (error) {
      console.error('Chat error:', error);

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content:
            'عذراً، تعذر إكمال الطلب حالياً. يرجى إعادة المحاولة.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans"
      dir="rtl"
    >
      <header className="bg-blue-950 dark:bg-slate-950 text-white shadow-md px-6 py-4 flex items-center justify-between border-b border-blue-900 dark:border-slate-800 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-900 dark:bg-slate-800 flex items-center justify-center border border-blue-700 dark:border-slate-700 shadow-inner">
            <Bot className="w-6 h-6 text-amber-400" />
          </div>

          <div>
            <h1 className="font-bold text-lg tracking-wide text-white flex items-center gap-2">
              ميسرة
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                الوكيل المرجعي
              </span>
            </h1>

            <p className="text-xs text-blue-300 dark:text-slate-400">
              مكتبة كلية الآداب - جامعة طنطا
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-blue-200 bg-blue-900/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-blue-800 dark:border-slate-700">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>متاح للرد الفوري</span>
          </div>

          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-blue-900 dark:hover:bg-slate-800 transition-colors"
            title="تبديل المظهر"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-blue-200" />
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-900 dark:bg-slate-800 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm mt-1 border border-transparent dark:border-slate-700">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-4 rounded-2xl max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed shadow-sm transition-colors duration-300 ${
                msg.role === 'user'
                  ? 'bg-blue-900 dark:bg-blue-700 text-white rounded-bl-none'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-br-none'
              }`}
            >
              <div className="markdown-content">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-full bg-blue-900 dark:bg-slate-800 text-amber-400 flex items-center justify-center shadow-sm border border-transparent dark:border-slate-700">
              <Bot className="w-4 h-4" />
            </div>

            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs transition-colors duration-300">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
              <span>جاري البحث وإعداد الإجابة...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-lg transition-colors duration-300">
        <form
          onSubmit={sendMessage}
          className="max-w-4xl mx-auto flex gap-2 items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب استفسارك هنا..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 dark:focus:ring-blue-500/20 focus:border-blue-900 dark:focus:border-blue-500 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-900 dark:bg-blue-700 hover:bg-blue-900/90 dark:hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-3 rounded-xl flex items-center justify-center transition-all shadow-sm flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
          الخدمة المرجعية الذكية • جامعة طنطا
        </p>
      </div>
    </div>
  );
}
