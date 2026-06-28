export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
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

export function createTask(text: string): Task {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
  };
}

export function filterTasks(tasks: Task[], filter: Filter): Task[] {
  switch (filter) {
    case "active":
      return tasks.filter((t) => !t.completed);
    case "completed":
      return tasks.filter((t) => t.completed);
    default:
      return tasks;
  }
}

export function activeCount(tasks: Task[]): number {
  return tasks.filter((t) => !t.completed).length;
}
