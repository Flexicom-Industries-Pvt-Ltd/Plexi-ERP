import { NextResponse } from 'next/server';
import prisma, { registerLogListener } from '@/lib/logging';

export const runtime = 'nodejs'; // required for SSE

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const module = searchParams.get('module');

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const res = new Response(stream.readable, { status: 200, headers });

  // Register response writer as a listener
  const fakeRes = {
    write: (chunk: string) => writer.write(new TextEncoder().encode(chunk)),
    on: (event: string, cb: () => void) => {
      if (event === 'close') {
        // No real close handling here; Next.js will close when client disconnects
      }
    },
    // cleanup when client disconnects
    end: () => writer.close(),
  } as any;

  registerLogListener(fakeRes);

  // Optionally send initial heartbeat
  writer.write(new TextEncoder().encode('data: heartbeat\n\n'));

  // Set up a timeout to close after long inactivity (e.g., 30min)
  setTimeout(() => {
    writer.close();
  }, 30 * 60 * 1000);

  return res;
}
