// Describes the stable JavaScript parser boundary consumed by the TypeScript route.
import type { ParsedJob } from './lib/applications/types';
export function createJobService(): (input: string | URL) => Promise<ParsedJob>;
