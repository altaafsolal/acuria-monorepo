export interface AccueilCrmStats {
  total: number;
  prospects: number;
  actifs: number;
  inactifs: number;
}

export interface AccueilDerStats {
  total: number;
  aEnvoyer: number;
  derEnvoye: number;
  ldmEnvoye: number;
  signe: number;
}

export interface AccueilFccStats {
  total: number;
  aEnvoyer: number;
  envoye: number;
  signe: number;
  renouveler: number;
}

export interface AccueilStats {
  crm: AccueilCrmStats;
  der: AccueilDerStats;
  fcc: AccueilFccStats;
}

export interface AccueilTodoItem {
  id: string;
  clientId: string;
  clientName: string;
  label: string;
  priority: number;
  kind: 'kyc_doc' | 'compliance';
}

export interface AccueilResponse {
  stats: AccueilStats;
  kycTodos: AccueilTodoItem[];
  complianceTodos: AccueilTodoItem[];
}
