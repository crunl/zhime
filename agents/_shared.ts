/* ============================================
   知我 — Shared SSE Helper
   统一 SSE 事件格式、心跳、响应头
   ============================================ */

/**
 * 构造 SSE 事件字符串
 */
export function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * 创建 SSE Response（带 5 秒心跳 + 标准响应头 + AbortSignal 优雅退出）
 */
export function createSSEResponse(
  generator: (signal?: AbortSignal) => AsyncGenerator<string>,
  signal?: AbortSignal,
): Response {
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      // 心跳：每 5 秒发一次 ping
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(sseEvent({ type: 'ping', ts: Date.now() })));
        } catch {
          /* stream already closed */
        }
      }, 5_000);

      try {
        for await (const chunk of generator(signal)) {
          if (signal?.aborted) break;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (e) {
        const error = e as Error;
        // AbortError 已处理过内容的情况，静默退出
        if (error.name !== 'AbortError' && !signal?.aborted) {
          controller.enqueue(
            encoder.encode(sseEvent({ type: 'error_message', content: error.message }))
          );
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
    cancel() {
      /* client disconnected */
    },
  });

  return new Response(readableStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * 简单日志
 */
export function createLogger(name: string) {
  return {
    log(...args: unknown[]) {
      console.log(`[${name}][${new Date().toISOString()}]`, ...args);
    },
    error(...args: unknown[]) {
      console.error(`[${name}][${new Date().toISOString()}]`, ...args);
    },
  };
}
