import { gestionnairesRepo } from './baserow/index.js';
import type { DbTask, PublicTask, Role } from '../types/domain.js';

export interface TaskAccessContext {
  userId: string;
  userName: string;
  role: Role;
}

async function resolveGestionnaireName(tenantId: string, userId: string): Promise<string | null> {
  const gestionnaire = await gestionnairesRepo.findGestionnaireByUserId(tenantId, userId);
  return gestionnaire?.name ?? null;
}

export function canAccessTask(
  task: Pick<DbTask, 'assigne_a' | 'cree_par'>,
  context: TaskAccessContext,
  gestionnaireName: string | null,
): boolean {
  if (context.role === 'tenant_admin' || context.role === 'super_admin') {
    return true;
  }
  if (task.cree_par && task.cree_par === context.userName) {
    return true;
  }
  if (gestionnaireName && task.assigne_a === gestionnaireName) {
    return true;
  }
  return false;
}

export async function filterTasksForUser(
  tenantId: string,
  tasks: PublicTask[],
  dbTasks: DbTask[],
  context: TaskAccessContext,
): Promise<PublicTask[]> {
  if (context.role === 'tenant_admin' || context.role === 'super_admin') {
    return tasks;
  }
  const gestionnaireName = await resolveGestionnaireName(tenantId, context.userId);
  const byId = new Map(dbTasks.map((task) => [task.id, task]));
  return tasks.filter((task) => {
    const dbTask = byId.get(task.id);
    return dbTask ? canAccessTask(dbTask, context, gestionnaireName) : false;
  });
}

export async function assertTaskAccess(
  tenantId: string,
  task: DbTask,
  context: TaskAccessContext,
): Promise<void> {
  if (context.role === 'tenant_admin' || context.role === 'super_admin') {
    return;
  }
  const gestionnaireName = await resolveGestionnaireName(tenantId, context.userId);
  if (!canAccessTask(task, context, gestionnaireName)) {
    throw new Error('Task not found');
  }
}
