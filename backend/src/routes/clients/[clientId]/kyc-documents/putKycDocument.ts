import { Router } from 'express';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../../../utils/index.js';

const { kycDocsRepo } = baserow;

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.put('/:documentId', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
  const clientId = reqParam(req, 'clientId');
  const documentId = reqParam(req, 'documentId');
  const { recu, dateReception, dateValidite, urlDocument } = req.body as {
    recu?: boolean;
    dateReception?: string | null;
    dateValidite?: string | null;
    urlDocument?: string | null;
  };

  const existing = await kycDocsRepo.getKycDocumentById(tenantId, documentId);
  if (!existing || existing.client_id !== clientId) {
    throw new HttpError(404, 'Document not found');
  }

  const document = await kycDocsRepo.updateKycDocument(tenantId, documentId, {
    recu,
    dateReception,
    dateValidite,
    urlDocument,
  });
  if (!document) {
    throw new HttpError(404, 'Document not found');
  }
  res.json({ document });
}));

export default router;
