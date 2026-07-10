import { Router } from 'express';
import { authenticate, requireRole, requireTenant} from '../../middleware/index.js';
import { clientsRepo, notesRepo, tasksRepo, gestionnairesRepo } from '../../services/baserow/index.js';
import { asyncHandler,reqParam } from '../../utils/index.js';
import type { Role } from '../../types/domain.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole('tenant_admin', 'standard_user'), requireTenant);

router.get('/:id/timeline', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const clientId = reqParam(req, 'id');
  const user = req.user!;

  const client = await clientsRepo.getClientById(tenantId, clientId);
  if (!client) {
    res.json({ events: [] });
    return;
  }

  const [notes, tasks, dbTasks] = await Promise.all([
    notesRepo.listNotesByClient(tenantId, clientId),
    tasksRepo.listTasksByClient(tenantId, clientId),
    tasksRepo.listDbTasksByClientId(tenantId, clientId),
  ]);

  // Filter tasks by access (tenant_admin sees all; standard_user sees own tasks)
  let visibleTasks = tasks;
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    const gestionnaire = await gestionnairesRepo.findGestionnaireByUserId(tenantId, user.id);
    const gestionnaireName = gestionnaire?.name ?? null;
    const byId = new Map(dbTasks.map((t) => [t.id, t]));
    visibleTasks = tasks.filter((t) => {
      const db = byId.get(t.id);
      if (!db) return false;
      if (db.cree_par && db.cree_par === user.name) return true;
      if (gestionnaireName && db.assigne_a === gestionnaireName) return true;
      return false;
    });
  }

  const events: Array<{ date: string; type: string; label: string; detail: string }> = [];

  if (client.date_entree) events.push({ date: client.date_entree, type: 'client', label: 'Entrée en relation', detail: '' });
  if (client.der_date) events.push({ date: client.der_date, type: 'der', label: `DER — ${client.der_statut}`, detail: '' });
  if (client.ldm_date) events.push({ date: client.ldm_date, type: 'ldm', label: `LdM — ${client.ldm_statut}`, detail: '' });
  if (client.fcc_date) events.push({ date: client.fcc_date, type: 'fcc', label: `FCC — ${client.fcc_statut}`, detail: '' });

  for (const note of notes) {
    events.push({ date: note.date || '', type: 'note', label: `${note.noteType} — ${note.auteur || ''}`, detail: note.contenu || '' });
  }
  for (const task of visibleTasks) {
    events.push({ date: task.dueDate || '', type: 'task', label: `${task.title} — ${task.status}`, detail: task.assigneA || '' });
  }

  res.json({ events: events.filter((e) => e.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) });
}));

export default router;
