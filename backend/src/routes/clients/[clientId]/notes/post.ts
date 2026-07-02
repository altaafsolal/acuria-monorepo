import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../../../../middleware/index.js';
import { baserow } from '../../../../services/index.js';
import { uploadUserFile } from '../../../../services/baserow/api.js';
import { asyncHandler, HttpError, requireTenant, reqParam } from '../../../../utils/index.js';

const { notesRepo } = baserow;

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

router.use(authenticate, requireRole('tenant_admin', 'standard_user'));

router.post('/', upload.array('files', 10), asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req);
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
  const uploaded = await Promise.all(
    files.map((file) => uploadUserFile(file.buffer, file.originalname, file.mimetype)),
  );

  const note = await notesRepo.createNote(tenantId, {
    clientId,
    noteType: noteType!.trim(),
    auteur: auteur!.trim(),
    contenu: contenu!.trim(),
    date: date!.trim(),
    piecesJointes: uploaded.map((file, index) => ({
      name: file.name,
      visibleName: files[index]?.originalname || file.original_name || file.name,
    })),
  });

  res.status(201).json({ note });
}));

export default router;
