import { renderCalendar, formatShortDate, todayKey } from "./calendar";
import {
  createSpeechInput,
  isSpeechSupported,
  type SpeechStatus,
} from "./speech";
import {
  type Filter,
  type Group,
  type Task,
  GROUP_COLORS,
  MAX_GROUPS,
  activeCount,
  addGroup,
  createTask,
  filterTasks,
  isOverdue,
  loadGroups,
  loadTasks,
  removeGroup,
  saveTasks,
  taskCountsByDate,
} from "./tasks";

/* ------------------------------------------------------------------ */
/*  DOM refs                                                          */
/* ------------------------------------------------------------------ */
const addForm = document.getElementById("add-form") as HTMLFormElement;
const taskInput = document.getElementById("task-input") as HTMLInputElement;
const taskDateInput = document.getElementById("task-date") as HTMLInputElement;
const taskGroupSelect = document.getElementById("task-group-select") as HTMLSelectElement;
const micBtn = document.getElementById("btn-mic") as HTMLButtonElement;
const speechStatus = document.getElementById("speech-status") as HTMLParagraphElement;
const inputWrap = document.querySelector(".input-wrap") as HTMLDivElement;
const taskList = document.getElementById("task-list") as HTMLUListElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const emptyTitle = document.getElementById("empty-title") as HTMLParagraphElement;
const emptyHint = document.getElementById("empty-hint") as HTMLParagraphElement;
const panelFooter = document.getElementById("panel-footer") as HTMLElement;
const taskCount = document.getElementById("task-count") as HTMLSpanElement;
const panelTitle = document.getElementById("tasks-heading") as HTMLHeadingElement;
const clearCompletedBtn = document.getElementById("clear-completed") as HTMLButtonElement;
const clearDateBtn = document.getElementById("clear-date-filter") as HTMLButtonElement;
const calendarRoot = document.getElementById("calendar-root") as HTMLElement;
const filterButtons = document.querySelectorAll<HTMLButtonElement>(".filter");

/* Group DOM refs */
const groupAddForm = document.getElementById("group-add-form") as HTMLFormElement;
const groupNameInput = document.getElementById("group-name-input") as HTMLInputElement;
const groupColorPicker = document.getElementById("group-color-picker") as HTMLDivElement;
const groupListEl = document.getElementById("group-list") as HTMLUListElement;
const groupCountEl = document.getElementById("group-count") as HTMLSpanElement;
const groupFilterBar = document.getElementById("group-filter-bar") as HTMLDivElement;

/* ------------------------------------------------------------------ */
/*  State                                                             */
/* ------------------------------------------------------------------ */
let tasks: Task[] = loadTasks();
let groups: Group[] = loadGroups();
let filter: Filter = "all";
let selectedDate: string | null = null;
let groupFilter: string | null = null;
let selectedColorIndex = 0;

const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

