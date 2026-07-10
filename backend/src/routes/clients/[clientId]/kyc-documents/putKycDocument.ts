import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../../../middleware/index.js';
import { kycDocsRepo } from '../../../../services/baserow/index.js';
import { asyncHandler, HttpError,reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.put('/:documentId', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
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
