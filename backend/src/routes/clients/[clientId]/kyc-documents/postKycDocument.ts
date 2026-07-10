import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../../../middleware/index.js';
import { kycDocsRepo } from '../../../../services/baserow/index.js';
import { asyncHandler, HttpError,reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.post('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const clientId = reqParam(req, 'clientId');
  const { docType, recu, dateReception, dateValidite, urlDocument } = req.body as {
    docType?: string;
    recu?: boolean;
    dateReception?: string | null;
    dateValidite?: string | null;
    urlDocument?: string | null;
  };

  if (!docType?.trim()) {
    throw new HttpError(400, 'docType is required');
  }

  const document = await kycDocsRepo.createKycDocument(tenantId, {
    clientId,
    docType: docType.trim(),
    recu,
    dateReception,
    dateValidite,
    urlDocument,
  });
  res.status(201).json({ document });
}));

export default router;
