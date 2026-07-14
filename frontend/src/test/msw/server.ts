import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth';
import { clientsHandlers } from './handlers/clients';
import { kycHandlers } from './handlers/kyc';
import { platformHandlers } from './handlers/platform';
import { usersHandlers } from './handlers/users';
import { accueilHandlers } from './handlers/accueil';

export const server = setupServer(
  ...authHandlers,
  ...clientsHandlers,
  ...kycHandlers,
  ...platformHandlers,
  ...usersHandlers,
  ...accueilHandlers,
);