/* ------------------------------------------------------------------ */
/*  Calendar                                                          */
/* ------------------------------------------------------------------ */
function renderCalendarView(): void {
  renderCalendar(calendarRoot, {
    year: calendarYear,
    month: calendarMonth,
    selectedDate,
    taskCounts: taskCountsByDate(tasks),
    onSelectDate: (key) => {
      selectedDate = key;
      if (key) taskDateInput.value = key;
      renderAll();
    },
    onChangeMonth: (year, month) => {
      calendarYear = year;
      calendarMonth = month;
      renderCalendarView();
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Group rendering                                                   */
/* ------------------------------------------------------------------ */
function renderColorSwatches(container: HTMLElement, usedColors: Set<string>): void {
  container.innerHTML = "";
  GROUP_COLORS.forEach((color, i) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = color;
    swatch.setAttribute("role", "radio");
    swatch.setAttribute("aria-label", `Color ${i + 1}`);

    const isUsed = usedColors.has(color);
    const isSelected = i === selectedColorIndex;

    if (isSelected && !isUsed) {
      swatch.classList.add("selected");
      swatch.setAttribute("aria-checked", "true");
    } else {
      swatch.setAttribute("aria-checked", "false");
    }

    if (isUsed) {
      swatch.classList.add("disabled");
      swatch.setAttribute("aria-disabled", "true");
    } else {
      swatch.addEventListener("click", () => {
        selectedColorIndex = i;
        renderGroupColorPicker();
      });
    }

    container.appendChild(swatch);
  });
}

function renderGroupColorPicker(): void {
  const usedColors = new Set(groups.map((g) => g.color));

  // Auto-select next available color if current is taken
  if (usedColors.has(GROUP_COLORS[selectedColorIndex])) {
    const nextAvailable = GROUP_COLORS.findIndex((c) => !usedColors.has(c));
    if (nextAvailable !== -1) {
      selectedColorIndex = nextAvailable;
    }
  }

  renderColorSwatches(groupColorPicker, usedColors);
}

function renderGroupList(): void {
  groupListEl.innerHTML = "";
  groupCountEl.textContent = groups.length > 0 ? `${groups.length} / ${MAX_GROUPS}` : "";

  for (const group of groups) {
    const li = document.createElement("li");
    li.className = "group-item";
    li.dataset.id = group.id;

    const dot = document.createElement("span");
    dot.className = "group-dot";
    dot.style.backgroundColor = group.color;

    const name = document.createElement("span");
    name.className = "group-name";
    name.textContent = group.name;

    const count = tasks.filter((t) => t.groupId === group.id).length;
    const countSpan = document.createElement("span");
    countSpan.className = "group-task-count";
    countSpan.textContent = count === 1 ? "1 task" : `${count} tasks`;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-group-delete";
    deleteBtn.setAttribute("aria-label", `Delete group "${group.name}"`);
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    deleteBtn.addEventListener("click", () => handleDeleteGroup(group.id));

    li.append(dot, name, countSpan, deleteBtn);
    groupListEl.appendChild(li);
  }
}

function renderGroupSelect(): void {
  const currentValue = taskGroupSelect.value;
  taskGroupSelect.innerHTML = "";

  const noGroup = document.createElement("option");
  noGroup.value = "";
  noGroup.textContent = "No group";
  taskGroupSelect.appendChild(noGroup);

  for (const group of groups) {
    const opt = document.createElement("option");
    opt.value = group.id;
    opt.textContent = group.name;
    taskGroupSelect.appendChild(opt);
  }

  // Restore selection if still valid
  if (groups.some((g) => g.id === currentValue)) {
    taskGroupSelect.value = currentValue;
  } else {
    taskGroupSelect.value = "";
  }
}

function renderGroupFilterBar(): void {
  groupFilterBar.innerHTML = "";

  if (groups.length === 0) {
    groupFilterBar.hidden = true;
    return;
  }

  groupFilterBar.hidden = false;

  // "All groups" chip
  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = `group-chip${!groupFilter ? " active" : ""}`;
  allChip.textContent = "All";
  allChip.addEventListener("click", () => {
    groupFilter = null;
    renderAll();
  });
  groupFilterBar.appendChild(allChip);

  for (const group of groups) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `group-chip${groupFilter === group.id ? " active" : ""}`;

    const dot = document.createElement("span");
    dot.className = "group-chip-dot";
    dot.style.backgroundColor = group.color;

    chip.appendChild(dot);
    chip.appendChild(document.createTextNode(group.name));

    chip.addEventListener("click", () => {
      groupFilter = groupFilter === group.id ? null : group.id;
      renderAll();
    });

    groupFilterBar.appendChild(chip);
  }
}

/* ------------------------------------------------------------------ */
/*  Task list rendering                                               */
/* ------------------------------------------------------------------ */
function renderTaskList(): void {
  const visible = filterTasks(tasks, filter, selectedDate, groupFilter);
  const remaining = activeCount(tasks);
  const hasCompleted = tasks.some((t) => t.completed);
  const today = todayKey();

  taskList.innerHTML = "";

  for (const task of visible) {
    taskList.appendChild(createTaskElement(task, today));
  }

  const showEmpty = visible.length === 0;
  emptyState.hidden = !showEmpty;
  taskList.hidden = showEmpty;
  panelFooter.hidden = tasks.length === 0;

  if (selectedDate) {
    panelTitle.textContent = formatShortDate(selectedDate);
    clearDateBtn.hidden = false;
  } else {
    panelTitle.textContent = "Your list";
    clearDateBtn.hidden = true;
  }

  if (showEmpty) {
    if (groupFilter) {
      const gName = groups.find((g) => g.id === groupFilter)?.name ?? "this group";
      emptyTitle.textContent = `No tasks in ${gName}`;
      emptyHint.textContent = "Assign tasks to this group or pick another.";
    } else if (selectedDate) {
      emptyTitle.textContent = "No tasks this day";
      emptyHint.textContent = "Add one above or pick another date.";
    } else if (filter === "completed") {
      emptyTitle.textContent = "Nothing completed yet";
      emptyHint.textContent = "Finished tasks will show up here.";
    } else if (filter === "active") {
      emptyTitle.textContent = "All caught up";
      emptyHint.textContent = "No active tasks right now.";
    } else {
      emptyTitle.textContent = "Nothing here yet";
      emptyHint.textContent = "Add a task above to get started.";
    }
  }

  taskCount.textContent =
    remaining === 1 ? "1 task left" : `${remaining} tasks left`;

  clearCompletedBtn.hidden = !hasCompleted;
}

function renderAll(): void {
  renderCalendarView();
  renderGroupList();
  renderGroupSelect();
  renderGroupFilterBar();
  renderGroupColorPicker();
  renderTaskList();
}

/* ------------------------------------------------------------------ */
/*  Task element builder                                              */
/* ------------------------------------------------------------------ */
function createTaskElement(task: Task, today: string): HTMLLIElement {
  const overdue = isOverdue(task, today);

  const li = document.createElement("li");
  li.className = [
    "task-item",
    task.completed ? "completed" : "",
    overdue ? "overdue" : "",
  ]
    .filter(Boolean)
    .join(" ");
  li.dataset.id = task.id;

  const checkbox = document.createElement("button");
  checkbox.type = "button";
  checkbox.className = "task-check";
  checkbox.setAttribute("aria-label", task.completed ? "Mark incomplete" : "Mark complete");
  checkbox.setAttribute("aria-pressed", String(task.completed));
  checkbox.innerHTML = task.completed
    ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : "";

  const body = document.createElement("div");
  body.className = "task-body";

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  body.appendChild(text);

  /* Meta row: due date + group badge */
  const hasMeta = task.dueDate || task.groupId;
  if (hasMeta) {
    const meta = document.createElement("div");
    meta.className = "task-meta";

    if (task.dueDate) {
      const dateLabel = document.createElement("span");
      dateLabel.className = `task-due${overdue ? " overdue" : ""}`;
      dateLabel.textContent = formatShortDate(task.dueDate);
      meta.appendChild(dateLabel);
    }

    if (task.groupId) {
      const group = groups.find((g) => g.id === task.groupId);
      if (group) {
        const badge = document.createElement("span");
        badge.className = "task-group-badge";
        badge.style.backgroundColor = hexToRgba(group.color, 0.12);
        badge.style.color = group.color;

        const badgeDot = document.createElement("span");
        badgeDot.className = "task-group-badge-dot";
        badgeDot.style.backgroundColor = group.color;

        badge.appendChild(badgeDot);
        badge.appendChild(document.createTextNode(group.name));
        meta.appendChild(badge);
      }
    }

    body.appendChild(meta);
  }

  const dateBtn = document.createElement("button");
  dateBtn.type = "button";
  dateBtn.className = "task-date-btn";
  dateBtn.setAttribute("aria-label", task.dueDate ? "Change due date" : "Set due date");
  dateBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 6.5h12M5 1.5v2M11 1.5v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  dateBtn.addEventListener("click", () => setTaskDueDate(task.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "task-delete";
  deleteBtn.setAttribute("aria-label", "Delete task");
  deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`;

  checkbox.addEventListener("click", () => handleToggleTask(task.id));
  deleteBtn.addEventListener("click", () => handleDeleteTask(task.id));

  li.append(checkbox, body, dateBtn, deleteBtn);
  return li;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ------------------------------------------------------------------ */
/*  Task handlers                                                     */
/* ------------------------------------------------------------------ */
function persist(): void {
  saveTasks(tasks);
  renderAll();
}

function handleAddTask(text: string, dueDate?: string, groupId?: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  tasks = [createTask(trimmed, dueDate, groupId), ...tasks];
  persist();
}

function handleToggleTask(id: string): void {
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  persist();
}

function handleDeleteTask(id: string): void {
  tasks = tasks.filter((t) => t.id !== id);
  persist();
}

function setTaskDueDate(id: string): void {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const input = document.createElement("input");
  input.type = "date";
  input.className = "hidden-date-picker";
  input.value = task.dueDate ?? selectedDate ?? todayKey();
  document.body.appendChild(input);
  input.showPicker?.();
  input.addEventListener(
    "change",
    () => {
      const value = input.value || undefined;
      tasks = tasks.map((t) =>
        t.id === id ? { ...t, dueDate: value } : t
      );
      document.body.removeChild(input);
      persist();
    },
    { once: true }
  );
  input.addEventListener(
    "blur",
    () => {
      if (input.parentNode) document.body.removeChild(input);
    },
    { once: true }
  );
}

/* ------------------------------------------------------------------ */
/*  Group handlers                                                    */
/* ------------------------------------------------------------------ */
function handleAddGroup(name: string, color: string): void {
  const trimmed = name.trim();
  if (!trimmed || groups.length >= MAX_GROUPS) return;

  // Prevent duplicate names
  if (groups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) return;

  addGroup(groups, trimmed, color);
  renderAll();
}

function handleDeleteGroup(id: string): void {
  // Unassign tasks from this group
  tasks = tasks.map((t) =>
    t.groupId === id ? { ...t, groupId: undefined } : t
  );
  saveTasks(tasks);

  groups = removeGroup(groups, id);

  // Reset group filter if it pointed to the deleted group
  if (groupFilter === id) groupFilter = null;

  renderAll();
}

/* ------------------------------------------------------------------ */
/*  Filter handler                                                    */
/* ------------------------------------------------------------------ */
function setFilter(next: Filter): void {
  filter = next;
  filterButtons.forEach((btn) => {
    const isActive = btn.dataset.filter === next;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  renderTaskList();
}

/* ------------------------------------------------------------------ */
/*  Speech                                                            */
/* ------------------------------------------------------------------ */
function setSpeechStatus(status: SpeechStatus): void {
  micBtn.setAttribute("aria-pressed", String(status === "listening"));
  micBtn.classList.toggle("listening", status === "listening");
  inputWrap.classList.toggle("listening", status === "listening");

  if (status === "listening") {
    speechStatus.hidden = false;
    speechStatus.textContent = "Listening… speak your task";
    taskInput.placeholder = "Listening…";
    return;
  }

  taskInput.placeholder = "What needs to be done?";

  if (status === "denied") {
    speechStatus.hidden = false;
    speechStatus.textContent = "Microphone access denied. Allow it in browser settings.";
    return;
  }

  if (status === "unsupported") {
    speechStatus.hidden = false;
    speechStatus.textContent = "Speech input is not supported in this browser.";
    micBtn.hidden = true;
    return;
  }

  speechStatus.hidden = true;
  speechStatus.textContent = "";
}

const speech = createSpeechInput({
  getBaseText: () => taskInput.value,
  onTranscript: (text, isFinal) => {
    taskInput.value = text.slice(0, taskInput.maxLength);
    if (isFinal) taskInput.focus();
  },
  onStatusChange: setSpeechStatus,
});

if (isSpeechSupported() && speech) {
  micBtn.hidden = false;
  micBtn.addEventListener("click", () => speech.toggle());
} else {
  setSpeechStatus("unsupported");
}

/* ------------------------------------------------------------------ */
/*  Event wiring                                                      */
/* ------------------------------------------------------------------ */
addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  speech?.stop();
  const dueDate = taskDateInput.value || undefined;
  const groupId = taskGroupSelect.value || undefined;
  handleAddTask(taskInput.value, dueDate, groupId);
  taskInput.value = "";
  taskInput.focus();
});

groupAddForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const color = GROUP_COLORS[selectedColorIndex];
  handleAddGroup(groupNameInput.value, color);
  groupNameInput.value = "";
  groupNameInput.focus();
});

clearCompletedBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.completed);
  persist();
});

clearDateBtn.addEventListener("click", () => {
  selectedDate = null;
  renderAll();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = btn.dataset.filter as Filter;
    if (next) setFilter(next);
  });
});

/* ------------------------------------------------------------------ */
/*  Boot                                                              */
/* ------------------------------------------------------------------ */
if (selectedDate) taskDateInput.value = selectedDate;

renderAll();
taskInput.focus();
