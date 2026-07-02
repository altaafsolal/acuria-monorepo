import { useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiKey, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  useCreateTenantUser,
  useDeleteTenantUser,
  useResetTenantUserPassword,
  useTenant,
  useTenantUsers,
  useUpdateTenantUser,
} from "../../hooks";
import LoadingPopup from "../../components/ui/LoadingPopup";
import PageLoading from "../../components/ui/PageLoading";
import Select from "../../components/ui/Select";
import StatusBadge from "../../components/ui/StatusBadge";
import { useConfirm } from "../../context/ConfirmContext";
import { ROLE_LABELS, ROLES, USER_STATUS } from "../../constants/roles";
import type { Role, Status } from "../../types";
import { dayjs } from "../../utils";

interface UserFormState {
  name: string;
  email: string;
  role: Role;
  status: Status;
}

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  role: ROLES.TENANT_ADMIN,
  status: USER_STATUS.PENDING,
};

export default function TenantUsersPage() {
  const { tenantId } = useParams();
  const tenantQuery = useTenant(tenantId);
  const usersQuery = useTenantUsers(tenantId);
  const createTenantUser = useCreateTenantUser(tenantId);
  const updateTenantUser = useUpdateTenantUser(tenantId);
  const deleteTenantUser = useDeleteTenantUser(tenantId);
  const resetTenantUserPassword = useResetTenantUserPassword(tenantId);
  const confirm = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const isEditing = editingUserId !== null;
  const isPending = createTenantUser.isPending || updateTenantUser.isPending;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingUserId(null);
    setFormError(null);
    setResetMessage(null);
    setShowForm(false);
  };

  const handleChange = (field: keyof UserFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = (user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: Status;
  }) => {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setFormError(null);
    setResetMessage(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Supprimer l'utilisateur",
      message: `Voulez-vous vraiment supprimer « ${name} » ? Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!confirmed) return;
    deleteTenantUser.mutate(id, {
      onError: (error) => setFormError(error.message),
    });
  };

  const handleResetPassword = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Réinitialiser le mot de passe",
      message: `Un e-mail de réinitialisation sera envoyé à « ${name} ». Continuer ?`,
      confirmLabel: "Envoyer",
    });
    if (!confirmed) return;
    setFormError(null);
    setResetMessage(null);
    resetTenantUserPassword.mutate(id, {
      onSuccess: () => {
        setResetMessage("Un e-mail de réinitialisation a été envoyé.");
      },
      onError: (error) => setFormError(error.message),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setResetMessage(null);

    if (!form.name.trim()) {
      setFormError("Le nom est obligatoire.");
      return;
    }
    if (!isEditing && !form.email.trim()) {
      setFormError("L'e-mail est obligatoire.");
      return;
    }

    const confirmed = await confirm(
      isEditing
        ? {
            title: "Enregistrer les modifications",
            message: `Confirmer les modifications du compte « ${form.name.trim()} » ?`,
            confirmLabel: "Enregistrer",
          }
        : {
            title: "Créer l'utilisateur",
            message: `Un e-mail d'activation sera envoyé à ${form.email.trim()}. Continuer ?`,
            confirmLabel: "Créer",
          },
    );
    if (!confirmed) return;

    try {
      if (isEditing && editingUserId) {
        await updateTenantUser.mutateAsync({
          id: editingUserId,
          name: form.name.trim(),
          role: form.role,
          status: form.status,
        });
      } else {
        await createTenantUser.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        });
      }
      resetForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    }
  };

  if (tenantQuery.isLoading || usersQuery.isLoading) {
    return (
      <div className="dashboard-content">
        <PageLoading message="Chargement des utilisateurs…" />
      </div>
    );
  }

  if (tenantQuery.isError || usersQuery.isError) {
    const message = tenantQuery.error?.message || usersQuery.error?.message;
    return (
      <div className="dashboard-content">
        <p className="form-error">{message}</p>
      </div>
    );
  }

  const tenant = tenantQuery.data;
  if (!tenant) {
    return <Navigate to="/dashboard/tenants" replace />;
  }

  const tenantUsers = usersQuery.data ?? [];

  return (
    <div className="dashboard-content">
      <LoadingPopup
        show={isPending}
        title={
          isEditing
            ? "Modification de l’utilisateur"
            : "Création de l’utilisateur"
        }
        message="Nous enregistrons les informations et actualisons la liste."
      />

      <header className="dashboard-header dashboard-header--row">
        <div>
          <Link to="/dashboard/tenants" className="breadcrumb-link">
            <FiArrowLeft />
            Retour aux tenants
          </Link>
          <h1>{`${tenant.name} — Utilisateurs`}</h1>
          <p className="dashboard-subtitle">
            Administrateurs et utilisateurs standard de ce tenant.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary btn-primary--inline"
          onClick={() => {
            if (showForm && !isEditing) {
              resetForm();
            } else {
              setEditingUserId(null);
              setForm(EMPTY_FORM);
              setFormError(null);
              setResetMessage(null);
              setShowForm((open) => !open);
            }
          }}
        >
          <FiPlus />
          {showForm && !isEditing ? "Annuler" : "Ajouter un utilisateur"}
        </button>
      </header>

      {showForm && (
        <section className="data-panel tenant-form-panel">
          <form className="tenant-form" onSubmit={handleSubmit}>
            <h2 className="tenant-form__title">
              {isEditing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </h2>
            <p className="tenant-form__hint">
              {isEditing
                ? "Modifiez les informations du compte utilisateur."
                : "Un e-mail sera envoyé à l'utilisateur pour définir son mot de passe."}
            </p>

            {formError && <p className="form-error">{formError}</p>}
            {resetMessage && <p className="form-success">{resetMessage}</p>}

            <div className="tenant-form__fields">
              <label className="field">
                <span>Nom</span>
                <div className="field-input">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
              </label>

              <label className="field">
                <span>E-mail</span>
                <div className="field-input">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    readOnly={isEditing}
                    required={!isEditing}
                  />
                </div>
              </label>

              <label className="field">
                <span>Rôle</span>
                <Select
                  value={form.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                >
                  <option value={ROLES.TENANT_ADMIN}>
                    {ROLE_LABELS[ROLES.TENANT_ADMIN]}
                  </option>
                  <option value={ROLES.STANDARD_USER}>
                    {ROLE_LABELS[ROLES.STANDARD_USER]}
                  </option>
                </Select>
              </label>

              {isEditing && (
                <label className="field">
                  <span>Statut</span>
                  <Select
                    value={form.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <option value={USER_STATUS.ACTIVE}>Actif</option>
                    <option value={USER_STATUS.INACTIVE}>Inactif</option>
                    <option value={USER_STATUS.PENDING}>
                      En attente d&apos;activation
                    </option>
                  </Select>
                </label>
              )}
            </div>

            <div className="tenant-form__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
                disabled={isPending}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isPending}
              >
                {isPending ? "Création…" : isEditing ? "Sauvegarder" : "Créer"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="data-panel">
        <div className="data-panel__meta">
          <div>
            <span className="meta-label">Tenant</span>
            <strong>{tenant.name}</strong>
          </div>
          <div>
            <span className="meta-label">Identifiant</span>
            <code className="code-pill">{tenant.slug}</code>
          </div>
          <div>
            <span className="meta-label">Statut</span>
            <StatusBadge status={tenant.status} />
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {tenantUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="data-table__empty">
                    Aucun utilisateur pour ce tenant.
                  </td>
                </tr>
              ) : (
                tenantUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-pill">
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={user.status} />
                    </td>
                    <td>
                      {user.createdAt
                        ? dayjs(user.createdAt).format("D MMM YYYY")
                        : "—"}
                    </td>
                    <td className="data-table__actions">
                      <div className="action-group">
                        <button
                          type="button"
                          className="btn-secondary btn-secondary--sm"
                          onClick={() => handleEdit(user)}
                        >
                          <FiEdit2 />
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-secondary--sm"
                          onClick={() =>
                            handleResetPassword(user.id, user.name)
                          }
                          disabled={resetTenantUserPassword.isPending}
                        >
                          <FiKey />
                          Réinitialiser le MDP
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-secondary--sm"
                          onClick={() => handleDelete(user.id, user.name)}
                          disabled={deleteTenantUser.isPending}
                        >
                          <FiTrash2 />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
