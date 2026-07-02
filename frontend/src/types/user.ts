import type { Role, Status } from './common';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
  status: Status;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UsersResponse {
  users: User[];
}

export interface UserResponse {
  user: User;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  status?: Status;
}
