import { useMemo, useState } from 'react';
import {
  FiCalendar,
  FiCheckCircle,
  FiCheckSquare,
  FiClock,
  FiList,
  FiPauseCircle,
  FiPlayCircle,
  FiPlus,
  FiTrash2,
  FiUser,
} from 'react-icons/fi';
import type { ClientTask, Gestionnaire } from '../../types';
import Select from '../ui/Select';
import { formatDateFr } from '../../utils/kyc';
import AddTaskModal, { type AddTaskInput } from './AddTaskModal';


export const TASK_STATUS_OPTIONS = [
  'À faire',
  'En cours',
  'Fait',
  'Reporté',
] as const;

export const TASK_PRIORITE_OPTIONS = [
  'Haute',
  'Normale',
  'Basse',
] as const;

export type TaskStatusOption = (typeof TASK_STATUS_OPTIONS)[number];
export type TaskPrioriteOption = (typeof TASK_PRIORITE_OPTIONS)[number];

export type TaskFilterValue = 'active' | 'all' | TaskStatusOption;

export const TASK_FILTER_OPTIONS = [
  { value: 'active' as const, label: 'Actives uniquement' },
  { value: 'all' as const, label: 'Toutes' },
  { value: 'À faire' as const, label: 'À faire' },
  { value: 'En cours' as const, label: 'En cours' },
  { value: 'Fait' as const, label: 'Faites' },
  { value: 'Reporté' as const, label: 'Reportées' },
];

type StatusConfig = {
  icon: typeof FiCheckSquare;
  variant: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  'À faire': { icon: FiList, variant: 'todo' },
  'En cours': { icon: FiPlayCircle, variant: 'progress' },
  Fait: { icon: FiCheckCircle, variant: 'done' },
  Reporté: { icon: FiPauseCircle, variant: 'postponed' },
};

const DEFAULT_STATUS_CONFIG: StatusConfig = {
  icon: FiList,
  variant: 'todo',
};

function statusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status] ?? DEFAULT_STATUS_CONFIG;
}

function priorityVariant(priority: string | null): string {
  if (priority === 'Haute') return 'high';
  if (priority === 'Basse') return 'low';
  return 'normal';
}

function taskSortKey(task: ClientTask): [number, number] {
  const done = task.status === 'Fait' ? 1 : 0;
  const due = task.dueDate ? Date.parse(task.dueDate) : Number.MAX_SAFE_INTEGER;
  const parsedDue = Number.isNaN(due) ? Number.MAX_SAFE_INTEGER : due;
  return [done, parsedDue];
}

function isOverdue(task: ClientTask): boolean {
  if (!task.dueDate || task.status === 'Fait') return false;
  const due = Date.parse(task.dueDate);
  if (Number.isNaN(due)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today.getTime();
}

function matchesStatusFilter(task: ClientTask, filter: TaskFilterValue): boolean {
  if (filter === 'active') return task.status !== 'Fait';
  if (filter === 'all') return true;
  return task.status === filter;
}

interface ClientTasksTabProps {
  tasks: ClientTask[];
  gestionnaires: Gestionnaire[];
  isAdding: boolean;
  isUpdating: boolean;
  onAddTask: (input: AddTaskInput, onSuccess?: () => void) => void;
  onUpdateTaskStatus: (id: string, status: TaskStatusOption) => void;
  onDeleteTask: (id: string) => void;
}

export default function ClientTasksTab({
  tasks,
  gestionnaires,
  isAdding,
  isUpdating,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
}: ClientTasksTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskFilterValue>('active');

  const filteredTasks = useMemo(() => {
    const list = tasks.filter((task) => matchesStatusFilter(task, statusFilter));
    return list.sort((a, b) => {
      const [doneA, dueA] = taskSortKey(a);
      const [doneB, dueB] = taskSortKey(b);
      if (doneA !== doneB) return doneA - doneB;
      return dueA - dueB;
    });
  }, [tasks, statusFilter]);

  const handleSubmit = (input: AddTaskInput) => {
    onAddTask(input, () => setModalOpen(false));
  };

  const resetFilter = () => setStatusFilter('active');

  return (
    <div className="cp-tasks">
      <div className="cp-tasks-toolbar">
        <div className="cp-tasks-status-filter">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskFilterValue)}
            aria-label="Filtrer les tâches par statut"
          >
            {TASK_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="button"
          className="btn-bronze btn-sm"
          onClick={() => setModalOpen(true)}
        >
          <FiPlus aria-hidden="true" />
          Nouvelle tâche
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="cp-tasks-empty">
          <FiCheckSquare aria-hidden="true" />
          <p>Aucune tâche pour ce client.</p>
          <span>Ajoutez une tâche pour organiser le suivi.</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="cp-tasks-empty">
          <FiList aria-hidden="true" />
          <p>Aucune tâche ne correspond à ce filtre.</p>
          <span>
            Modifiez le filtre ou réinitialisez pour afficher toutes les tâches
            actives.
          </span>
          <button
            type="button"
            className="btn-secondary btn-secondary--sm"
            onClick={resetFilter}
          >
            Réinitialiser le filtre
          </button>
        </div>
      ) : (
        <ul className="cp-tasks-list">
          {filteredTasks.map((task) => {
            const config = statusConfig(task.status);
            const StatusIcon = config.icon;
            const overdue = isOverdue(task);
            const priority = priorityVariant(task.priorite);

            return (
              <li
                key={task.id}
                className={`cp-task-card cp-task-card--${config.variant}${task.status === 'Fait' ? ' cp-task-card--completed' : ''}`}
              >
                <div className="cp-task-card__accent" aria-hidden="true" />
                <div className="cp-task-card__body">
                  <div className="cp-task-card__header">
                    <span className={`cp-task-badge cp-task-badge--${config.variant}`}>
                      <StatusIcon aria-hidden="true" />
                      {task.status}
                    </span>
                    <span className={`cp-task-priority cp-task-priority--${priority}`}>
                      {task.priorite || 'Normale'}
                    </span>
                    <button
                      type="button"
                      className="cp-task-card__delete"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label="Supprimer la tâche"
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>

                  <h4 className="cp-task-card__title">{task.title}</h4>

                  {task.description && (
                    <p className="cp-task-card__description">{task.description}</p>
                  )}

                  <div className="cp-task-card__footer">
                    <label className="cp-task-card__status-select">
                      <Select
                        compact
                        value={task.status}
                        disabled={isUpdating}
                        aria-label="Statut de la tâche"
                        onChange={(e) => onUpdateTaskStatus(task.id, e.target.value as TaskStatusOption)}
                      >
                        {TASK_STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </Select>
                    </label>

                    <div className="cp-task-card__meta">
                      {task.dueDate && (
                        <span className={`cp-task-card__due${overdue ? ' cp-task-card__due--overdue' : ''}`}>
                          <FiCalendar aria-hidden="true" />
                          {formatDateFr(task.dueDate)}
                          {overdue && ' · En retard'}
                        </span>
                      )}
                      {task.assigneA && (
                        <span className="cp-task-card__assignee">
                          <FiUser aria-hidden="true" />
                          {task.assigneA}
                        </span>
                      )}
                      {!task.dueDate && !task.assigneA && (
                        <span className="cp-task-card__due cp-task-card__due--muted">
                          <FiClock aria-hidden="true" />
                          Sans échéance
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddTaskModal
        open={modalOpen}
        gestionnaires={gestionnaires}
        isSaving={isAdding}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
