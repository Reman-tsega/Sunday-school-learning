import 'fake-indexeddb/auto';
import { syncManager } from '../src/lib/sync-manager';

// Background uploads would race with each test's mocked fetch; tests of auto-sync turn it back on
syncManager.setAutoSyncEnabled(false);
