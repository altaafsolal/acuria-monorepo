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

export function formatDateFr(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

export function formatDateTimeFr(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function docBadgeClass(statut: string | null | undefined): string {
  if (!statut || statut === 'Non envoyé') return 'badge-doc-non';
  if (statut === 'Envoyé') return 'badge-doc-envoye';
  if (statut === 'Signé') return 'badge-doc-signe';
  if (statut === 'À renouveler') return 'badge-doc-renouveler';
  return 'badge-doc-non';
}

export function docBadgeLabel(statut: string | null | undefined): string {
  if (!statut || statut === 'Non envoyé') return '—';
  if (statut === 'Envoyé') return 'Envoyé';
  if (statut === 'Signé') return '✓ Signé';
  if (statut === 'À renouveler') return '↺ Renouveler';
  return statut;
}

export function statutClientBadgeClass(statut: string | null | undefined): string {
  const map: Record<string, string> = {
    Prospect: 'badge-prospect',
    'En cours': 'badge-encours',
    'Client actif': 'badge-actif',
    Inactif: 'badge-inactif',
    Archivé: 'badge-archive',
  };
  return map[statut || ''] || 'badge-inactif';
}

export function isPersonneMorale(clientType: string): boolean {
  return clientType === 'PM' || clientType === 'Personne morale';
}
