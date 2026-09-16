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
      <button class="text-button create-account" type="button">Create account</button>
    </form>`;
  document.body.append(lock);
  return lock;
}

async function startAccessLock() {
  const lock = createAccessLock();
  const { data } = await supabase.auth.getSession();
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
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password")
    });
    if (signInError) error.textContent = signInError.message;
    else finish((await supabase.auth.getUser()).data.user);
  });

  lock.querySelector(".create-account").addEventListener("click", async () => {
    error.textContent = "";
    const formData = new FormData(form);
    const { data: result, error: signUpError } = await supabase.auth.signUp({
      email: formData.get("email"),
      password: formData.get("password"),
      options: { emailRedirectTo: window.location.origin }
    });
    if (signUpError) error.textContent = signUpError.message;
    else if (result.session) finish(result.user);
    else error.textContent = "Check your email to confirm your account, then log in.";
  });

  form.elements.email.focus();
}

window.daymarkAuthReady = startAccessLock();
