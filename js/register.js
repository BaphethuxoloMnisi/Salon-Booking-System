const params = new URLSearchParams(location.search);

$$(".tabs button[data-go]").forEach(
  (b) =>
    (b.onclick = () =>
      (location.href = b.dataset.go + (params.get("next") ? "?next=" + encodeURIComponent(params.get("next")) : ""))),
);

function goHome(session) {
  if (session.role === "admin") return (location.href = "admin.html");
  const next = params.get("next");
  location.href = unseenMoves(session)
    ? "account.html"
    : next && next !== "admin.html"
      ? next
      : "index.html";
}

$("#reg").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await ready;
  } catch {
    return ($("#rerr").textContent = "Cannot reach the server. Please try again.");
  }
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

publicReady.then(renderNav).catch(() => {});
ready.then(renderNav).catch(() => {});