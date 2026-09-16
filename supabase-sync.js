const daymarkSync = (() => {
  const client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  let authPromise;

  function showAuthPrompt() {
    if (authPromise) return authPromise;
    authPromise = new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "access-lock cloud-auth-lock";
      overlay.innerHTML = `
        <form class="access-lock-panel cloud-auth-panel">
          <p class="eyebrow">Sync your devices</p>
          <h1>Sign in</h1>
          <p class="access-lock-message">Use the same email and password on your phone and PC to share your data.</p>
          <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required /></label>
          <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" minlength="6" required /></label>
          <p class="access-lock-error" role="alert"></p>
          <button class="primary-button" type="submit">Sign in</button>
          <button class="text-button cloud-signup" type="button">Create account</button>
          <button class="text-button cloud-offline" type="button">Continue offline</button>
        </form>`;
      document.body.append(overlay);
      const form = overlay.querySelector("form");
      const error = overlay.querySelector(".access-lock-error");
      const finish = (user) => {
        overlay.remove();
        authPromise = null;
        resolve(user);
      };
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        error.textContent = "";
        const data = new FormData(form);
        const { data: result, error: signInError } = await client.auth.signInWithPassword({
          email: data.get("email"),
          password: data.get("password")
        });
        if (signInError) {
          error.textContent = signInError.message;
          return;
        }
        finish(result.user);
      });
      overlay.querySelector(".cloud-signup").addEventListener("click", async () => {
        error.textContent = "";
        const data = new FormData(form);
        if (!data.get("email") || !data.get("password")) {
          error.textContent = "Enter an email and password first.";
          return;
        }
        const { data: result, error: signUpError } = await client.auth.signUp({
          email: data.get("email"),
          password: data.get("password"),
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (signUpError) {
          error.textContent = signUpError.message;
          return;
        }
        if (result.user && result.session) finish(result.user);
        else error.textContent = "Check your email to confirm your account, then sign in.";
      });
      overlay.querySelector(".cloud-offline").addEventListener("click", () => finish(null));
      form.elements.email.focus();
    });
    return authPromise;
  }

  async function user() {
    if (window.daymarkAuthReady) await window.daymarkAuthReady;
    const { data } = await client.auth.getUser();
    return data.user || null;
  }

  async function loadTransactions(localTransactions) {
    const currentUser = await user();
    if (!currentUser) return localTransactions;
    const { data, error } = await client.from("transactions").select("id,type,description,amount,date,category").eq("user_id", currentUser.id);
    if (error) throw error;
    if (!data.length && localTransactions.length) {
      await saveTransactions(localTransactions);
      return localTransactions;
    }
    return data.map((transaction) => ({ ...transaction, amount: Number(transaction.amount) }));
  }

  async function saveTransactions(items) {
    const currentUser = await user();
    if (!currentUser) return;
    const { error: deleteError } = await client.from("transactions").delete().eq("user_id", currentUser.id);
    if (deleteError) throw deleteError;
    if (!items.length) return;
    const rows = items.map((item) => ({ ...item, user_id: currentUser.id }));
    const { error } = await client.from("transactions").insert(rows);
    if (error) throw error;
  }

  async function loadRoutine(localData) {
    const currentUser = await user();
    if (!currentUser) return localData;
    const { data, error } = await client.from("routine_data").select("tasks,later_activities").eq("user_id", currentUser.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      await saveRoutine(localData.tasks, localData.laterActivities);
      return localData;
    }
    return { tasks: data.tasks || [], laterActivities: data.later_activities || [] };
  }

  async function saveRoutine(tasks, laterActivities) {
    const currentUser = await user();
    if (!currentUser) return;
    const { error } = await client.from("routine_data").upsert({
      user_id: currentUser.id,
      tasks,
      later_activities: laterActivities,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  }

  return { loadTransactions, saveTransactions, loadRoutine, saveRoutine };
})();
