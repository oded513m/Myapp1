const today = getDateKey(new Date());
const storageKey = "daymark-routine-tasks";
const legacyTodayStorageKey = `daymark-routine-${today}`;
const laterStorageKey = "daymark-later-activities";
const notificationStateKey = "daymark-routine-notification-state";
const historyDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric"
});
const periods = [
  { id: "morning", title: "Morning", note: "Start with intention" },
  { id: "midday", title: "Midday", note: "Keep your energy steady" },
  { id: "evening", title: "Evening", note: "Close the day gently" }
];
const starterTasks = [
  { id: "morning-water", period: "morning", title: "Drink a glass of water", note: "A simple first win" },
  { id: "morning-priorities", period: "morning", title: "Choose your top three priorities", note: "Make the day smaller" },
  { id: "midday-break", period: "midday", title: "Take a real movement break", note: "Step away for ten minutes" },
  { id: "midday-reset", period: "midday", title: "Reset your space", note: "Five minutes is enough" },
  { id: "evening-reflect", period: "evening", title: "Write one thing that went well", note: "Notice the progress" },
  { id: "evening-tomorrow", period: "evening", title: "Set up one thing for tomorrow", note: "Give future you a hand" }
];

const routineGroups = document.querySelector("#routine-groups");
const quickAdd = document.querySelector("#quick-add");
const laterList = document.querySelector("#later-list");
const laterForm = document.querySelector("#later-form");
const routineNavItems = document.querySelectorAll("[data-routine-view]");
const routineViews = document.querySelectorAll("[data-routine-panel]");
let tasks = loadTasks();
let laterActivities = loadLaterActivities();
let reminderCheckInProgress = false;
let cachedHistoryHtml;

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(stored)) return stored;
    const legacyStored = JSON.parse(localStorage.getItem(legacyTodayStorageKey));
    if (Array.isArray(legacyStored)) {
      localStorage.setItem(storageKey, JSON.stringify(legacyStored));
      return legacyStored;
    }
    const freshTasks = starterTasks.map((task) => ({ ...task }));
    localStorage.setItem(storageKey, JSON.stringify(freshTasks));
    return freshTasks;
  } catch {
    return starterTasks.map((task) => ({ ...task }));
  }
}

function loadLaterActivities() {
  try {
    const stored = JSON.parse(localStorage.getItem(laterStorageKey));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
  daymarkSync.saveRoutine(tasks, laterActivities).catch(() => {});
}

function saveLaterActivities() {
  localStorage.setItem(laterStorageKey, JSON.stringify(laterActivities));
  daymarkSync.saveRoutine(tasks, laterActivities).catch(() => {});
}

function loadNotificationState() {
  try {
    const stored = JSON.parse(localStorage.getItem(notificationStateKey));
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function saveNotificationState(state) {
  localStorage.setItem(notificationStateKey, JSON.stringify(state));
}

function isInstalledPwa() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function getReminderDate(activityDate, daysBefore) {
  const date = new Date(`${activityDate}T12:00:00`);
  date.setDate(date.getDate() - daysBefore);
  return getDateKey(date);
}

async function sendReminderNotification(title, body, tag) {
  if (!isInstalledPwa() || !("Notification" in window) || Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, { body, tag, icon: "./icons/app-icon.jpg", badge: "./icons/app-icon.jpg" });
}

async function checkScheduledReminders() {
  if (!isInstalledPwa() || !("Notification" in window) || Notification.permission !== "granted") return;
  if (reminderCheckInProgress) return;
  reminderCheckInProgress = true;

  try {
    const state = loadNotificationState();
    for (const activity of laterActivities) {
      if (activity.complete) continue;
      const reminderType = activity.date === today
        ? "due"
        : getReminderDate(activity.date, 1) === today ? "day-before" : null;
      if (!reminderType) continue;
      const stateKey = `${activity.id}-${reminderType}-${activity.date}`;
      if (state[stateKey]) continue;
      const message = reminderType === "due" ? `Due today: ${activity.title}` : `Tomorrow: ${activity.title}`;
      try {
        await sendReminderNotification("My app reminder", message, stateKey);
        state[stateKey] = true;
        saveNotificationState(state);
      } catch {
        // Retry on the next check if the service worker is temporarily unavailable.
      }
    }
  } finally {
    reminderCheckInProgress = false;
  }
}

function formatDate(dateKey) {
  return historyDateFormatter.format(new Date(`${dateKey}T12:00:00`));
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    "\"": "&quot;"
  })[character]);
}

