const STORAGE_KEY = "daymark-transactions";
const currency = new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const entryDialog = document.querySelector("#entry-dialog");
const entryForm = document.querySelector("#entry-form");
const transactionList = document.querySelector("#transaction-list");
const incomeList = document.querySelector("#income-list");
const expenseList = document.querySelector("#expense-list");
const transactionFilter = document.querySelector("#transaction-filter");
const exportButton = document.querySelector("#export-transactions");
const transactions = loadTransactions();

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  daymarkSync.saveTransactions(transactions).catch(() => {});
}

function formatAmount(amount) {
  return currency.format(amount);
}

function renderSummary() {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const balance = income - expenses;

  document.querySelector("#income").textContent = formatAmount(income);
  document.querySelector("#expenses").textContent = formatAmount(expenses);
  document.querySelector("#balance").textContent = formatAmount(balance);
  document.querySelector(".balance-summary").classList.toggle("balance-negative", balance < 0);
  document.querySelector("#balance-detail").textContent = transactions.length
    ? `${transactions.length} transaction${transactions.length === 1 ? "" : "s"} recorded`
    : "Add your first transaction";
}

function renderTransactionList(listElement, visibleTransactions, emptyTitle, emptyMessage) {
  if (!visibleTransactions.length) {
    listElement.innerHTML = `
      <div class="empty-state">
        <strong>${emptyTitle}</strong>
        <p>${emptyMessage}</p>
      </div>`;
    return;
  }

  listElement.innerHTML = visibleTransactions.map((transaction) => `
    <article class="transaction-row">
      <span class="transaction-icon ${transaction.type}" aria-hidden="true">${transaction.type === "income" ? "↑" : "↓"}</span>
      <div>
        <p class="transaction-description">${escapeHtml(transaction.description)}</p>
        <p class="transaction-meta">${escapeHtml(transaction.category)} · ${dateFormatter.format(new Date(`${transaction.date}T12:00:00`))}</p>
      </div>
      <p class="transaction-amount ${transaction.type}">${transaction.type === "income" ? "+" : "-"}${formatAmount(transaction.amount)}</p>
      <button class="delete-transaction" type="button" data-id="${transaction.id}" aria-label="Delete ${escapeHtml(transaction.description)}">×</button>
    </article>`).join("");
}

function sortTransactions(list) {
  return list.slice().sort((first, second) => new Date(second.date) - new Date(first.date));
}

function renderTransactions() {
  const incomeTransactions = sortTransactions(transactions.filter((transaction) => transaction.type === "income"));
  const expenseTransactions = sortTransactions(transactions.filter((transaction) => transaction.type === "expense"));
  const filter = transactionFilter.value;
  const activityTransactions = sortTransactions(
    transactions.filter((transaction) => filter === "all" || transaction.type === filter)
  );

  document.querySelector("#income-count").textContent = `${incomeTransactions.length} ${incomeTransactions.length === 1 ? "entry" : "entries"}`;
  document.querySelector("#expense-count").textContent = `${expenseTransactions.length} ${expenseTransactions.length === 1 ? "entry" : "entries"}`;
  renderTransactionList(incomeList, incomeTransactions, "No income yet", "Add money received to see it here.");
  renderTransactionList(expenseList, expenseTransactions, "No expenses yet", "Add spending to see it here.");
  renderTransactionList(
    transactionList,
    activityTransactions,
    transactions.length ? "Nothing in this view yet" : "Your activity will appear here",
    transactions.length ? "Try another filter." : "Add an income or expense to get started."
  );
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

function escapeRtf(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\r?\n/g, "\\line ")
    .replace(/[^\x00-\x7F]/g, (character) => `\\u${character.charCodeAt(0)}?`);
}

