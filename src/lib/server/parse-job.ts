// Keeps network parsing behind a server-only boundary so it cannot enter the browser bundle.
import 'server-only';
import { createJobService } from '../../job-service';
export const parseJob = createJobService();