function render() {
  routineGroups.innerHTML = periods.map((period) => {
    const periodTasks = tasks.filter((task) => task.period === period.id);
    const complete = periodTasks.filter((task) => task.complete).length;
    return `
      <section class="routine-group" aria-labelledby="${period.id}-title">
        <div class="group-heading">
          <div>
            <h3 id="${period.id}-title">${period.title}</h3>
          </div>
          <span class="group-count">${complete}/${periodTasks.length} done</span>
        </div>
        ${periodTasks.length ? periodTasks.map((task) => `
          <article class="routine-task ${task.complete ? "is-complete" : ""}">
            <label class="task-check" aria-label="Mark ${escapeHtml(task.title)} complete">
              <input type="checkbox" data-task-id="${task.id}" ${task.complete ? "checked" : ""} />
              <span aria-hidden="true">✓</span>
            </label>
            <div class="task-copy">
              <p class="task-title">${escapeHtml(task.title)}</p>
              <p class="task-note">${escapeHtml(task.note || period.note)}</p>
            </div>
            <button class="remove-task" type="button" data-remove-id="${task.id}" aria-label="Remove ${escapeHtml(task.title)}">×</button>
          </article>`).join("") : `
          <div class="empty-group">Nothing planned for this part of the day.</div>`}
      </section>`;
  }).join("");

  const completeCount = tasks.filter((task) => task.complete).length;
  const percentage = tasks.length ? Math.round((completeCount / tasks.length) * 100) : 0;
  document.querySelector("#progress-percent").textContent = `${percentage}%`;
  document.querySelector("#progress-detail").textContent = `${completeCount} of ${tasks.length} complete`;
  document.querySelector("#progress-ring").style.background = `conic-gradient(var(--apricot-deep) ${percentage * 3.6}deg, rgba(123, 72, 51, 0.18) 0deg)`;
  renderLaterActivities();
  renderHistory();
  renderReminder();
  checkScheduledReminders();
}

function renderReminder() {
  const dueActivities = laterActivities.filter((activity) => activity.date <= today && !activity.complete);
  const banner = document.querySelector("#reminder-banner");
  if (!dueActivities.length) {
    banner.hidden = true;
    return;
  }
  const count = dueActivities.length;
  document.querySelector("#reminder-message").textContent = count === 1
    ? `Due today: ${dueActivities[0].title}`
    : `${count} activities are due today`;
  banner.hidden = false;
}

function renderLaterActivities() {
  const sortedActivities = laterActivities.slice().sort((first, second) => first.date.localeCompare(second.date));
  document.querySelector("#later-count").textContent = sortedActivities.length;
  laterList.innerHTML = sortedActivities.length ? sortedActivities.map((activity) => `
    <article class="later-item ${activity.complete ? "is-complete" : ""}">
      <input type="checkbox" data-later-id="${activity.id}" ${activity.complete ? "checked" : ""} aria-label="Mark ${escapeHtml(activity.title)} complete" />
      <div>
        <p class="later-title">${escapeHtml(activity.title)}</p>
        <p class="later-date">${formatDate(activity.date)}</p>
      </div>
      <button class="remove-later" type="button" data-remove-later="${activity.id}" aria-label="Remove ${escapeHtml(activity.title)}">×</button>
    </article>`).join("") : `<p class="empty-side">Keep appointments, ideas, and tasks here until their day arrives.</p>`;
}

