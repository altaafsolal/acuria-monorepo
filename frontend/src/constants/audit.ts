const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
};

const METHOD_LABELS: Record<string, string> = {
  POST: 'Création',
  PUT: 'Modification',
  PATCH: 'Modification',
  DELETE: 'Suppression',
  GET: 'Consultation',
};

export function formatAuditMethod(method: string): string {
  return METHOD_LABELS[method] || method;
}

export function formatAuditAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const parts = action.split('.');
  if (parts.length === 2) {
    const [verb, entity] = parts;
    const verbFr: Record<string, string> = {
      add: 'Ajout',
      edit: 'Modification',
      delete: 'Suppression',
      // legacy actions logged before ADD/EDIT/DELETE rename
      create: 'Ajout',
      update: 'Modification',
    };
    return `${verbFr[verb] || verb} ${entity}`;
  }
  return action;
}

export function formatAuditTarget(entityType: string | null, entityId: string | null): string {
  if (!entityType) return '—';
  if (entityId) return `${entityType} #${entityId}`;
  return entityType;
}
