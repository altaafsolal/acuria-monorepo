import { Router } from "express";
import { authenticate, requireRole, requireTenant} from "../../middleware/index.js";
import {
  clientsRepo,
  tenantsRepo,
  clientMapper,
  fccClientsRepo,
} from "../../services/baserow/index.js";
import { asyncHandler, HttpError} from "../../utils/index.js";
import { postWebhook, webhookUrl } from "../../services/make/http.js";
import { sharepointBrokerFields } from "../../services/make/sharepoint.js";

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole("tenant_admin", "standard_user"), requireTenant);

router.post(
  "/fcc/docusign",
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId!;
    const { clientId } = req.body as { clientId?: string };

    if (!clientId) {
      throw new HttpError(400, "clientId is required");
    }

    try {
      const [client, tenant] = await Promise.all([
        clientsRepo.getClientById(tenantId, clientId),
        tenantsRepo.findTenantById(tenantId),
      ]);
      if (!client) throw new Error("Client not found");
      if (!client.email) throw new Error("Email client manquant");

      const name = clientMapper.resolveClientNameForMake(client);
      const fccClients = await fccClientsRepo.listFccClientsByClient(
        tenantId,
        client.id,
      );
      const latestFccClient = fccClients[0] ?? null;

      const res2 = await postWebhook(webhookUrl("webhookFccDocusign"), {
        tenant_name: tenant?.branding_name || tenant?.name || "",
        client_email: client.email,
        client_name: name,
        pdf_filename: latestFccClient?.pdfFilename || "",
        ...sharepointBrokerFields(tenant),
      });
      const data = (await res2.json()) as { envelope_id?: string };

      // Update the latest FCC dossier with the DocuSign envelope ID
      if (data.envelope_id && latestFccClient) {
        await fccClientsRepo.updateFccClientStatus(
          tenantId,
          latestFccClient.id,
          "Envoyé DocuSign",
          data.envelope_id,
        );
      }

      const updated = await clientsRepo.patchClientKycFields(
        tenantId,
        client.id,
        {
          fcc_statut: "DocuSign envoyé",
          fcc_date: client.fcc_date || new Date().toISOString().split("T")[0],
        },
      );

      res.json({ client: clientsRepo.toPublicClient(updated!) });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send FCC to DocuSign";
      throw new HttpError(400, message);
    }
  }),
);

export default router;
