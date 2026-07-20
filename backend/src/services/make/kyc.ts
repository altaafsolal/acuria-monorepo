import { env } from "../../config/env.js";
import { signFccPrefillToken } from "../../utils/fcc-token.js";
import type { DbClient } from "../../types/domain.js";

export function buildFccPrefillLink(
  client: DbClient,
  tenant?: {
    id?: string;
    name: string;
    orias?: string | null;
    email?: string | null;
  },
): { link: string; type: "PP" | "PM" } {
  const type = client.client_type === "PM" ? "PM" : "PP";
  const baseUrl =
    type === "PP" ? `${env.appUrl}/fcc/pp` : `${env.appUrl}/fcc/pm`;
  // Signed proof that this link was issued for THIS tenant + client. The public
  // submit endpoint trusts only this token, never the body's tenant_id/record_id.
  const prefillToken = tenant?.id
    ? signFccPrefillToken({ tenant_id: tenant.id, record_id: client.id })
    : "";
  const tenantMeta = tenant
    ? {
        _tenant_id: tenant.id || "",
        _tenant_name: tenant.name,
        _tenant_orias: tenant.orias || "",
        _tenant_email: tenant.email || "",
        _prefill_token: prefillToken,
      }
    : {};
  const prefillData =
    type === "PP"
      ? {
          _record_id: client.id,
          ...tenantMeta,
          civilite: client.civilite || "",
          nom: (client.last_name || "").toUpperCase(),
          prenom: client.first_name || "",
          adresse: client.address || "",
          cp: client.postal_code || "",
          ville: client.city || "",
          tel_mobile: client.phone_mobile || client.phone || "",
          email: client.email || "",
          ddn: client.birth_date || "",
          nationalite: client.nationality || "",
          situation: client.marital_status || "",
          regime: client.matrimonial_regime || "",
          profession: client.profession || "",
          statut: client.pro_status || "",
          secteur: client.sector || "",
          societe: client.employer || "",
          revenus:
            client.annual_income != null ? String(client.annual_income) : "",
          charges:
            client.current_charges != null
              ? String(client.current_charges)
              : "",
          pat_immo: client.patrimoine_immobilier || "",
          pat_epargne: client.patrimoine_epargne || "",
          pat_liqui: client.patrimoine_liquidites || "",
          pat_partici: client.patrimoine_participations || "",
          pat_autres: client.patrimoine_autres || "",
        }
      : {
          _record_id: client.id,
          ...tenantMeta,
          denomination: client.trade_name || client.name || "",
          siren: client.siren || "",
          naf: client.naf_code || "",
          adresse: client.address || "",
          cp: client.postal_code || "",
          ville: client.city || "",
          email: client.email || "",
          tel: client.phone || "",
          representant: client.legal_rep_name || "",
          fonction: client.legal_rep_role || "",
        };

  const encoded = Buffer.from(JSON.stringify(prefillData), "utf8").toString(
    "base64",
  );
  return { link: `${baseUrl}?data=${encoded}`, type };
}

export function ldmAvailableDate(derDate: string | null): Date | null {
  if (!derDate) return null;
  const d = new Date(derDate);
  d.setDate(d.getDate() + 2);
  return d;
}

export function ldmIsUnlocked(derDate: string | null): boolean {
  const avail = ldmAvailableDate(derDate);
  if (!avail) return false;
  return new Date() >= avail;
}

export function derIsSent(statut: string | null | undefined): boolean {
  return statut === "Envoyé" || statut === "Signé";
}
