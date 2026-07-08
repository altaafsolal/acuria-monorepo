import { Router } from 'express';
import { asyncHandler } from '../../utils/index.js';
import { webhookUrl, postOptionalWebhook } from '../../services/make/http.js';
import * as fccSubmissionsRepo from '../../services/baserow/fcc-submissions.js';
import * as clientsRepo from '../../services/baserow/clients.js';

const router = Router({ mergeParams: true });

// Public — no auth (clients fill this form without login)
router.post('/submit', asyncHandler(async (req, res) => {
  const payload = req.body as Record<string, unknown>;

  // Forward to Make webhook for PDF generation / Airtable sync
  void postOptionalWebhook(webhookUrl('webhookFccSubmit'), payload, 'FCC form submission');

  // Save submission to Baserow if we have tenant context
  const tenantId = typeof payload.tenant_id === 'string' && payload.tenant_id ? payload.tenant_id : null;
  const recordId = typeof payload.record_id === 'string' && payload.record_id ? payload.record_id : null;
  const formType = typeof payload.form_type === 'string' ? payload.form_type : 'PP';
  const profilRisque = typeof payload.profil_risque === 'string' ? payload.profil_risque : null;
  const profilConnaissance = typeof payload.profil_connaissance === 'string' ? payload.profil_connaissance : null;
  const scoreConnaissance = typeof payload.score_connaissance === 'number' ? payload.score_connaissance : null;
  const scoreRisque = typeof payload.score_risque === 'number' ? payload.score_risque : null;

  if (tenantId) {
    void (async () => {
      try {
        let clientId: string | null = null;
        if (recordId) {
          const client = await clientsRepo.getClientById(tenantId, recordId).catch(() => null);
          if (client) clientId = client.id;
        }
        if (!clientId) {
          const clientEmail = typeof payload.client_email === 'string' ? payload.client_email : null;
          if (clientEmail) {
            const all = await clientsRepo.listClientsByTenantId(tenantId).catch(() => []);
            const match = all.find((c) => c.email?.toLowerCase() === clientEmail.toLowerCase());
            if (match) clientId = match.id;
          }
        }

        await fccSubmissionsRepo.createSubmission(tenantId, {
          clientId,
          formType,
          profilRisque,
          profilConnaissance,
          scoreConnaissance,
          scoreRisque,
          rawData: JSON.stringify(payload),
        });

        if (clientId) {
          await clientsRepo.patchClientKycFields(tenantId, clientId, {
            fcc_statut: 'Soumis',
            fcc_date: new Date().toISOString().split('T')[0],
          }).catch(() => undefined);
        }
      } catch (err) {
        console.error('FCC submission save error:', err instanceof Error ? err.message : err);
      }
    })();
  }

  res.json({ ok: true });
}));

export default router;
