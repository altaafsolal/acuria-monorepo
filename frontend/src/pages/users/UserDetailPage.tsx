import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useApp } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useCreateUser, useUpdateUser, useUser } from "../../hooks";
import LoadingPopup from "../../components/ui/LoadingPopup";
import PageLoading from "../../components/ui/PageLoading";
import Select from "../../components/ui/Select";
import { ROLES, ROLE_LABELS, USER_STATUS } from "../../constants/roles";
import type { Role, Status } from "../../types";

interface UserFormState {
  name: string;
  email: string;
  role: Role;
  status: Status;
}

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  role: ROLES.STANDARD_USER,
  status: USER_STATUS.ACTIVE,
};

export default function UserDetailPage() {
  const { userId } = useParams();
  const isNew = !userId || userId === "new";
  const navigate = useNavigate();
  const { user: currentUser } = useApp();

  const userQuery = useUser(isNew ? undefined : userId);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const confirm = useConfirm();

  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const isSelf = !isNew && userId === currentUser?.id;

  useEffect(() => {
    if (userQuery.data) {
      setForm({
        name: userQuery.data.name,
        email: userQuery.data.email,
        role: userQuery.data.role,
        status: userQuery.data.status,
      });
    }
  }, [userQuery.data]);

  const handleChange = (field: keyof UserFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setResetMessage(null);

    if (!form.name.trim()) {
      setFormError("Le nom est obligatoire.");
      return;
    }
    if (isNew && !form.email.trim()) {
      setFormError("L'e-mail est obligatoire.");
      return;
    }

    const confirmed = await confirm(
      isNew
        ? {
            title: "Créer l'utilisateur",
            message: `Un e-mail d'activation sera envoyé à ${form.email.trim()}. Continuer ?`,
            confirmLabel: "Créer",
          }
        : {
            title: "Enregistrer les modifications",
            message: `Confirmer les modifications du compte « ${form.name.trim()} » ?`,
            confirmLabel: "Enregistrer",
          },
    );
    if (!confirmed) return;

    try {
      if (isNew) {
        await createUser.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        });
        navigate("/dashboard/users");
      } else if (userId) {
        const payload: {
          id: string;
          name: string;
          role?: Role;
          status?: Status;
        } = {
          id: userId,
          name: form.name.trim(),
        };

        if (!isSelf) {
          payload.role = form.role;
          payload.status = form.status;
        }

        await updateUser.mutateAsync(payload);
        navigate("/dashboard/users");
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Une erreur est survenue.",
      );
    }
  };

  if (!isNew && userQuery.isLoading) {
    return (
      <div className="dashboard-content">
        <PageLoading message="Chargement de l'utilisateur…" />
      </div>
    );
  }

  if (!isNew && userQuery.isError) {
    return (
      <div className="dashboard-content">
        <p className="form-error">{userQuery.error.message}</p>
      </div>
    );
  }

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <div className="dashboard-content">
      <LoadingPopup
        show={isPending}
        title={
          isNew ? "Création de l’utilisateur" : "Modification de l’utilisateur"
        }
        message="Nous enregistrons les informations et actualisons la liste."
      />

      <header className="dashboard-header">
        <Link to="/dashboard/users" className="breadcrumb-link">
          <FiArrowLeft />
          Retour aux utilisateurs
        </Link>
        <h1>
          {isNew
            ? "Nouvel utilisateur"
            : `Modifier — ${form.name || "Utilisateur"}`}
        </h1>
        <p className="dashboard-subtitle">
          {isNew
            ? "Un e-mail sera envoyé à l'utilisateur pour définir son mot de passe."
            : "Modifiez les informations du compte utilisateur."}
        </p>
      </header>

      <section className="data-panel tenant-form-panel">
        <form className="tenant-form" onSubmit={handleSubmit}>
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
                  readOnly={!isNew}
                  required={isNew}
                />
              </div>
            </label>

            <label className="field">
              <span>Rôle</span>
              <Select
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
                disabled={isSelf}
              >
                <option value={ROLES.TENANT_ADMIN}>
                  {ROLE_LABELS[ROLES.TENANT_ADMIN]}
                </option>
                <option value={ROLES.STANDARD_USER}>
                  {ROLE_LABELS[ROLES.STANDARD_USER]}
                </option>
              </Select>
            </label>

            <label className="field">
              <span>Statut</span>
              <Select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                disabled={isSelf}
              >
                <option value={USER_STATUS.ACTIVE}>Actif</option>
                <option value={USER_STATUS.INACTIVE}>Inactif</option>
                <option value={USER_STATUS.PENDING}>
                  En attente d&apos;activation
                </option>
              </Select>
            </label>
          </div>

          {isSelf && (
            <p className="dashboard-subtitle">
              Vous ne pouvez pas modifier votre propre rôle ou statut.
            </p>
          )}

          <div className="tenant-form__actions">
            <Link to="/dashboard/users" className="btn-secondary">
              Annuler
            </Link>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? "Création…" : isNew ? "Créer" : "Sauvegarder"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
