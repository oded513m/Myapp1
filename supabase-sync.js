const daymarkSync = (() => {
  const client = window.daymarkSupabase;

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
