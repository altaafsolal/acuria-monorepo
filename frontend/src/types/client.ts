import type { BeneficiaryFields } from './kyc';

export type ClientStatus = 'active' | 'inactive' | 'prospect' | 'archived';

export type ClientType = 'PP' | 'PM';

export interface Client {
  id: string;
  name: string;
  email: string;
  clientType: ClientType | string;
  kycStatus: string;
  status: ClientStatus | string;
  statutClient: string;
  signataire: string | null;
  gestionnaire: string | null;
  origine: string | null;
  dateEntree: string | null;
  phone: string | null;
  phoneMobile: string | null;
  phoneHome: string | null;
  phoneOffice: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  civilite: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  matrimonialRegime: string | null;
  profession: string | null;
  proStatus: string | null;
  sector: string | null;
  employer: string | null;
  annualIncome: number | null;
  currentCharges: number | null;
  tradeName: string | null;
  legalForm: string | null;
  siren: string | null;
  nafCode: string | null;
  activity: string | null;
  legalRepName: string | null;
  legalRepRole: string | null;
  revenue: string | null;
  totalBalance: string | null;
  equity: string | null;
  taxation: string | null;
  fiscalCountry: string | null;
  capital: string | null;
  patrimoineImmobilier: string | null;
  patrimoineEpargne: string | null;
  patrimoineParticipations: string | null;
  patrimoineLiquidites: string | null;
  patrimoineAutres: string | null;
  fccStatut: string;
  fccDate: string | null;
  derStatut: string;
  derDate: string | null;
  derEnvoiTimestamp: string | null;
  ldmStatut: string;
  ldmDate: string | null;
  notesInternes: string | null;
  be1: BeneficiaryFields;
  be2: BeneficiaryFields;
  be3: BeneficiaryFields;
  be4: BeneficiaryFields;
  createdAt: string | null;
}
export interface ClientInputFields {
  name: string;
  email?: string;
  clientType?: ClientType | string;
  kycStatus?: string;
  status?: ClientStatus | string;
  signataire?: string | null;
  gestionnaire?: string | null;
  origine?: string | null;
  dateEntree?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  civilite?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  nationality?: string | null;
  maritalStatus?: string | null;
  matrimonialRegime?: string | null;
  profession?: string | null;
  proStatus?: string | null;
  sector?: string | null;
  employer?: string | null;
  annualIncome?: number | null;
  currentCharges?: number | null;
  tradeName?: string | null;
  legalForm?: string | null;
  siren?: string | null;
  nafCode?: string | null;
  activity?: string | null;
  legalRepName?: string | null;
  legalRepRole?: string | null;
  revenue?: string | null;
  totalBalance?: string | null;
  equity?: string | null;
  taxation?: string | null;
  patrimoineImmobilier?: string | null;
  patrimoineEpargne?: string | null;
  patrimoineParticipations?: string | null;
  patrimoineLiquidites?: string | null;
  patrimoineAutres?: string | null;
  statutClient?: string;
  phoneMobile?: string | null;
  phoneHome?: string | null;
  phoneOffice?: string | null;
  fiscalCountry?: string | null;
  capital?: string | null;
  fccStatut?: string;
  fccDate?: string | null;
  derStatut?: string;
  derDate?: string | null;
  derEnvoiTimestamp?: string | null;
  ldmStatut?: string;
  ldmDate?: string | null;
  notesInternes?: string | null;
  be1?: BeneficiaryFields;
  be2?: BeneficiaryFields;
  be3?: BeneficiaryFields;
  be4?: BeneficiaryFields;
}

export type CreateClientInput = ClientInputFields;

export type UpdateClientInput = Partial<ClientInputFields>;

export interface ClientResponse {
  client: Client;
}

export interface ClientsListResponse {
  clients: Client[];
}

export interface ClientsResponse {
  clients: Client[];
}
