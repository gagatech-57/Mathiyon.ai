/**
 * Mathiyon AI - Privacy & Security Test Suite (Phase 11.13)
 * ES Module Entry Point forwarding to privacy_tests.cjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('./privacy_tests.cjs');
