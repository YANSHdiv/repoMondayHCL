(() => {
  "use strict";

  const STORAGE_KEY = "studyflow.studentTask.v1";
  const subjectColors = ["#665bd9", "#e09b46", "#3d9b79", "#d56d81", "#478cc5", "#9a70c8"];
  const icons = ["◈", "⌘", "⌬", "▧", "◉", "✳"];
  const today = new Date();
  const isoDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const addDays = (date, days) => { const result = new Date(date); result.setDate(result.getDate() + days); return result; };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const dateAt = offset => isoDate(addDays(today, offset));

  function demoData() {
    const subjects = [
      { id: "s-cs204", name: "Data Structures", code: "CS204", teacher: "Dr. Jordan Lee", schedule: "Mon, Wed · 10:00 AM" },
      { id: "s-ma202", name: "Linear Algebra", code: "MA202", teacher: "Prof. Nadia Shah", schedule: "Tue, Thu · 11:30 AM" },
      { id: "s-phy110", name: "Physics II", code: "PHY110", teacher: "Dr. Samuel Chen", schedule: "Mon, Fri · 1:00 PM" },
      { id: "s-eng210", name: "Technical Writing", code: "ENG210", teacher: "Prof. Mia Carter", schedule: "Tue · 2:00 PM" },
      { id: "s-cs230", name: "Database Systems", code: "CS230", teacher: "Dr. Arjun Patel", schedule: "Wed, Fri · 9:00 AM" },
      { id: "s-his105", name: "Modern History", code: "HIS105", teacher: "Prof. Elena Ruiz", schedule: "Thu · 3:00 PM" }
    ];
    const taskSeed = [
      ["Binary tree worksheet", "Complete exercises 1–8 from the weekly problem set.", 1, "High", "Homework", false],
      ["Read chapter 6", "Review eigenvalues and eigenvectors before class.", 0, "Medium", "Revision", false],
      ["Lab report: circuits", "Include observations, calculations, and a short conclusion.", 3, "High", "Lab", false],
      ["Research paper outline", "Submit a one-page outline with three references.", 5, "Medium", "Assignment", false],
      ["SQL practice set", "Write queries using joins and aggregate functions.", 0, "Medium", "Homework", false],
      ["Midterm review", "Revise lecture notes from weeks 1–5.", 8, "Low", "Revision", false],
      ["Vector spaces quiz", "Practice the online quiz questions.", -2, "High", "Quiz", true],
      ["Database schema project", "Create an ER diagram for the library system.", 10, "High", "Project", false],
      ["Wave mechanics notes", "Summarize key formulas from lecture.", -1, "Low", "Revision", true],
      ["Essay source analysis", "Evaluate two primary sources for the essay.", 4, "Medium", "Assignment", false],
      ["Sorting algorithms", "Compare time complexity for four algorithms.", 2, "High", "Assignment", false],
      ["History reading response", "Write a response to the assigned primary source.", -4, "Low", "Homework", true]
    ];
    const tasks = taskSeed.map((item, index) => ({
      id: `t-demo-${index + 1}`, title: item[0], description: item[1],
      subjectId: subjects[index % subjects.length].id, dueDate: dateAt(item[2]),
      priority: item[3], workType: item[4], completed: item[5]
    }));
    const attendance = [];
    const counts = [18, 15, 13, 16, 14, 11];
    const absent = [2, 0, 4, 1, 3, 0];
    subjects.forEach((subject, subjectIndex) => {
      for (let index = 0; index < counts[subjectIndex]; index += 1) {
        const isAbsent = index >= counts[subjectIndex] - absent[subjectIndex];
        attendance.push({ id: uid(), subjectId: subject.id, date: dateAt(-(index * 3 + subjectIndex)), status: isAbsent ? "absent" : "attended" });
      }
    });
    return { tasks, subjects, attendance, settings: { attendanceTarget: 75 }, preferences: { theme: "light" }, profile: { name: "Alex Morgan", email: "alex.morgan@student.edu" } };
  }

  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return demoData();
      const value = JSON.parse(stored);
      if (!value || !Array.isArray(value.tasks) || !Array.isArray(value.subjects) || !Array.isArray(value.attendance)) throw new Error("Saved data has an invalid format.");
      return {
        tasks: value.tasks, subjects: value.subjects, attendance: value.attendance,
        settings: { attendanceTarget: 75, ...value.settings },
        preferences: { theme: "light", ...value.preferences },
        profile: { name: "Student", email: "", ...value.profile }
      };
    } catch (error) {
      console.error("Unable to load StudyFlow data:", error);
      return demoData();
    }
  }

  let data = loadData();
  let currentView = "dashboard";
  let selectedSubjectId = null;
  let calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedCalendarDate = isoDate(today);
  let toastTimer;
  const page = document.querySelector("#page-content");
  const taskModal = document.querySelector("#task-modal");
  const subjectModal = document.querySelector("#subject-modal");

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (error) { console.error("Unable to save StudyFlow data:", error); notify("Could not save changes. Check browser storage."); }
  }
  function notify(message) {
    const toast = document.querySelector("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  const subjectFor = id => data.subjects.find(subject => subject.id === id);
  const taskProgress = subjectId => {
    const items = data.tasks.filter(task => task.subjectId === subjectId);
    const completed = items.filter(task => task.completed).length;
    return { total: items.length, completed, percent: items.length ? Math.round(completed / items.length * 100) : 0 };
  };
  function subjectAttendance(subjectId) {
    const records = data.attendance.filter(record => record.subjectId === subjectId);
    const attended = records.filter(record => record.status === "attended").length;
    return { total: records.length, attended, absent: records.length - attended, percent: records.length ? Math.round(attended / records.length * 100) : 0 };
  }
  function overallAttendance() {
    const attended = data.attendance.filter(record => record.status === "attended").length;
    return data.attendance.length ? Math.round(attended / data.attendance.length * 100) : 0;
  }
  function attendanceBelowTarget(stats, target = Number(data.settings.attendanceTarget) || 75) {
    return stats.total > 0 && stats.attended * 100 < target * stats.total;
  }
  function classesToTarget(stats, target = Number(data.settings.attendanceTarget) || 75) {
    if (!stats.total) return null;
    if (!attendanceBelowTarget(stats, target)) return 0;
    if (target >= 100) return Infinity;
    return Math.ceil((target * stats.total - 100 * stats.attended) / (100 - target));
  }
  function dateLabel(value, options = { month: "short", day: "numeric" }) {
    if (!value) return "No due date";
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
  }
  function isOverdue(task) { return !task.completed && task.dueDate < isoDate(today); }
  function setTheme() { document.documentElement.dataset.theme = data.preferences.theme === "dark" ? "dark" : "light"; }
  function updateProfileBits() {
    const name = data.profile.name.trim() || "Student";
    document.querySelector("#sidebar-name").textContent = name;
    document.querySelector("#sidebar-avatar").textContent = name.charAt(0).toUpperCase();
    document.querySelector("#top-avatar").textContent = name.charAt(0).toUpperCase();
    document.querySelector("#nav-task-count").textContent = data.tasks.filter(task => !task.completed).length;
  }
  function pageHeader(title, subtitle, action = "") {
    return `<div class="page-heading"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ""}</div>`;
  }
  function statCard(icon, value, label, tone = "") {
    return `<div class="stat-card"><span class="stat-icon ${tone}" aria-hidden="true">${icon}</span><div><div class="stat-value">${esc(value)}</div><div class="stat-label">${esc(label)}</div></div></div>`;
  }
  function emptyState(title, text, icon = "✦") {
    return `<div class="empty-state"><span aria-hidden="true">${icon}</span><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;
  }
  function taskCard(task) {
    const subject = subjectFor(task.subjectId);
    const overdue = isOverdue(task);
    return `<article class="task-card ${task.completed ? "is-complete" : ""}">
      <button class="task-check" data-action="toggle-task" data-id="${esc(task.id)}" aria-label="${task.completed ? "Reopen" : "Complete"} ${esc(task.title)}" aria-pressed="${task.completed}">${task.completed ? "✓" : ""}</button>
      <div class="task-content"><div class="task-title-row"><h3 class="task-name">${esc(task.title)}</h3><span class="pill priority-${esc(task.priority.toLowerCase())}">${esc(task.priority)}</span></div>
      ${task.description ? `<p class="task-description">${esc(task.description)}</p>` : ""}
      <div class="task-meta"><span class="pill">${esc(subject?.name ?? "Unassigned")}</span><span class="pill">${esc(task.workType)}</span><span class="task-due ${overdue ? "overdue" : ""}">${overdue ? "Overdue · " : "Due · "}${esc(dateLabel(task.dueDate))}</span></div></div>
      <div class="task-actions"><button class="small-action" data-action="edit-task" data-id="${esc(task.id)}" aria-label="Edit ${esc(task.title)}">✎</button><button class="small-action delete" data-action="delete-task" data-id="${esc(task.id)}" aria-label="Delete ${esc(task.title)}">×</button></div>
    </article>`;
  }
  function miniTask(task) {
    const subject = subjectFor(task.subjectId);
    return `<div class="mini-task"><button class="mini-check" data-action="toggle-task" data-id="${esc(task.id)}" aria-label="${task.completed ? "Reopen" : "Complete"} ${esc(task.title)}" aria-pressed="${task.completed}">${task.completed ? "✓" : ""}</button><div class="mini-task-copy"><strong>${esc(task.title)}</strong><small>${esc(subject?.name ?? "Unassigned")} · ${esc(task.workType)}</small></div><span class="pill priority-${esc(task.priority.toLowerCase())}">${esc(task.priority)}</span></div>`;
  }
  function deadline(task) {
    const [year, month, day] = task.dueDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const subject = subjectFor(task.subjectId);
    return `<div class="deadline"><div class="date-tile"><strong>${day}</strong><small>${date.toLocaleDateString(undefined, { month: "short" })}</small></div><div class="deadline-copy"><strong>${esc(task.title)}</strong><small>${esc(subject?.name ?? "Unassigned")} · ${esc(dateLabel(task.dueDate, { weekday: "short" }))}</small></div><span class="pill priority-${esc(task.priority.toLowerCase())}">${esc(task.priority)}</span></div>`;
  }

  function renderDashboard() {
    const total = data.tasks.length;
    const completed = data.tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const overdue = data.tasks.filter(isOverdue).length;
    const attendance = overallAttendance();
    const tasksToday = data.tasks.filter(task => task.dueDate === isoDate(today) && !task.completed);
    const upcoming = data.tasks.filter(task => !task.completed && task.dueDate >= isoDate(today)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
    const progressRows = data.subjects.map(subject => {
      const progress = taskProgress(subject.id);
      return `<div><div class="progress-row-head"><span>${esc(subject.name)}</span><span>${progress.completed}/${progress.total} tasks</span></div><div class="progress-track" aria-label="${progress.percent}% complete"><div class="progress-fill" style="width:${progress.percent}%"></div></div></div>`;
    }).join("");
    const target = Number(data.settings.attendanceTarget) || 75;
    const overallBelow = data.attendance.filter(record => record.status === "attended").length * 100 < target * data.attendance.length;
    const attNote = !data.attendance.length ? "Record attendance to see your progress." : overallBelow ? `Below your ${target}% target. Keep attending to build it back up.` : `You're meeting your ${target}% attendance target. Nice work!`;
    return `${pageHeader(`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${data.profile.name.split(/\s+/)[0] || "there"}!`, "Here’s what’s happening with your studies today.", `<button class="button button-primary" data-action="new-task">＋ Add a task</button>`)}
      <section class="stats-grid" aria-label="Task overview">${statCard("☷", total, "All tasks")}${statCard("◷", pending, "Pending", "orange")}${statCard("✓", completed, "Completed", "green")}${statCard("!", overdue, "Overdue", "red")}</section>
      <div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>Subject progress</h2><p>How your coursework is moving along</p></div><button class="text-link" data-view="classes">View classes →</button></div><div class="subject-progress-list">${progressRows || emptyState("No subjects yet", "Add a class to start tracking your progress.")}</div></section>
      <section class="panel"><div class="panel-heading"><div><h2>Attendance</h2><p>Your overall class attendance</p></div><button class="text-link" data-view="attendance">Details →</button></div><div class="attendance-summary"><div class="ring" style="--percent:${attendance}%"><div class="ring-label">${attendance}%<small>overall</small></div></div><div class="attendance-copy"><strong>${!data.attendance.length ? "No records yet" : overallBelow ? "Needs attention" : "On track!"}</strong><p>${esc(attNote)}</p></div></div></section></div>
      <div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>Today's tasks</h2><p>${dateLabel(isoDate(today), { weekday: "long", month: "long", day: "numeric" })}</p></div><button class="text-link" data-view="tasks">All tasks →</button></div><div class="today-task-list">${tasksToday.length ? tasksToday.map(miniTask).join("") : emptyState("Nothing due today", "You're all clear. Use the time to get ahead!")}</div></section>
      <section class="panel"><div class="panel-heading"><div><h2>Upcoming deadlines</h2><p>Stay ahead of what's next</p></div><button class="text-link" data-view="calendar">Calendar →</button></div><div class="deadline-list">${upcoming.length ? upcoming.map(deadline).join("") : emptyState("No upcoming deadlines", "Add a task to keep your plans in view.")}</div></section></div>`;
  }
  function renderTasks(completedOnly = false) {
    const action = `<button class="button button-primary" data-action="new-task">＋ Add a task</button>`;
    const title = completedOnly ? "Completed tasks" : "My tasks";
    const subtitle = completedOnly ? "A record of everything you've finished." : "Keep track of assignments, projects, and more.";
    const tasks = data.tasks.filter(task => completedOnly ? task.completed : true).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return `${pageHeader(title, subtitle, action)}
      ${completedOnly ? "" : `<div class="controls-row" aria-label="Task filters">
        <input class="control search" id="task-search" type="search" placeholder="Search your tasks..." aria-label="Search tasks">
        <select class="control" id="task-status" aria-label="Filter by status"><option value="all">All statuses</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="overdue">Overdue</option></select>
        <select class="control" id="task-subject" aria-label="Filter by subject"><option value="all">All subjects</option>${data.subjects.map(subject => `<option value="${esc(subject.id)}">${esc(subject.name)}</option>`).join("")}</select>
        <select class="control" id="task-priority" aria-label="Filter by priority"><option value="all">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
        <select class="control" id="task-sort" aria-label="Sort tasks"><option value="date-asc">Due date (earliest)</option><option value="date-desc">Due date (latest)</option><option value="priority">Priority</option><option value="title">Title</option></select>
      </div>`}
      <section class="task-list" id="task-list" aria-live="polite">${tasks.length ? tasks.map(taskCard).join("") : emptyState(completedOnly ? "No completed tasks yet" : "Your task list is empty", completedOnly ? "Complete a task and it will show up here." : "Add your first task to get started.")}</section>`;
  }
  function subjectCard(subject, index) {
    const attendance = subjectAttendance(subject.id);
    const progress = taskProgress(subject.id);
    return `<article class="subject-card"><div class="subject-card-top"><span class="subject-color" style="background:${subjectColors[index % subjectColors.length]}1a;color:${subjectColors[index % subjectColors.length]}" aria-hidden="true">${icons[index % icons.length]}</span><div class="subject-actions"><button class="small-action" data-action="edit-subject" data-id="${esc(subject.id)}" aria-label="Edit ${esc(subject.name)}">✎</button><button class="small-action delete" data-action="delete-subject" data-id="${esc(subject.id)}" aria-label="Delete ${esc(subject.name)}">×</button></div></div><h2 class="subject-name"><button class="text-link subject-open" data-action="open-subject" data-id="${esc(subject.id)}">${esc(subject.name)}</button></h2><span class="subject-code">${esc(subject.code)}</span><div class="subject-info"><span>♙ ${esc(subject.teacher)}</span><span>◷ ${esc(subject.schedule)}</span></div><div class="subject-card-bottom"><span class="attendance-number ${attendanceBelowTarget(attendance) ? "low-attendance" : ""}">Attendance ${attendance.percent}%</span><span>${progress.completed}/${progress.total} tasks</span></div><div class="progress-track"><div class="progress-fill" style="width:${progress.percent}%"></div></div></article>`;
  }
  function renderClasses() {
    if (selectedSubjectId) return renderSubjectDetail();
    return `${pageHeader("My classes", "Your subjects, schedules, and coursework in one place.", `<button class="button button-primary" data-action="new-subject">＋ Add a class</button>`)}
      <section class="class-grid">${data.subjects.length ? data.subjects.map(subjectCard).join("") : emptyState("No classes added", "Add your subjects to track class progress and attendance.")}</section>`;
  }
  function renderSubjectDetail() {
    const subject = subjectFor(selectedSubjectId);
    if (!subject) { selectedSubjectId = null; return renderClasses(); }
    const attended = subjectAttendance(subject.id);
    const tasks = data.tasks.filter(task => task.subjectId === subject.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const needed = classesToTarget(attended);
    const neededLabel = needed === null ? "No attendance recorded yet" : needed === Infinity ? "Target cannot be reached after an absence" : needed ? "Consecutive classes to reach target" : "At or above attendance target";
    return `${pageHeader("Subject details", "Manage this class and its coursework.", `<button class="button button-quiet" data-action="back-classes">← All classes</button><button class="button button-primary" data-action="new-task" data-subject-id="${esc(subject.id)}">＋ Add task</button>`)}
      <section class="panel"><div class="subject-detail-head"><span class="subject-color" aria-hidden="true">◈</span><div><h2>${esc(subject.name)}</h2><p>${esc(subject.code)} · ${esc(subject.teacher)} · ${esc(subject.schedule)}</p></div></div></section>
      <div class="attendance-cards"><div class="attendance-stat"><strong>${attended.percent}%</strong><small>Attendance · ${attended.attended}/${attended.total} classes</small></div><div class="attendance-stat"><strong>${taskProgress(subject.id).completed}/${taskProgress(subject.id).total}</strong><small>Tasks completed</small></div><div class="attendance-stat"><strong>${needed === null || needed === Infinity ? "—" : needed}</strong><small>${esc(neededLabel)}</small></div></div>
      <section class="panel"><div class="panel-heading"><div><h2>Tasks for ${esc(subject.name)}</h2><p>Changes here also update your global task list.</p></div></div><div class="task-list">${tasks.length ? tasks.map(taskCard).join("") : emptyState("No tasks for this subject", "Add coursework for this class to see it here.")}</div></section>`;
  }
  function renderAttendance() {
    const pct = overallAttendance();
    const target = Number(data.settings.attendanceTarget) || 75;
    const totalAttended = data.attendance.filter(record => record.status === "attended").length;
    const totalRecords = data.attendance.length;
    const rows = data.subjects.map(subject => {
      const stats = subjectAttendance(subject.id);
      const needed = classesToTarget(stats, target);
      const below = attendanceBelowTarget(stats, target);
      const neededLabel = needed === null ? "No records" : needed === Infinity ? "Not reachable" : needed ? `${needed} to target` : "On target";
      return `<div class="attendance-row"><strong>${esc(subject.name)}</strong><div class="progress-track"><div class="progress-fill" style="width:${stats.percent}%;background:${below ? "var(--red)" : ""}"></div></div><span class="${below ? "attendance-number low-attendance" : "attendance-number"}">${stats.percent}%</span><span>${stats.attended}/${stats.total} attended</span><span>${neededLabel}</span></div>`;
    }).join("");
    return `${pageHeader("Attendance", "Record each class and keep an eye on your attendance.", `<button class="button button-primary" data-action="record-attendance">＋ Record class</button>`)}
      <div class="attendance-cards"><div class="attendance-stat"><strong>${pct}%</strong><small>Overall attendance · target ${target}%</small></div><div class="attendance-stat"><strong>${totalAttended}</strong><small>Classes attended</small></div><div class="attendance-stat"><strong>${totalRecords - totalAttended}</strong><small>Classes absent</small></div></div>
      <section class="panel"><div class="panel-heading"><div><h2>Subject attendance</h2><p>Subjects below ${target}% are highlighted.</p></div></div><div class="attendance-row attendance-row-head"><span>Subject</span><span>Progress</span><span>Rate</span><span>Attended</span><span>To target</span></div>${rows || emptyState("No subjects", "Add a class before recording attendance.")}</section>
      <section class="panel setting-section" style="margin-top:15px"><div class="panel-heading"><div><h2>Record a class</h2><p>Choose a subject, date, and attendance status.</p></div></div><form id="attendance-form" class="form-grid"><label>Subject<select name="subjectId" required>${data.subjects.map(subject => `<option value="${esc(subject.id)}">${esc(subject.name)}</option>`).join("")}</select></label><label>Class date<input name="date" type="date" value="${isoDate(today)}" max="${isoDate(today)}" required></label><label>Attendance<select name="status"><option value="attended">Attended</option><option value="absent">Absent</option></select></label><div style="align-self:end"><button class="button button-primary" type="submit">Save attendance</button></div></form></section>`;
  }
  function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(year, month, 1 - firstDay.getDay());
    const dateCells = Array.from({ length: 42 }, (_, index) => {
      const date = addDays(start, index);
      const value = isoDate(date);
      const tasks = data.tasks.filter(task => task.dueDate === value);
      return `<button class="calendar-day ${date.getMonth() !== month ? "outside" : ""} ${value === isoDate(today) ? "today" : ""} ${value === selectedCalendarDate ? "selected" : ""}" data-action="select-date" data-date="${value}" aria-label="${esc(dateLabel(value, { weekday: "long", month: "long", day: "numeric" }))}${tasks.length ? `, ${tasks.length} tasks` : ""}"><span>${date.getDate()}</span>${tasks.length ? `<span class="calendar-dots">${tasks.slice(0, 3).map(task => `<i class="${task.completed ? "done-dot" : ""}"></i>`).join("")}</span>` : ""}</button>`;
    }).join("");
    const selectedTasks = data.tasks.filter(task => task.dueDate === selectedCalendarDate).sort((a, b) => a.title.localeCompare(b.title));
    return `${pageHeader("Calendar", "A clear view of your academic deadlines.")}
      <div class="calendar-layout"><section class="panel"><div class="calendar-head"><h2>${calendarDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2><div class="calendar-nav"><button class="icon-button" data-action="calendar-prev" aria-label="Previous month">‹</button><button class="icon-button" data-action="calendar-next" aria-label="Next month">›</button></div></div><div class="calendar-grid">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => `<div class="calendar-weekday">${day}</div>`).join("")}${dateCells}</div></section>
      <section class="panel selected-date-tasks"><div class="panel-heading"><div><h2>${esc(dateLabel(selectedCalendarDate, { weekday: "long", month: "long", day: "numeric" }))}</h2><p>${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"} due</p></div><button class="text-link" data-action="new-task">＋ Add</button></div><div class="task-list">${selectedTasks.length ? selectedTasks.map(taskCard).join("") : emptyState("No deadlines", "Enjoy a little breathing room on this date.")}</div></section></div>`;
  }
  function renderSettings() {
    return `${pageHeader("Settings", "Make StudyFlow work the way you do.")}
      <section class="panel setting-section"><div class="panel-heading"><div><h2>Profile</h2><p>Your name appears across your workspace.</p></div></div><form id="profile-form"><div class="settings-form-grid"><label>Full name<input name="name" maxlength="70" required value="${esc(data.profile.name)}"></label><label>Email address<input name="email" type="email" maxlength="120" value="${esc(data.profile.email)}" placeholder="you@example.com"></label></div><div class="modal-actions"><button class="button button-primary" type="submit">Save profile</button></div></form></section>
      <section class="panel setting-section"><div class="panel-heading"><div><h2>Preferences</h2><p>Personalize your planning experience.</p></div></div><div class="setting-row"><div><strong>Appearance</strong><p>Choose a light or dark workspace.</p></div><select id="settings-theme" aria-label="Choose theme"><option value="light" ${data.preferences.theme === "light" ? "selected" : ""}>Light</option><option value="dark" ${data.preferences.theme === "dark" ? "selected" : ""}>Dark</option></select></div><div class="setting-row"><div><strong>Attendance target</strong><p>We'll highlight classes that fall below this percentage.</p></div><input id="attendance-target" type="number" min="1" max="100" step="1" value="${esc(data.settings.attendanceTarget)}" aria-label="Attendance target percentage"></div></section>
      <section class="panel setting-section"><div class="panel-heading"><div><h2>Demo data</h2><p>Start over with the original sample workspace.</p></div></div><button class="button button-danger" data-action="reset-data">Reset demo data</button></section>`;
  }
  const viewTitles = { dashboard: "Dashboard", tasks: "My tasks", classes: "My classes", attendance: "Attendance", calendar: "Calendar", completed: "Completed", settings: "Settings" };
  function render() {
    setTheme();
    updateProfileBits();
    document.querySelector("#today-label").textContent = dateLabel(isoDate(today), { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    document.querySelector("#breadcrumb-current").textContent = selectedSubjectId ? "Subject details" : viewTitles[currentView];
    document.querySelectorAll(".nav-item[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === currentView));
    const renderers = { dashboard: renderDashboard, tasks: () => renderTasks(false), classes: renderClasses, attendance: renderAttendance, calendar: renderCalendar, completed: () => renderTasks(true), settings: renderSettings };
    page.innerHTML = renderers[currentView]();
    page.focus({ preventScroll: true });
  }
  function go(view) {
    if (!viewTitles[view]) return;
    currentView = view;
    if (view !== "classes") selectedSubjectId = null;
    render();
    document.querySelector("#sidebar").classList.remove("open");
    document.querySelector("#sidebar-scrim").classList.remove("open");
    document.querySelector("#menu-toggle").setAttribute("aria-expanded", "false");
  }
  function openTask(task = null, presetSubject = "") {
    const form = document.querySelector("#task-form");
    form.reset();
    form.elements.id.value = task?.id ?? "";
    form.elements.title.value = task?.title ?? "";
    form.elements.description.value = task?.description ?? "";
    form.elements.dueDate.value = task?.dueDate ?? isoDate(today);
    form.elements.priority.value = task?.priority ?? "Medium";
    form.elements.workType.value = task?.workType ?? "Assignment";
    form.elements.subjectId.innerHTML = data.subjects.map(subject => `<option value="${esc(subject.id)}">${esc(subject.name)}</option>`).join("");
    if (task?.subjectId || presetSubject) form.elements.subjectId.value = task?.subjectId ?? presetSubject;
    document.querySelector("#task-modal-title").textContent = task ? "Edit task" : "Add a task";
    taskModal.showModal();
    form.elements.title.focus();
  }
  function openSubject(subject = null) {
    const form = document.querySelector("#subject-form");
    form.reset();
    form.elements.id.value = subject?.id ?? "";
    ["name", "code", "teacher", "schedule"].forEach(key => { form.elements[key].value = subject?.[key] ?? ""; });
    document.querySelector("#subject-modal-title").textContent = subject ? "Edit subject" : "Add a subject";
    subjectModal.showModal();
    form.elements.name.focus();
  }
  function deleteTask(id) {
    const task = data.tasks.find(item => item.id === id);
    if (!task || !confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    data.tasks = data.tasks.filter(item => item.id !== id);
    persist(); render(); notify("Task deleted.");
  }
  function deleteSubject(id) {
    const subject = subjectFor(id);
    if (!subject) return;
    const count = data.tasks.filter(task => task.subjectId === id).length;
    const prompt = count ? `Delete "${subject.name}" and its ${count} task${count === 1 ? "" : "s"}? Attendance records for this subject will also be removed.` : `Delete "${subject.name}"?`;
    if (!confirm(prompt)) return;
    data.subjects = data.subjects.filter(item => item.id !== id);
    data.tasks = data.tasks.filter(task => task.subjectId !== id);
    data.attendance = data.attendance.filter(record => record.subjectId !== id);
    if (selectedSubjectId === id) selectedSubjectId = null;
    persist(); render(); notify("Subject deleted.");
  }
  function toggleTask(id) {
    const task = data.tasks.find(item => item.id === id);
    if (!task) return;
    task.completed = !task.completed;
    persist(); render(); notify(task.completed ? "Task completed. Nice work!" : "Task reopened.");
  }
  function recordAttendance(subjectId, date, status) {
    if (!subjectFor(subjectId) || !date || !["attended", "absent"].includes(status)) { notify("Please choose valid attendance details."); return; }
    const existing = data.attendance.find(item => item.subjectId === subjectId && item.date === date);
    if (existing) existing.status = status;
    else data.attendance.push({ id: uid(), subjectId, date, status });
    persist(); render(); notify(existing ? "Attendance record updated." : "Attendance recorded.");
  }
  function applyTaskFilters() {
    const search = (document.querySelector("#task-search")?.value ?? "").trim().toLowerCase();
    const status = document.querySelector("#task-status")?.value ?? "all";
    const subject = document.querySelector("#task-subject")?.value ?? "all";
    const priority = document.querySelector("#task-priority")?.value ?? "all";
    const sort = document.querySelector("#task-sort")?.value ?? "date-asc";
    let tasks = data.tasks.filter(task => {
      const matchesSearch = !search || `${task.title} ${task.description} ${subjectFor(task.subjectId)?.name ?? ""}`.toLowerCase().includes(search);
      const matchesStatus = status === "all" || (status === "pending" && !task.completed) || (status === "completed" && task.completed) || (status === "overdue" && isOverdue(task));
      return matchesSearch && matchesStatus && (subject === "all" || task.subjectId === subject) && (priority === "all" || task.priority === priority);
    });
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    tasks.sort((a, b) => sort === "date-desc" ? b.dueDate.localeCompare(a.dueDate) : sort === "priority" ? priorityOrder[a.priority] - priorityOrder[b.priority] : sort === "title" ? a.title.localeCompare(b.title) : a.dueDate.localeCompare(b.dueDate));
    document.querySelector("#task-list").innerHTML = tasks.length ? tasks.map(taskCard).join("") : emptyState("No matching tasks", "Try changing or clearing your filters.");
  }

  page.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.view) { go(button.dataset.view); return; }
    const { action, id } = button.dataset;
    if (action === "new-task") openTask(null, button.dataset.subjectId ?? (selectedSubjectId || ""));
    else if (action === "edit-task") openTask(data.tasks.find(task => task.id === id));
    else if (action === "delete-task") deleteTask(id);
    else if (action === "toggle-task") toggleTask(id);
    else if (action === "new-subject") openSubject();
    else if (action === "edit-subject") openSubject(subjectFor(id));
    else if (action === "delete-subject") deleteSubject(id);
    else if (action === "open-subject") { selectedSubjectId = id; currentView = "classes"; render(); }
    else if (action === "back-classes") { selectedSubjectId = null; render(); }
    else if (action === "record-attendance") document.querySelector("#attendance-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    else if (action === "select-date") { selectedCalendarDate = button.dataset.date; render(); }
    else if (action === "calendar-prev") { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); render(); }
    else if (action === "calendar-next") { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); render(); }
    else if (action === "reset-data" && confirm("Reset all tasks, classes, attendance, and settings to demo data? This cannot be undone.")) {
      data = demoData(); selectedSubjectId = null; persist(); render(); notify("Demo data restored.");
    }
  });
  document.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton && !page.contains(viewButton)) go(viewButton.dataset.view);
    if (event.target.closest("[data-close-modal]")) event.target.closest("dialog")?.close();
  });
  document.querySelectorAll(".nav-item[data-view]").forEach(button => button.addEventListener("click", () => go(button.dataset.view)));
  document.querySelector("#menu-toggle").addEventListener("click", () => {
    const sidebar = document.querySelector("#sidebar");
    const open = sidebar.classList.toggle("open");
    document.querySelector("#sidebar-scrim").classList.toggle("open", open);
    document.querySelector("#menu-toggle").setAttribute("aria-expanded", String(open));
  });
  document.querySelector("#sidebar-scrim").addEventListener("click", () => {
    document.querySelector("#sidebar").classList.remove("open");
    document.querySelector("#sidebar-scrim").classList.remove("open");
    document.querySelector("#menu-toggle").setAttribute("aria-expanded", "false");
  });
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    data.preferences.theme = data.preferences.theme === "dark" ? "light" : "dark";
    persist(); render();
  });
  document.querySelector("#task-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = String(values.get("title") ?? "").trim();
    const subjectId = String(values.get("subjectId") ?? "");
    if (!title || title.length > 100 || !subjectFor(subjectId)) { notify("Enter a task title and choose a valid subject."); return; }
    const record = {
      id: String(values.get("id") || uid()), title, description: String(values.get("description") ?? "").trim(),
      subjectId, dueDate: String(values.get("dueDate") ?? ""), priority: String(values.get("priority")),
      workType: String(values.get("workType")), completed: data.tasks.find(task => task.id === values.get("id"))?.completed ?? false
    };
    if (!record.dueDate || !["Low", "Medium", "High"].includes(record.priority) || !["Assignment", "Homework", "Lab", "Project", "Quiz", "Revision", "Other"].includes(record.workType)) { notify("Check the task details and try again."); return; }
    const index = data.tasks.findIndex(task => task.id === record.id);
    if (index >= 0) data.tasks[index] = record; else data.tasks.push(record);
    persist(); taskModal.close(); render(); notify(index >= 0 ? "Task updated." : "Task added.");
  });
  document.querySelector("#subject-form").addEventListener("submit", event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const record = Object.fromEntries(["name", "code", "teacher", "schedule"].map(key => [key, String(values.get(key) ?? "").trim()]));
    if (Object.values(record).some(value => !value) || Object.values(record).some(value => value.length > 70)) { notify("Complete each subject field using the allowed length."); return; }
    const id = String(values.get("id") || uid());
    const existing = data.subjects.find(subject => subject.id === id);
    if (existing) Object.assign(existing, record);
    else data.subjects.push({ id, ...record });
    persist(); subjectModal.close(); render(); notify(existing ? "Subject updated." : "Subject added.");
  });
  page.addEventListener("input", event => { if (event.target.matches("#task-search")) applyTaskFilters(); });
  page.addEventListener("change", event => {
    if (event.target.matches("#task-status, #task-subject, #task-priority, #task-sort")) applyTaskFilters();
    if (event.target.matches("#settings-theme")) { data.preferences.theme = event.target.value; persist(); render(); }
    if (event.target.matches("#attendance-target")) {
      const value = Number(event.target.value);
      if (Number.isInteger(value) && value >= 1 && value <= 100) { data.settings.attendanceTarget = value; persist(); render(); notify("Attendance target updated."); }
      else notify("Attendance target must be from 1 to 100.");
    }
  });
  page.addEventListener("submit", event => {
    if (event.target.id === "attendance-form") {
      event.preventDefault();
      const values = new FormData(event.target);
      recordAttendance(String(values.get("subjectId")), String(values.get("date")), String(values.get("status")));
    }
    if (event.target.id === "profile-form") {
      event.preventDefault();
      const values = new FormData(event.target);
      const name = String(values.get("name") ?? "").trim();
      const email = String(values.get("email") ?? "").trim();
      if (!name || name.length > 70 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) { notify("Enter a valid name and email address."); return; }
      data.profile = { name, email }; persist(); render(); notify("Profile saved.");
    }
  });
  taskModal.addEventListener("click", event => { if (event.target === taskModal) taskModal.close(); });
  subjectModal.addEventListener("click", event => { if (event.target === subjectModal) subjectModal.close(); });
  persist();
  render();
})();