function exportTransactions() {
  if (!transactions.length) {
    exportButton.textContent = "No transactions yet";
    window.setTimeout(() => {
      exportButton.textContent = "↓ Export Word";
    }, 1800);
    return;
  }

  const border = "\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10";
  const cell = (value, width, bold = false) => `${border}\\cellx${width}${bold ? "\\b" : ""} ${escapeRtf(value)}${bold ? "\\b0" : ""}\\cell`;
  const table = (title, list) => {
    const rows = sortTransactions(list).map((transaction) => `
      \\trowd\\trgaph90 ${cell(transaction.date, 1800)}${cell(transaction.description, 5400)}${cell(transaction.category, 7200)}${cell(`${transaction.type === "income" ? "+" : "-"}${formatAmount(transaction.amount)}`, 9000)}\\row`);
    const header = `\\trowd\\trgaph90 \\clcbpat2 ${cell("Date", 1800, true)}\\clcbpat2 ${cell("Description", 5400, true)}\\clcbpat2 ${cell("Category", 7200, true)}\\clcbpat2 ${cell("Amount", 9000, true)}\\row`;
    return `\\pard\\sb240\\sa100\\b\\fs28 ${escapeRtf(title)}\\b0\\fs22\\par${header}${rows.join("")}`;
  };
  const incomeTransactions = transactions.filter((transaction) => transaction.type === "income");
  const expenseTransactions = transactions.filter((transaction) => transaction.type === "expense");
  const documentContent = `{\\rtf1\\ansi\\deff0
    {\\fonttbl{\\f0 Arial;}}
    {\\colortbl;\\red23\\green34\\blue31;\\red185\\green201\\blue178;\\red233\\green178\\blue143;}
    \\viewkind4\\uc1\\f0\\fs22
    \\pard\\qc\\sb160\\sa100\\b\\cf1\\fs36 My app Money Tracker\\b0\\fs22\\cf0\\par
    \\pard\\qc\\sa220 Exported on ${escapeRtf(new Date().toLocaleDateString("en-US"))}\\par
    ${table("Income", incomeTransactions)}
    ${table("Expenses", expenseTransactions)}
    ${table("Activity", transactions)}
    }`;
  const download = document.createElement("a");
  download.href = URL.createObjectURL(new Blob([documentContent], { type: "application/rtf" }));
  download.download = `daymark-money-tracker-${new Date().toISOString().slice(0, 10)}.rtf`;
  download.click();
  URL.revokeObjectURL(download.href);
}

function render() {
  renderSummary();
  renderTransactions();
}

document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector("#open-entry").addEventListener("click", () => {
  entryForm.reset();
  entryForm.elements.date.value = new Date().toISOString().slice(0, 10);
  entryDialog.showModal();
  entryForm.elements.description.focus();
});
document.querySelector("#close-entry").addEventListener("click", () => entryDialog.close());
entryDialog.addEventListener("click", (event) => {
  if (event.target === entryDialog) entryDialog.close();
});
entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(entryForm);
  transactions.push({
    id: crypto.randomUUID(),
    type: formData.get("type"),
    description: formData.get("description").trim(),
    amount: Number(formData.get("amount")),
    date: formData.get("date"),
    category: formData.get("category")
  });
  saveTransactions();
  transactionFilter.value = "all";
  render();
  entryDialog.close();
});
transactionFilter.addEventListener("change", renderTransactions);
exportButton.addEventListener("click", exportTransactions);
function deleteTransaction(event) {
  const deleteButton = event.target.closest("[data-id]");
  if (!deleteButton) return;
  const transactionIndex = transactions.findIndex((transaction) => transaction.id === deleteButton.dataset.id);
  if (transactionIndex >= 0) {
    transactions.splice(transactionIndex, 1);
    saveTransactions();
    render();
  }
}

transactionList.addEventListener("click", deleteTransaction);
incomeList.addEventListener("click", deleteTransaction);
expenseList.addEventListener("click", deleteTransaction);

render();
daymarkSync.loadTransactions(transactions).then((cloudTransactions) => {
  transactions.splice(0, transactions.length, ...cloudTransactions);
  saveTransactions();
  render();
}).catch(() => {});
