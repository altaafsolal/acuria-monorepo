import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiKey, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useDeleteUser, useResetUserPassword, useUsers } from '../../hooks';
import { useApp } from '../../context/AppContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useNotifications } from '../../context/NotificationContext';
import PageLoading from '../../components/ui/PageLoading';
import StatusBadge from '../../components/ui/StatusBadge';
import { ROLE_LABELS } from '../../constants/roles';
import { filterBySearch } from '../../utils';

export default function UsersPage() {
  const { user: currentUser } = useApp();
  const { data: users = [], isLoading, isError, error } = useUsers();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();
  const confirm = useConfirm();
  const { notify } = useNotifications();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => filterBySearch(users, search, (user) => [
      user.name,
      user.email,
      user.role,
    ]),
    [users, search],
  );

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Supprimer l'utilisateur",
      message: `Voulez-vous vraiment supprimer « ${name} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;
    deleteUser.mutate(id);
  };

  const handleResetPassword = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Réinitialiser le mot de passe',
      message: `Un e-mail de réinitialisation sera envoyé à « ${name} ». Continuer ?`,
      confirmLabel: 'Envoyer',
    });
    if (!confirmed) return;
    resetPassword.mutate(id, {
      onSuccess: () => notify({
        title: 'E-mail envoyé',
        message: `Un e-mail de réinitialisation a été envoyé à « ${name} ».`,
        variant: 'success',
      }),
      onError: (err) => notify({
        title: 'Échec de l\'envoi',
        message: err.message,
        variant: 'error',
      }),
    });
  };

  if (isLoading) {
    return (
      <div className="dashboard-content">
        <PageLoading message="Chargement des utilisateurs…" />
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
      <header className="dashboard-header dashboard-header--row">
        <div>
          <h1>Utilisateurs</h1>
          <p className="dashboard-subtitle">Gérez les utilisateurs de votre tenant.</p>
        </div>
        <Link to="/dashboard/users/new" className="btn-primary btn-primary--inline">
          <FiPlus />
          Nouvel utilisateur
        </Link>
      </header>

      <section className="data-panel">
        <div className="data-panel__toolbar">
          <label className="field">
            <span>Rechercher</span>
            <div className="field-input">
              <input
                type="search"
                placeholder="Nom, e-mail ou rôle…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="data-table__empty">
                    {users.length === 0
                      ? 'Aucun utilisateur pour le moment.'
                      : 'Aucun utilisateur ne correspond à votre recherche.'}
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong></td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-pill">
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td><StatusBadge status={user.status} /></td>
                    <td className="data-table__actions">
                      <div className="action-group">
                        <Link
                          to={`/dashboard/users/${user.id}`}
                          className="btn-secondary btn-secondary--sm"
                        >
                          <FiEdit2 />
                          Modifier
                        </Link>
                        <button
                          type="button"
                          className="btn-secondary btn-secondary--sm"
                          onClick={() => handleResetPassword(user.id, user.name)}
                          disabled={resetPassword.isPending}
                        >
                          <FiKey />
                          Réinitialiser le MDP
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-secondary--sm"
                          onClick={() => handleDelete(user.id, user.name)}
                          disabled={deleteUser.isPending || user.id === currentUser?.id}
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
