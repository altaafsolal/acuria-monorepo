import { Router } from 'express';
import { authenticate, requireRole } from '../../../../../middleware/index.js';
import { tenantsRepo, usersRepo } from '../../../../../services/baserow/index.js';
import { asyncHandler, HttpError, reqParam } from '../../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('super_admin'));

router.delete('/:userId', asyncHandler(async (req, res) => {
  const tenantId = reqParam(req, 'tenantId');
  const userId = reqParam(req, 'userId');

  try {
    const tenant = await tenantsRepo.findTenantById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const existing = await usersRepo.findUserById(userId);
    if (!existing || usersRepo.isSuperAdmin(existing) || existing.tenant_id !== tenantId) {
      throw new Error('User not found');
    }

    await usersRepo.deleteUser(userId);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    if (message === 'Tenant not found' || message === 'User not found') {
      throw new HttpError(404, message);
    }
    throw error;
  }
}));

export default router;
