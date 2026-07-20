import { Fragment, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import {
  useCreateTenant,
  useTenants,
  useUpdateTenantBranding,
} from "../../hooks";
import api from "../../api";
import { queryKeys } from "../../api/queryKeys";
import { useConfirm } from "../../context/ConfirmContext";
import AuthenticatedImage from "../../components/ui/AuthenticatedImage";
import { fetchAuthenticatedBlob } from "../../lib/authenticatedBlob";
import LoadingPopup from "../../components/ui/LoadingPopup";
import PageLoading from "../../components/ui/PageLoading";
import Select from "../../components/ui/Select";
import StatusBadge from "../../components/ui/StatusBadge";
import TenantProvisioningDetails from "../../components/tenants/TenantProvisioningDetails";
import { ensureNotificationPermission } from "../../lib/notifications";
import { normalizeHexColor } from "../../utils/color";
import { dayjs, slugifyName } from "../../utils";
import { TENANT_STATUS, TENANT_STATUS_LABELS } from "../../constants/roles";

import type { Tenant } from "../../types";

const DEFAULT_ACCENT = "#BE845C";
const LOGO_ACCEPT = "image/png,image/jpeg";
const LOGO_ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const LOGO_ALLOWED_EXTENSIONS = /\.(png|jpe?g)$/i;
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

type EditableTenantStatus = "active" | "inactive";

interface BrandingFormState {
  brandingName: string;
  brandingOrias: string;
  brandingAccent: string;
  status: EditableTenantStatus;
  email: string;
  backofficeEmail: string;
}

function editableStatusFromTenant(tenant: Tenant): EditableTenantStatus {
  return tenant.status === "inactive" ? "inactive" : "active";
}

function brandingFormFromTenant(tenant: Tenant): BrandingFormState {
  return {
    brandingName: tenant.brandingName?.trim() || tenant.name,
    brandingOrias: tenant.brandingOrias?.trim() || "",
    brandingAccent: tenant.brandingAccent?.trim() || DEFAULT_ACCENT,
    status: editableStatusFromTenant(tenant),
    email: tenant.email?.trim() || "",
    backofficeEmail: tenant.backofficeEmail?.trim() || "",
  };
}

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const { data: tenants = [], isLoading, isError, error } = useTenants();
  const createTenant = useCreateTenant();
  const updateBranding = useUpdateTenantBranding();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [brandingForm, setBrandingForm] = useState<BrandingFormState>({
    brandingName: "",
    brandingOrias: "",
    brandingAccent: DEFAULT_ACCENT,
    status: TENANT_STATUS.ACTIVE,
    email: "",
    backofficeEmail: "",
  });
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [expandedProvisioningId, setExpandedProvisioningId] = useState<
    string | null
  >(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugifyName(value));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed = await confirm({
      title: "Créer le tenant",
      message: `Le tenant « ${name.trim()} » sera créé et son espace Baserow provisionné. Continuer ?`,
      confirmLabel: "Créer",
    });
    if (!confirmed) return;
    void ensureNotificationPermission();
    createTenant.mutate(
      { name: name.trim(), slug: slug.trim() },
      {
        onSuccess: () => {
          setName("");
          setSlug("");
          setSlugTouched(false);
          setShowForm(false);
        },
      },
    );
  };

  const openBrandingForm = (tenant: Tenant) => {
    setShowForm(false);
    setBrandingError(null);
    setLogoFile(null);
    setRemoveLogo(false);
    setEditingTenant(tenant);
    setBrandingForm(brandingFormFromTenant(tenant));

    if (tenant.hasBrandingLogo && !tenant.brandingLogoDataUrl) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.assets.tenantLogo(tenant.id),
        queryFn: () => fetchAuthenticatedBlob(api.platformTenantLogo(tenant.id)),
        staleTime: 24 * 60 * 60 * 1000,
      });
    }
  };

  const closeBrandingForm = () => {
    setEditingTenant(null);
    setBrandingError(null);
    setLogoFile(null);
    setRemoveLogo(false);
  };

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return undefined;
    }

    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [logoFile]);

  const handleLogoChange = (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      setBrandingError("Le logo ne doit pas dépasser 2 Mo.");
      return;
    }

    const typeOk = LOGO_ALLOWED_TYPES.has(file.type);
    const extOk = LOGO_ALLOWED_EXTENSIONS.test(file.name);
    if (!typeOk && !extOk) {
      setBrandingError("Formats autorisés : JPG, JPEG ou PNG.");
      return;
    }

    setBrandingError(null);
    setRemoveLogo(false);
    setLogoFile(file);
  };

  const toggleProvisioningDetails = (tenantId: string) => {
    setExpandedProvisioningId((current) =>
      current === tenantId ? null : tenantId,
    );
  };

  const handleAccentPickerChange = (value: string) => {
    const normalized = normalizeHexColor(value);
    if (normalized) {
      setBrandingForm((prev) => ({ ...prev, brandingAccent: normalized }));
    }
  };

  const handleAccentTextChange = (value: string) => {
    setBrandingForm((prev) => ({ ...prev, brandingAccent: value }));
  };

  const handleBrandingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTenant) return;

    const accent = normalizeHexColor(brandingForm.brandingAccent);
    if (!accent) {
      setBrandingError(
        "La couleur d'accent doit être un code hexadécimal valide (ex. #BE845C).",
      );
      return;
    }

    const willDeactivate =
      brandingForm.status === "inactive" && editingTenant.status !== "inactive";
    const confirmed = await confirm(
      willDeactivate
        ? {
            title: "Désactiver le tenant",
            message: `Le tenant « ${editingTenant.name} » sera désactivé et ses utilisateurs perdront l'accès. Continuer ?`,
            confirmLabel: "Désactiver",
            variant: "danger",
          }
        : {
            title: "Enregistrer les modifications",
            message: `Confirmer la mise à jour du tenant « ${editingTenant.name} » ?`,
            confirmLabel: "Enregistrer",
          },
    );
    if (!confirmed) return;

    setBrandingError(null);
    updateBranding.mutate(
      {
        id: editingTenant.id,
        brandingName: brandingForm.brandingName.trim() || editingTenant.name,
        brandingOrias: brandingForm.brandingOrias.trim() || undefined,
        brandingAccent: accent,
        status: brandingForm.status,
        email: brandingForm.email.trim() || undefined,
        backofficeEmail: brandingForm.backofficeEmail.trim() || undefined,
        logo: logoFile ?? undefined,
        removeBrandingLogo: removeLogo || undefined,
      },
      { onSuccess: () => closeBrandingForm() },
    );
  };

  if (isLoading) {
    return (
      <div className="dashboard-content">
        <PageLoading message="Chargement des tenants..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="dashboard-content">
        <p className="form-error">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <LoadingPopup
        show={createTenant.isPending}
        title="Création du tenant"
        message="Nous préparons l'espace et mettons la liste à jour."
      />
      <LoadingPopup
        show={updateBranding.isPending}
        title="Mise à jour du tenant"
        message="Enregistrement des paramètres de personnalisation…"
      />

      <header className="dashboard-header dashboard-header--row">
        <div>
          <h1>Tenants</h1>
          <p className="dashboard-subtitle">
            Gérez les tenants de gestion de patrimoine inscrits sur la
            plateforme.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary btn-primary--inline"
          onClick={() => {
            closeBrandingForm();
            setShowForm((open) => !open);
          }}
        >
          <FiPlus />
          {showForm ? "Annuler" : "Ajouter un tenant"}
        </button>
      </header>

      {showForm && (
        <section className="data-panel tenant-form-panel">
          <form className="tenant-form" onSubmit={handleSubmit}>
            <h2 className="tenant-form__title">Nouveau tenant</h2>
            <p className="tenant-form__hint">
              Crée une base Baserow dédiée pour ce tenant. Le provisionnement
              des tables se poursuit en arrière-plan.
            </p>

            <div className="tenant-form__fields">
              <label className="field">
                <span>Nom du tenant</span>
                <div className="field-input">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Tenant Exemple"
                    required
                  />
                </div>
              </label>

              <label className="field">
                <span>Identifiant</span>
                <div className="field-input">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="tenant-exemple"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    title="Lettres minuscules, chiffres et tirets uniquement"
                    required
                  />
                </div>
              </label>
            </div>

            {createTenant.isError && (
              <p className="form-error">{createTenant.error.message}</p>
            )}

            <div className="tenant-form__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={createTenant.isPending}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary btn-primary--inline"
                disabled={createTenant.isPending}
              >
                {createTenant.isPending ? "Création…" : "Créer le tenant"}
              </button>
            </div>
          </form>
        </section>
      )}

      {editingTenant && (
        <section className="data-panel tenant-form-panel">
          <form className="tenant-form" onSubmit={handleBrandingSubmit}>
            <h2 className="tenant-form__title">Personnaliser le tenant</h2>
            <p className="tenant-form__hint">
              Tenant : <strong>{editingTenant.name}</strong> (
              <code className="code-pill">{editingTenant.slug}</code>)
            </p>

            <div className="tenant-form__fields">
              <label className="field field--full">
                <span>Nom de marque</span>
                <div className="field-input">
                  <input
                    type="text"
                    value={brandingForm.brandingName}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        brandingName: e.target.value,
                      }))
                    }
                    placeholder="NM Prime"
                    required
                  />
                </div>
              </label>

              <label className="field field--full">
                <span>Email du tenant</span>
                <div className="field-input">
                  <input
                    type="email"
                    value={brandingForm.email}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="contact@nm-prime.com"
                  />
                </div>
              </label>

              <label className="field field--full">
                <span>Email backoffice</span>
                <div className="field-input">
                  <input
                    type="email"
                    value={brandingForm.backofficeEmail}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        backofficeEmail: e.target.value,
                      }))
                    }
                    placeholder="backoffice@nm-prime.com"
                  />
                </div>
              </label>

              <div className="tenant-form__row-3">
                <label className="field">
                  <span>Numéro ORIAS</span>
                  <div className="field-input">
                    <input
                      type="text"
                      value={brandingForm.brandingOrias}
                      onChange={(e) =>
                        setBrandingForm((prev) => ({
                          ...prev,
                          brandingOrias: e.target.value,
                        }))
                      }
                      placeholder="ORIAS 11063702"
                    />
                  </div>
                </label>

                <label className="field">
                  <span>Statut</span>
                  <Select
                    value={brandingForm.status}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({
                        ...prev,
                        status: e.target.value as EditableTenantStatus,
                      }))
                    }
                  >
                    <option value={TENANT_STATUS.ACTIVE}>
                      {TENANT_STATUS_LABELS.active}
                    </option>
                    <option value={TENANT_STATUS.INACTIVE}>
                      {TENANT_STATUS_LABELS.inactive}
                    </option>
                  </Select>
                </label>

                <label className="field">
                  <span>Couleur d&apos;accent</span>
                  <div className="field-color field-color--compact">
                    <input
                      type="color"
                      className="field-color__picker"
                      value={
                        normalizeHexColor(brandingForm.brandingAccent) ??
                        DEFAULT_ACCENT
                      }
                      onChange={(e) => handleAccentPickerChange(e.target.value)}
                      aria-label="Choisir la couleur d'accent"
                    />
                    <input
                      type="text"
                      className="field-color__hex"
                      value={brandingForm.brandingAccent}
                      onChange={(e) => handleAccentTextChange(e.target.value)}
                      placeholder="#BE845C"
                      pattern="^#[0-9a-fA-F]{6}$"
                      title="Code couleur hexadécimal (ex. #BE845C)"
                      required
                    />
                  </div>
                </label>
              </div>

              <label className="field field--full">
                <span>Logo</span>
                <div className="tenant-logo-field tenant-logo-field--compact">
                  {(logoPreviewUrl
                    || (editingTenant.hasBrandingLogo && !removeLogo && !logoFile)) && (
                    <div className="tenant-logo-preview">
                      <div className="tenant-logo-preview__content">
                        {logoPreviewUrl ? (
                          <img
                            src={logoPreviewUrl}
                            alt="Aperçu du logo"
                            className="tenant-logo-preview__image"
                          />
                        ) : (
                          <AuthenticatedImage
                            dataUrl={
                              removeLogo ? null : editingTenant.brandingLogoDataUrl
                            }
                            src={api.platformTenantLogo(editingTenant.id)}
                            queryKey={queryKeys.assets.tenantLogo(editingTenant.id)}
                            alt="Logo actuel"
                            className="tenant-logo-preview__image"
                          />
                        )}
                      </div>
                      {(editingTenant.hasBrandingLogo || logoFile) && !removeLogo && (
                        <button
                          type="button"
                          className="tenant-logo-preview__delete"
                          aria-label="Supprimer le logo"
                          onClick={() => {
                            setLogoFile(null);
                            setRemoveLogo(true);
                          }}
                        >
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="field-input">
                    <input
                      type="file"
                      accept={LOGO_ACCEPT}
                      onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <p className="tenant-form__hint tenant-logo-field__hint">
                    JPG, JPEG ou PNG — 2 Mo max. Affiché dans la barre latérale à la place du nom de marque.
                  </p>
                </div>
              </label>
            </div>

            {(brandingError || updateBranding.isError) && (
              <p className="form-error">
                {brandingError || updateBranding.error?.message}
              </p>
            )}

            <div className="tenant-form__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeBrandingForm}
                disabled={updateBranding.isPending}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary btn-primary--inline"
                disabled={updateBranding.isPending}
              >
                {updateBranding.isPending
                  ? "Enregistrement…"
                  : editingTenant
                    ? "Sauvegarder"
                    : "Enregistrer"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="data-panel">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Identifiant</th>
                <th>Statut</th>
                <th>Utilisateurs</th>
                <th>Clients</th>
                <th>Créé le</th>
                <th>Modifié le</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="data-table__empty">
                    Aucun tenant pour le moment.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <Fragment key={tenant.id}>
                    <tr>
                      <td>
                        <strong>{tenant.name}</strong>
                      </td>
                      <td>
                        <code className="code-pill">{tenant.slug}</code>
                      </td>
                      <td>
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td>{tenant.userCount ?? 0}</td>
                      <td>{tenant.clientCount ?? 0}</td>
                      <td>
                        {tenant.createdAt
                          ? dayjs(tenant.createdAt).format("D MMM YYYY")
                          : "—"}
                      </td>
                      <td>
                        {tenant.updatedAt
                          ? dayjs(tenant.updatedAt).format("D MMM YYYY")
                          : "—"}
                      </td>
                      <td className="data-table__actions">
                        <div className="action-group">
                          <button
                            type="button"
                            className="btn-secondary btn-secondary--sm"
                            onClick={() => toggleProvisioningDetails(tenant.id)}
                          >
                            {expandedProvisioningId === tenant.id ? (
                              <FiChevronUp />
                            ) : (
                              <FiChevronDown />
                            )}
                            Infos Baserow
                          </button>
                          {tenant.status === "active" ||
                          tenant.status === "inactive" ? (
                            <>
                              <button
                                type="button"
                                className="btn-secondary btn-secondary--sm"
                                onClick={() => openBrandingForm(tenant)}
                              >
                                <FiEdit2 />
                                Personnaliser le tenant
                              </button>
                              <Link
                                to={`/dashboard/tenants/${tenant.id}/users`}
                                className="btn-secondary btn-secondary--sm"
                              >
                                <FiUsers />
                                Gérer les utilisateurs
                              </Link>
                            </>
                          ) : tenant.status === "provisioning" ? (
                            <span className="data-table__muted">
                              Provisionnement en cours…
                            </span>
                          ) : tenant.status === "failed" ? (
                            <span className="data-table__muted">
                              Création échouée
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expandedProvisioningId === tenant.id && (
                      <tr className="tenant-provisioning-row">
                        <td colSpan={8}>
                          <TenantProvisioningDetails tenant={tenant} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
