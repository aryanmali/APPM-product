export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  dueDate?: string;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  color: string;
}

export type Filter = "all" | "active" | "completed";

export const STORAGE_KEY = "appm-tasks";
const GROUPS_KEY = "appm-groups";

/** Curated preset palette — harmonious with the warm terracotta accent */
export const GROUP_COLORS: string[] = [
  "#c45c3e", // terracotta (accent)
  "#3e8ec4", // steel blue
  "#6b9e3e", // olive green
  "#9b59b6", // amethyst
  "#e6a23c", // amber
  "#2cb5a0", // teal
  "#d35b8a", // rose
  "#5b7fc4", // periwinkle
];

export const MAX_GROUPS = 8;

/* ---- Task persistence ---- */

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Task[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function createTask(
  text: string,
  dueDate?: string,
  groupId?: string,
): Task {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
    ...(dueDate ? { dueDate } : {}),
    ...(groupId ? { groupId } : {}),
  };
}

/* ---- Group persistence ---- */

export function loadGroups(): Group[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Group[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGroups(groups: Group[]): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function addGroup(groups: Group[], name: string, color: string): Group {
  const group: Group = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color,
  };
  groups.push(group);
  saveGroups(groups);
  return group;
}

export function removeGroup(groups: Group[], id: string): Group[] {
  const next = groups.filter((g) => g.id !== id);
  saveGroups(next);
  return next;
}

/* ---- Filtering ---- */

export function filterTasks(
  tasks: Task[],
  filter: Filter,
  date?: string | null,
  groupId?: string | null,
): Task[] {
  let result: Task[];

  switch (filter) {
    case "active":
      result = tasks.filter((t) => !t.completed);
      break;
    case "completed":
      result = tasks.filter((t) => t.completed);
      break;
    default:
      result = tasks;
  }

  if (date) {
    result = result.filter((t) => t.dueDate === date);
  }

  if (groupId) {
    result = result.filter((t) => t.groupId === groupId);
  }

  return result;
}

/* ---- Utilities ---- */

export function activeCount(tasks: Task[]): number {
  return tasks.filter((t) => !t.completed).length;
}

export function taskCountsByDate(tasks: Task[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    counts.set(task.dueDate, (counts.get(task.dueDate) ?? 0) + 1);
  }
  return counts;
}

export function isOverdue(task: Task, today: string): boolean {
  return !task.completed && !!task.dueDate && task.dueDate < today;
}
