import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole, requireTenant} from '../../../../middleware/index.js';
import { clientsRepo, clientMapper, notesRepo, tenantsRepo } from '../../../../services/baserow/index.js';
import { sharepointBrokerFields } from '../../../../services/make/sharepoint.js';
import { env } from '../../../../config/env.js';
import { asyncHandler, HttpError,reqParam } from '../../../../utils/index.js';

const router = Router({ mergeParams: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new HttpError(400, `Type de fichier non autorisé : ${file.originalname}`));
      return;
    }
    cb(null, true);
  },
});

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.post('/', upload.array('files', 10), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const clientId = reqParam(req, 'clientId');
  const { noteType, auteur, contenu, date } = req.body as {
    noteType?: string;
    auteur?: string;
    contenu?: string;
    date?: string;
  };

  const missing: string[] = [];
  if (!date?.trim()) missing.push('Date');
  if (!noteType?.trim()) missing.push('Type');
  if (!auteur?.trim()) missing.push('Auteur');
  if (!contenu?.trim()) missing.push('Contenu');
  if (missing.length > 0) {
    throw new HttpError(400, `Champs obligatoires : ${missing.join(', ')}`);
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const webhookUrl = env.make.webhookNoteUpload;
  let uploaded: { name: string; url: string }[] = [];

  if (files.length > 0) {
    if (!webhookUrl) {
      throw new HttpError(500, 'MAKE_WEBHOOK_NOTE_UPLOAD is not configured');
    }
    const [tenant, client] = await Promise.all([
      tenantsRepo.findTenantById(tenantId),
      clientsRepo.getClientById(tenantId, clientId).catch(() => null),
    ]);
    const tenantName = tenant?.branding_name || tenant?.name || '';
    const clientName = client ? clientMapper.resolveClientNameForMake(client) : '';
    const brokerFields = sharepointBrokerFields(tenant);
    uploaded = await Promise.all(
      files.map(async (file) => {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.originalname,
            content: file.buffer.toString('base64'),
            mimeType: file.mimetype,
            tenant_name: tenantName,
            client_name: clientName,
            ...brokerFields,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new HttpError(502, `Make upload failed (${res.status}): ${text}`);
        }
        const data = await res.json() as { name: string; url: string };
        return { name: data.name, url: data.url };
      }),
    );
  }

  const note = await notesRepo.createNote(tenantId, {
    clientId,
    noteType: noteType!.trim(),
    auteur: auteur!.trim(),
    contenu: contenu!.trim(),
    date: date!.trim(),
    piecesJointes: uploaded,
  });

  res.status(201).json({ note });
}));

export default router;
