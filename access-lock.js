function createAccessLock() {
  const lock = document.createElement("div");
  lock.className = "access-lock";
  lock.innerHTML = `
    <form class="access-lock-panel">
      <p class="eyebrow">Private app</p>
      <h1>Private app</h1>
      <p class="access-lock-message">Sign in with your private account to continue.</p>
      <label class="field">
        <span>Email</span>
        <input name="email" type="email" autocomplete="email" required />
      </label>
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
  const lock = createAccessLock();
  const { data } = await daymarkSupabase.auth.getSession();
  if (data.session) {
    lock.remove();
    return data.session.user;
  }

  const form = lock.querySelector("form");
  const error = lock.querySelector(".access-lock-error");
  const finish = (user) => {
    lock.remove();
    return user;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const formData = new FormData(form);
    const { error: signInError } = await daymarkSupabase.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password")
    });
    if (signInError) error.textContent = signInError.message;
    else finish((await daymarkSupabase.auth.getUser()).data.user);
  });

  form.elements.email.focus();
}

window.daymarkAuthReady = startAccessLock();
