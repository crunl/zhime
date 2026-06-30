/* ============================================
   知我 — Chat Agent
   统一入口：根据 model 参数路由到内置模型或 Coze
   输出统一为 SSE 事件流（ai_response / ping / error_message）
   ============================================ */

import { sseEvent, createSSEResponse, createLogger } from '../_shared';

const log = createLogger('ChatAgent');

// ============================================
// 错误响应辅助（确保始终以 data: [DONE] 终止）
// ============================================
function sseErrorResponse(content: string): Response {
  return new Response(
    sseEvent({ type: 'error_message', content }) +
    'data: [DONE]\n\n',
    { status: 200, headers: { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' } }
  );
}

// ============================================
// Coze → SSE 事件流 转换
// ============================================
async function* cozeStreamToSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      let eventType = '';
      let dataStr = '';
      for (const line of event.split('\n')) {
        const t = line.trim();
        if (t.toLowerCase().startsWith('event:')) {
          eventType = t.replace(/event:\s*/i, '').trim();
        } else if (t.toLowerCase().startsWith('data:')) {
          dataStr = t.replace(/data:\s*/i, '').trim();
        }
      }

      // 只取 delta 增量文本
      const isDelta = eventType.includes('.delta');
      if (!dataStr || !isDelta || eventType.includes('.created') || eventType.includes('.in_progress') || eventType === 'ping') {
        continue;
      }

      try {
        const obj = JSON.parse(dataStr);
        if (obj.type === 'verbose') continue;
        const content = typeof obj.content === 'string' ? obj.content : '';
        if (content) {
          yield sseEvent({ type: 'ai_response', content });
        }
      } catch {
        /* 非 JSON，忽略 */
      }
    }
  }
}

// ============================================
// 内置模型 → SSE 事件流
// ============================================
async function* builtinStreamToSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      for (const line of event.split('\n')) {
        const t = line.trim();
        if (!t.toLowerCase().startsWith('data:')) continue;

        const dataStr = t.replace(/data:\s*/i, '').trim();
        if (dataStr === '[DONE]') return;

        try {
          const obj = JSON.parse(dataStr);
          const content = obj.choices?.[0]?.delta?.content || '';
          if (content) {
            yield sseEvent({ type: 'ai_response', content });
          }
        } catch {
          /* 非 JSON，忽略 */
        }
      }
    }
  }
}

// ============================================
// Coze 分支
// ============================================
async function callCoze(message: string, env: Record<string, string>): Promise<Response> {
  const cozeToken = env.COZE_TOKEN;
  const cozeBotId = env.COZE_BOT_ID || '7656059514227146792';
  const cozeApi = env.COZE_API || 'https://api.coze.cn/v3/chat';

  const cozeResponse = await fetch(cozeApi, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cozeToken}`,
    },
    body: JSON.stringify({
      bot_id: cozeBotId,
      user_id: 'zhiwo_user_001',
      stream: true,
      auto_save_history: true,
      additional_messages: [
        { role: 'system', content: '你是「知我」，一位温暖、耐心的心理健康陪伴助手。用温和、平实的语气回复，建议必要时完成量表自评并在回复末尾添加 [ASSESSMENT_COMPLETE] 标记。', content_type: 'text' },
        { role: 'user', content: message, content_type: 'text' },
      ],
    }),
  });

  if (!cozeResponse.ok) {
    const errText = await cozeResponse.text();
    log.error('Coze 请求失败:', cozeResponse.status, errText.slice(0, 200));
    return sseErrorResponse(`Coze 服务暂时不可用 (${cozeResponse.status})`);
  }

  return createSSEResponse(function (signal: AbortSignal) {
    return cozeStreamToSSE(cozeResponse.body!.getReader());
  });
}

// ============================================
// 内置模型分支（OpenAI 兼容）
// ============================================
async function callBuiltin(message: string, env: Record<string, string>): Promise<Response> {
  const apiKey = env.AI_GATEWAY_API_KEY;
  const baseUrl = env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.edgeone.link/v1';
  const model = env.AI_MODEL || '@makers/deepseek-v4-flash';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            '你是「知我」，一位温暖、耐心的心理健康陪伴助手。你的职责是倾听、共情和引导，帮助用户关注自己的情绪和心理状态。\n\n' +
            '要求：\n' +
            '1. 用温和、平实的语气回复，不说教，不评判\n' +
            '2. 每次回复简洁，控制在 3-5 句话内\n' +
            '3. 当检测到用户可能有较严重的心理困扰时，建议其完成「量表自评」并在回复末尾添加 [ASSESSMENT_COMPLETE] 标记\n' +
            '4. 不替代专业医疗诊断，必要时建议寻求专业帮助\n' +
            '5. 用中文回复',
        },
        { role: 'user', content: message },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    log.error('内置模型请求失败:', response.status, errText.slice(0, 200));
    return sseErrorResponse(`AI 服务暂时不可用 (${response.status})`);
  }

  return createSSEResponse(function (signal: AbortSignal) {
    return builtinStreamToSSE(response.body!.getReader());
  });
}

// ============================================
// Agent 入口 — 严格单参数签名
// ============================================
export async function onRequest(context: any): Promise<Response> {
  const request = context?.request ?? {};
  const env = context?.env ?? {};
  const signal = (request.signal ?? context.signal) as AbortSignal | undefined;
  const body = request.body ?? {};

  // 精简日志（不含敏感信息）
  log.log('收到请求:', JSON.stringify({
    model: body.model,
    conversation_id: context.conversation_id,
    msgLen: body.message?.length,
  }));

  // 校验 message
  if (!body.message || typeof body.message !== 'string') {
    return sseErrorResponse("'message' 字段缺失或格式不正确");
  }

  const { message, model = 'builtin' } = body;

  // 路由
  try {
    if (model === 'coze') {
      return await callCoze(message, env);
    }
    return await callBuiltin(message, env);
  } catch (err: any) {
    log.error('未捕获错误:', err.message);
    return sseErrorResponse(err.message || '服务器内部错误');
  }
}
