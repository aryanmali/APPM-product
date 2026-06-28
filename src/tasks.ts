export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  dueDate?: string;
}

export type Filter = "all" | "active" | "completed";

export const STORAGE_KEY = "appm-tasks";

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

export function createTask(text: string, dueDate?: string): Task {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
    ...(dueDate ? { dueDate } : {}),
  };
}

export function filterTasks(
  tasks: Task[],
  filter: Filter,
  date?: string | null
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

  return result;
}

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
