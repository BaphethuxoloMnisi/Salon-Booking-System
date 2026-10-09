ready.then(() => {
  const me = Auth.require("customer");
  renderNav();

  function update(id, change) {
    const all = DB.get("bookings", []);
    change(all.find((b) => b.id === id));
    save("bookings", all);
    render();
    renderNav();
  }

  function render() {
    const mine = DB.get("bookings", [])
      .filter((b) => b.user === me.user)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    $("#list").innerHTML =
      mine
        .map((b) => {
          const m = b.moved,
            open = b.status !== "Cancelled" && b.status !== "Completed";
          const note = m
            ? `<div class="notice ${m.seen ? "old" : ""}"><span>The salon rescheduled this appointment from <b>${m.fromDate} at ${m.fromTime}</b> to <b>${b.date} at ${b.time}</b>.</span>${m.seen ? "" : `<button class="btn sm" data-seen="${b.id}">Got it</button>`}</div>`
            : "";
          return `<article class="booking">${note}<div class="top"><h3>${esc(b.service)}</h3><span class="badge ${b.status}">${b.status}</span></div>
      <p>${b.date} at ${b.time} · ${money(b.price)} · Ref ${b.ref}</p>
      <div class="acts"><button class="btn sm" data-r="${b.id}">Download receipt</button>${open ? `<button class="btn sm del" data-c="${b.id}">Cancel booking</button>` : ""}</div></article>`;
        })
        .join("") ||
      '<p class="empty">No bookings yet. Book your first visit below.</p>';
    $$("[data-seen]").forEach(
      (e) =>
        (e.onclick = () =>
          update(e.dataset.seen, (b) => (b.moved.seen = true))),
    );
    $$("[data-r]").forEach(
      (e) =>
        (e.onclick = () =>
          downloadReceipt(mine.find((b) => b.id === e.dataset.r))),
    );
    $$("[data-c]").forEach(
      (e) =>
        (e.onclick = () =>
          confirm("Cancel this booking?") &&
          update(e.dataset.c, (b) => (b.status = "Cancelled"))),
    );
  }
  render();

  onLive(() => {
    render();
    renderNav();
  });
});
