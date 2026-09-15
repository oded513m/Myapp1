const ACCESS_STORAGE_KEY = "myapp-access-unlocked";
const LEGACY_ACCESS_SESSION_KEY = "myapp-access-unlocked";

async function hashValue(value) {
  const data = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createAccessLock() {
  const lock = document.createElement("div");
  lock.className = "access-lock";
  lock.innerHTML = `
    <form class="access-lock-panel">
      <p class="eyebrow">Private app</p>
      <h1>Unlock My app</h1>
      <p class="access-lock-message">Enter your password to continue.</p>
      <label class="field">
        <span>Password</span>
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <p class="access-lock-error" role="alert"></p>
      <button class="primary-button" type="submit">Log in</button>
    </form>`;
  document.body.append(lock);
  return lock;
}

async function startAccessLock() {
  if (localStorage.getItem(ACCESS_STORAGE_KEY) === "true") return;

  // Keep users who already unlocked this browser signed in after the storage change.
  if (sessionStorage.getItem(LEGACY_ACCESS_SESSION_KEY) === "true") {
    localStorage.setItem(ACCESS_STORAGE_KEY, "true");
    return;
  }

  const lock = createAccessLock();
  const form = lock.querySelector("form");
  const passwordInput = form.elements.password;
  const error = lock.querySelector(".access-lock-error");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";

    const passwordHash = await hashValue(passwordInput.value);

    if (passwordHash !== ACCESS_CREDENTIALS.passwordHash) {
      error.textContent = "Incorrect password.";
      passwordInput.select();
      return;
    }

    localStorage.setItem(ACCESS_STORAGE_KEY, "true");
    lock.remove();
  });

  passwordInput.focus();
}

startAccessLock();
