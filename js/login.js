ready.then(() => {
  renderNav();
  const params = new URLSearchParams(location.search);

  function showTab(name) {
    $$(".pane").forEach((p) => (p.hidden = p.id !== name));
    $$(".tabs button").forEach((b) =>
      b.classList.toggle("on", b.dataset.t === name),
    );
  }
  $$(".tabs button").forEach((b) => (b.onclick = () => showTab(b.dataset.t)));
  showTab(params.get("tab") === "register" ? "reg" : "log");

  function goHome(session) {
    if (session.role === "admin") return (location.href = "admin.html");
    const next = params.get("next");
    location.href = unseenMoves(session)
      ? "account.html"
      : next && next !== "admin.html"
        ? next
        : "index.html";
  }

  $("#log").onsubmit = async (e) => {
    e.preventDefault();
    const session = await Auth.login($("#lu").value, $("#lp").value);
    if (!session)
      return ($("#lerr").textContent = "Wrong username or password.");
    goHome(session);
  };

  $("#reg").onsubmit = async (e) => {
    e.preventDefault();
    const f = {
      name: $("#rn").value,
      email: $("#re").value,
      phone: $("#rph").value,
      user: $("#ru").value,
      pass: $("#rp").value,
      confirm: $("#rc").value,
    };
    const error = await Auth.register(f);
    if (error) return ($("#rerr").textContent = error);
    goHome(await Auth.login(f.user, f.pass));
  };
});
