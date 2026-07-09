import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/index.js";
import {
  clientsRepo,
  tenantsRepo,
  clientMapper,
  fccSubmissionsRepo,
} from "../../services/baserow/index.js";
import { sendFccDocuSign } from "../../services/make/index.js";
import { asyncHandler, HttpError, requireTenant } from "../../utils/index.js";

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole("tenant_admin", "standard_user"));

router.post(
  "/fcc/docusign",
  asyncHandler(async (req, res) => {
    const tenantId = requireTenant(req);
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

      const name = clientMapper.resolveClientDisplayName(client);
      const formType = client.client_type === "PM" ? "PM" : "PP";
      const makeResult = await sendFccDocuSign(
        client.id,
        name,
        client.email,
        formType,
        tenant?.branding_name || tenant?.name || "",
        tenant?.email || "",
        tenant?.id,
      );

      // Update the latest FCC submission with the DocuSign envelope ID
      if (makeResult.envelope_id) {
        const submissions = await fccSubmissionsRepo.listSubmissionsByClient(
          tenantId,
          client.id,
        );
        if (submissions.length > 0) {
          await fccSubmissionsRepo.updateSubmissionStatus(
            tenantId,
            submissions[0].id,
            submissions[0].statut,
            makeResult.envelope_id,
          );
        }
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