function renderHistory() {
  if (cachedHistoryHtml !== undefined) {
    document.querySelector("#history-list").innerHTML = cachedHistoryHtml;
    return;
  }

  const pastDays = Object.keys(localStorage)
    .filter((key) => key.startsWith("daymark-routine-") && key !== storageKey && key !== legacyTodayStorageKey)
    .map((key) => ({ date: key.replace("daymark-routine-", ""), tasks: loadStoredDay(key) }))
    .filter((day) => day.tasks.length)
    .sort((first, second) => second.date.localeCompare(first.date));

  cachedHistoryHtml = pastDays.length ? pastDays.map((day) => {
    const complete = day.tasks.filter((task) => task.complete).length;
    return `
      <details class="history-item">
        <summary>${formatDate(day.date)} · ${complete}/${day.tasks.length}</summary>
        <div class="history-tasks">
          ${day.tasks.map((task) => `<div class="history-task ${task.complete ? "is-complete" : ""}"><span>${task.complete ? "✓" : "○"}</span><span>${escapeHtml(task.title)}</span></div>`).join("")}
        </div>
      </details>`;
  }).join("") : `<p class="empty-side">Finished days will appear here.</p>`;
  document.querySelector("#history-list").innerHTML = cachedHistoryHtml;
}

function loadStoredDay(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(new Date());
document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector("#later-date").value = getDateKey(new Date());

routineNavItems.forEach((navItem) => {
  navItem.addEventListener("click", () => {
    const view = navItem.dataset.routineView;
    routineNavItems.forEach((item) => item.classList.toggle("is-active", item === navItem));
    routineViews.forEach((panel) => {
      panel.hidden = panel.dataset.routinePanel !== view;
    });
  });
});

routineGroups.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-task-id]");
  if (!checkbox) return;
  const task = tasks.find((item) => item.id === checkbox.dataset.taskId);
  if (task) {
    task.complete = checkbox.checked;
    saveTasks();
    render();
  }
});
routineGroups.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-id]");
  if (!removeButton) return;
  tasks = tasks.filter((task) => task.id !== removeButton.dataset.removeId);
  saveTasks();
  render();
});
laterList.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-later-id]");
  if (!checkbox) return;
  const activity = laterActivities.find((item) => item.id === checkbox.dataset.laterId);
  if (activity) {
    activity.complete = checkbox.checked;
    saveLaterActivities();
    renderLaterActivities();
    renderReminder();
  }
});
laterList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-later]");
  if (!removeButton) return;
  laterActivities = laterActivities.filter((item) => item.id !== removeButton.dataset.removeLater);
  saveLaterActivities();
  renderLaterActivities();
  renderReminder();
});
document.querySelector("#clear-completed").addEventListener("click", () => {
  tasks.forEach((task) => {
    task.complete = false;
  });
  saveTasks();
  render();
});
quickAdd.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(quickAdd);
  const title = formData.get("task").trim();
  if (!title) return;
  tasks.push({
    id: `task-${Date.now()}`,
    period: formData.get("period"),
    title,
    note: "Added to your routine",
    complete: false
  });
  saveTasks();
  quickAdd.reset();
  render();
});
laterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(laterForm);
  const title = formData.get("task").trim();
  if (!title) return;
  laterActivities.push({
    id: `later-${Date.now()}`,
    title,
    date: formData.get("date"),
    complete: false
  });
  saveLaterActivities();
  laterForm.reset();
  document.querySelector("#later-date").value = getDateKey(new Date());
  renderLaterActivities();
  renderReminder();
});

document.querySelector("#enable-notifications").addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    checkScheduledReminders();
    renderReminder();
  }
});

let activeDate = getDateKey(new Date());
window.setInterval(() => {
  checkScheduledReminders();
  const currentDate = getDateKey(new Date());
  if (currentDate !== activeDate) {
    localStorage.setItem(`daymark-routine-${activeDate}`, JSON.stringify(tasks));
    saveTasks();
    cachedHistoryHtml = undefined;
    window.location.reload();
  }
}, 30000);

render();
daymarkSync.loadRoutine({ tasks, laterActivities }).then((cloudData) => {
  tasks = cloudData.tasks;
  laterActivities = cloudData.laterActivities;
  saveTasks();
  saveLaterActivities();
  cachedHistoryHtml = undefined;
  render();
}).catch(() => {});
