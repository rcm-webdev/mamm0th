export { onboardUser } from './functions/onboard-user';
export { syncSquare } from './functions/sync-square';
export { embedTransactions } from './functions/embed-transactions';
export { generatePriorities } from './functions/generate-priorities';
export { updateMemory } from './functions/update-memory';
export { trackImpact } from './functions/track-impact';

import { onboardUser } from './functions/onboard-user';
import { syncSquare } from './functions/sync-square';
import { embedTransactions } from './functions/embed-transactions';
import { generatePriorities } from './functions/generate-priorities';
import { updateMemory } from './functions/update-memory';
import { trackImpact } from './functions/track-impact';

export const functions = [
  onboardUser,
  syncSquare,
  embedTransactions,
  generatePriorities,
  updateMemory,
  trackImpact,
];
