const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(key: string): string {
  const date = parseDateKey(key);
  const today = todayKey();
  if (key === today) return "Today";
  const tomorrow = toDateKey(new Date(Date.now() + 86400000));
  if (key === tomorrow) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = [];

  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(new Date(year, month, day));
  }

  return cells;
}

export interface CalendarRenderOptions {
  year: number;
  month: number;
  selectedDate: string | null;
  taskCounts: Map<string, number>;
  onSelectDate: (key: string | null) => void;
  onChangeMonth: (year: number, month: number) => void;
}

export function renderCalendar(
  container: HTMLElement,
  options: CalendarRenderOptions
): void {
  const { year, month, selectedDate, taskCounts, onSelectDate, onChangeMonth } =
    options;

  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "calendar-header";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "calendar-nav";
  prevBtn.setAttribute("aria-label", "Previous month");
  prevBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  prevBtn.addEventListener("click", () => {
    const d = new Date(year, month - 1, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  });

  const title = document.createElement("h2");
  title.className = "calendar-title";
  title.textContent = formatMonthYear(year, month);

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "calendar-nav";
  nextBtn.setAttribute("aria-label", "Next month");
  nextBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  nextBtn.addEventListener("click", () => {
    const d = new Date(year, month + 1, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  });

  header.append(prevBtn, title, nextBtn);

  const weekdays = document.createElement("div");
  weekdays.className = "calendar-weekdays";
  weekdays.setAttribute("aria-hidden", "true");
  for (const label of WEEKDAYS) {
    const span = document.createElement("span");
    span.textContent = label;
    weekdays.appendChild(span);
  }

  const grid = document.createElement("div");
  grid.className = "calendar-grid";
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", formatMonthYear(year, month));

  const today = todayKey();

  for (const date of getMonthDays(year, month)) {
    if (!date) {
      const pad = document.createElement("span");
      pad.className = "calendar-day empty";
      pad.setAttribute("aria-hidden", "true");
      grid.appendChild(pad);
      continue;
    }

    const key = toDateKey(date);
    const count = taskCounts.get(key) ?? 0;
    const isToday = key === today;
    const isSelected = key === selectedDate;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = [
      "calendar-day",
      isToday ? "today" : "",
      isSelected ? "selected" : "",
      count > 0 ? "has-tasks" : "",
    ]
      .filter(Boolean)
      .join(" ");
    btn.setAttribute("role", "gridcell");
    btn.setAttribute("aria-label", `${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${count ? `, ${count} task${count === 1 ? "" : "s"}` : ""}`);
    btn.dataset.date = key;

    const num = document.createElement("span");
    num.className = "calendar-day-num";
    num.textContent = String(date.getDate());
    btn.appendChild(num);

    if (count > 0) {
      const dot = document.createElement("span");
      dot.className = "calendar-dot";
      dot.setAttribute("aria-hidden", "true");
      btn.appendChild(dot);
    }

    btn.addEventListener("click", () => {
      onSelectDate(isSelected ? null : key);
    });

    grid.appendChild(btn);
  }

  container.append(header, weekdays, grid);
}
