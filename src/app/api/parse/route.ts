// Validates bounded HTTP input and delegates job extraction to the existing safe parsing service.
import { parseJob } from '../../../lib/server/parse-job';
import { isRecord } from '../../../lib/applications/types';
export const runtime = 'nodejs';
const MAX_BODY_BYTES = 1_000_000;

export async function POST(request: Request) {
  try {
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let body = '';
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          size += value.byteLength;
          if (size > MAX_BODY_BYTES) {
            await reader.cancel();
            return Response.json({ error: 'Request is too large.' }, { status: 413 });
          }
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
      } finally {
        reader.releaseLock();
      }
    }
    const input: unknown = JSON.parse(body || '{}');
    if (!isRecord(input) || typeof input.url !== 'string' || !input.url.trim()) {
      return Response.json({ error: 'Enter a valid URL, including https://' }, { status: 400 });
    }
    return Response.json(await parseJob(input.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read this job page.';
    const aborted = error instanceof Error && error.name === 'AbortError';
    return Response.json(
      { error: aborted ? 'The page took too long to respond.' : message },
      { status: aborted ? 504 : 400 },
    );
  }
}
