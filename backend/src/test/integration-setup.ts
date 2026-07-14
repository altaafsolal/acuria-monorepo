import { afterEach } from 'vitest';
import nock from 'nock';
import { clearAuthUserCache } from '../middleware/auth.js';
import { clearTenantDbContextCache } from '../services/baserow/tenant-context.js';
import { clearTenantTablesCache } from '../services/baserow/tenant-tables.js';
import { clearRegistryCache } from '../services/baserow/registry.js';

// Disable real HTTP during integration tests
nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

afterEach(() => {
  nock.cleanAll();
  clearAuthUserCache();
  clearTenantDbContextCache();
  clearTenantTablesCache();
  clearRegistryCache();
});
