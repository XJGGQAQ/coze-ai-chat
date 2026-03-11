'use client';

import { useState, useRef, useEffect } from 'react';

interface Message { id: string; role: 'user' | 'assistant'; content: string; }

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMessage = { id: Date.now().toString(), role: 'user' as const, content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, conversationId }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('无法读取响应');

      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) { currentEvent = line.slice(6).trim(); continue; }
          if (line.startsWith('data:')) {
            try {
              const jsonStr = line.slice(5).trim();
              if (jsonStr === '"[DONE]"' || jsonStr === '[DONE]') continue;
              const data = JSON.parse(jsonStr);
              if (data.conversation_id) setConversationId(data.conversation_id);
              if (currentEvent === 'conversation.message.delta' && data.role === 'assistant' && data.type === 'answer') {
                const content = data.content || '';
                if (content) setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + content } : m));
              }
              if (currentEvent === 'conversation.message.completed' && data.role === 'assistant' && data.type === 'answer') {
                const content = data.content || '';
                if (content && content.length > 10) setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content } : m));
              }
            } catch (e) {}
          }
        }
      }
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.id === assistantId && !lastMsg.content) return [...prev.slice(0, -1), { ...lastMsg, content: 'AI 暂无回复' }];
        return prev;
      });
    } catch (error: any) {
      setMessages((prev) => [...prev.slice(0, -1), { id: assistantId, role: 'assistant', content: `错误: ${error.message}` }]);
    } finally { setLoading(false); }
  }

  const styles: Record<string, React.CSSProperties> = {
    container: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    header: { padding: '16px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    headerTitle: { margin: 0, fontSize: '18px', fontWeight: 600 },
    messagesContainer: { flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
    emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666' },
    emptyIcon: { fontSize: '48px', marginBottom: '16px' },
    emptyText: { fontSize: '14px', textAlign: 'center', maxWidth: '200px', lineHeight: 1.6 },
    messageBubble: { maxWidth: '80%', padding: '12px 16px', borderRadius: '16px', fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' },
    userBubble: { alignSelf: 'flex-end', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderBottomRightRadius: '4px' },
    assistantBubble: { alignSelf: 'flex-start', background: 'white', color: '#333', borderBottomLeftRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' },
    inputContainer: { padding: '12px 16px', background: 'white', borderTop: '1px solid #eee', display: 'flex', gap: '12px' },
    input: { flex: 1, padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '24px', fontSize: '14px', outline: 'none' },
    sendButton: { padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '24px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' },
    sendButtonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}><h1 style={styles.headerTitle}>AI 智能助手</h1></div>
      <div style={styles.messagesContainer}>
        {messages.length === 0 && <div style={styles.emptyState}><div style={styles.emptyIcon}>🤖</div><p style={styles.emptyText}>你好！我是 AI 智能助手，有什么可以帮你的吗？</p></div>}
        {messages.map((msg) => (<div key={msg.id} style={{ ...styles.messageBubble, ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble) }}>{msg.content || (msg.role === 'assistant' && loading ? '...' : '')}</div>))}
        <div ref={messagesEndRef} />
      </div>
      <div style={styles.inputContainer}>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()} placeholder="输入消息..." style={styles.input} disabled={loading} />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ ...styles.sendButton, ...(loading || !input.trim() ? styles.sendButtonDisabled : {}) }}>发送</button>
      </div>
    </div>
  );
}
