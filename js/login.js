const params = new URLSearchParams(location.search);

// Tab buttons are plain links to the other page (works before Firebase finishes loading)
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

// Attached immediately so a fast click can never reload the page with the password in the URL
$("#log").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await ready;
  } catch {
    return ($("#lerr").textContent = "Cannot reach the server. Please try again.");
  }
  const session = await Auth.login($("#lu").value, $("#lp").value);
  if (!session) return ($("#lerr").textContent = "Wrong username or password.");
  goHome(session);
};

publicReady.then(renderNav).catch(() => {});
ready.then(renderNav).catch(() => {});