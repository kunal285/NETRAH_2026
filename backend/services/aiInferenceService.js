/**
 * DEPRECATED: Please use the new internal AI module:
 * import { inferenceService } from './ai/inferenceService.js';
 *
 * This file redirects all legacy calls to the new inferenceService.
 */
import { inferenceService } from './ai/inferenceService.js';

export const aiInferenceService = inferenceService;
export default inferenceService;
