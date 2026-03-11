import { NextRequest } from 'next/server';

const TOKEN = 'sat_561QFslplR7AJWyKS99uxrwLzZ6ntdRWFctt1pqwysUD8eGTHAxME08OFCft0KXD';
const BOT_ID = '7615181851770765339';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId } = body;

    const response = await fetch('https://api.coze.cn/v3/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        bot_id: BOT_ID,
        user_id: 'mobile-user-' + Date.now(),
        stream: true,
        conversation_id: conversationId || undefined,
        additional_messages: [{ role: 'user', content: message, content_type: 'text' }],
      }),
    });

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let convId = conversationId;

        if (!reader) { controller.close(); return; }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(new TextEncoder().encode(chunk));

            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.slice(5).trim());
                  if (data.conversation_id) convId = data.conversation_id;
                } catch (e) {}
              }
            }
          }
          controller.enqueue(new TextEncoder().encode(`\nevent: done\ndata: {"conversation_id": "${convId}"}\n\n`));
        } finally { controller.close(); }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
