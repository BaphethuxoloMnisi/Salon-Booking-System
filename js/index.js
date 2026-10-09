ready.then(() => {
  renderNav();
  const S = DB.get("settings"),
    SV = DB.get("services", []),
    me = Auth.me();
  const TIMES = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
  ];
  let sel = "",
    last;

  document.title = S.name;
  $("#h1").textContent = S.name;
  $("#tag").textContent = S.tagline;
  $("#foot").textContent = "© " + new Date().getFullYear() + " " + S.name;
  $("#hero").innerHTML = IMG(S.hero, "Salon");
  $("#aboutImg").innerHTML = IMG(
    U("1521590832167-7bcbfaa6381f"),
    "Salon interior",
  );
  $("#svcs").innerHTML =
    SV.map(
      (s) =>
        `<article class="svc"><div class="ph">${IMG(s.img, s.name)}</div><h3>${esc(s.name)}</h3><p class="meta">${money(s.price)} · ${s.mins} min</p><p>${esc(s.desc)}</p></article>`,
    ).join("") || '<p class="empty">No services yet.</p>';
  $("#gal").innerHTML = DB.get("gallery", [])
    .map((g) => IMG(g.img, "Salon photo"))
    .join("");
  $("#svc").innerHTML = SV.map(
    (s) =>
      `<option value="${s.id}">${esc(s.name)} — ${money(s.price)}</option>`,
  ).join("");

  // Booking needs a customer account
  const customer = me && me.role === "customer";
  $("#form").hidden = !customer;
  $("#gate").hidden = customer;
  $("#gateMsg").textContent = me
    ? "Admin accounts cannot book. Log in with a customer account."
    : "Log in or create an account to book an appointment.";
  if (customer) {
    $("#who").textContent = "Booking as @" + me.user;
    $("#name").value = me.name;
    $("#email").value = me.email;
    $("#phone").value = me.phone;
  }

  const d = $("#date");
  d.min = today();
  // Calendar: days that are past, closed by the admin, or fully booked are disabled.
  const view = new Date();
  view.setDate(1);
  function dayInfo(iso) {
    const S = DB.get("settings"),
      max = S.maxPerDay ?? 2,
      open = S.openDays ?? [1, 2, 3, 4, 5, 6];
    if (iso < today()) return "past";
    if (
      !open.includes(new Date(iso + "T12:00").getDay()) ||
      (S.closed || {})[iso]
    )
      return "closed";
    const booked = Object.keys(DB.get("slots", {})).filter((k) =>
      k.startsWith(iso + "_"),
    ).length;
    return booked >= max ? "full" : "";
  }
  function drawCal() {
    const y = view.getFullYear(),
      m = view.getMonth();
    let cells = "<span></span>".repeat(new Date(y, m, 1).getDay());
    for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
        why = dayInfo(iso);
      const tip =
        why === "full"
          ? "Fully booked"
          : why === "closed"
            ? "Not available"
            : "";
      cells += `<button type="button" class="day ${why} ${iso === d.value ? "on" : ""}" data-d="${iso}" title="${tip}" ${why ? "disabled" : ""}>${i}</button>`;
    }
    $("#cal").innerHTML =
      `<div class="calhead"><button type="button" id="prev" aria-label="Previous month">‹</button><b>${view.toLocaleString("en", { month: "long", year: "numeric" })}</b><button type="button" id="next" aria-label="Next month">›</button></div>
      <div class="calgrid">${["S", "M", "T", "W", "T", "F", "S"].map((x) => `<i>${x}</i>`).join("")}${cells}</div>
      <p class="legend"><span class="sw full"></span>Fully booked <span class="sw closed"></span>Not available</p>`;
    $("#prev").onclick = () => {
      view.setMonth(view.getMonth() - 1);
      drawCal();
    };
    $("#next").onclick = () => {
      view.setMonth(view.getMonth() + 1);
      drawCal();
    };
    $$(".day").forEach(
      (b) =>
        (b.onclick = () => {
          d.value = b.dataset.d;
          slots();
          drawCal();
        }),
    );
  }

  function slots() {
    const taken = Object.keys(DB.get("slots", {}))
      .filter((k) => k.startsWith(d.value + "_"))
      .map((k) => k.slice(-4, -2) + ":" + k.slice(-2));
    const hour = new Date().getHours(),
      isToday = d.value === today();
    sel = "";
    $("#slots").innerHTML = TIMES.map(
      (t) =>
        `<button type="button" class="slot" ${!d.value || taken.includes(t) || (isToday && +t.slice(0, 2) <= hour) ? "disabled" : ""}>${t}</button>`,
    ).join("");
    $$(".slot").forEach(
      (b) =>
        (b.onclick = () => {
          $$(".slot").forEach((x) => x.classList.remove("on"));
          b.classList.add("on");
          sel = b.textContent;
        }),
    );
  }
  d.onchange = slots;
  drawCal();
  slots();

  $("#go").onclick = async () => {
    const v = (k) => $("#" + k).value.trim(),
      e = $("#err");
    if (!v("name") || !/\S+@\S+\.\S+/.test(v("email")) || v("phone").length < 7)
      return (e.textContent =
        "Enter your name, a valid email and a phone number.");
    if (!d.value || d.value < today())
      return (e.textContent = "Choose a date from today onward.");
    if (!sel) return (e.textContent = "Choose an available time.");
    const s = SV.find((x) => x.id === v("svc")),
      all = DB.get("bookings", []);
    if (!s) return (e.textContent = "Choose a service.");
    if (
      all.some(
        (b) => b.date === d.value && b.time === sel && b.status !== "Cancelled",
      )
    ) {
      slots();
      return (e.textContent =
        "Sorry, that day or time was just taken. Pick another.");
    }
    e.textContent = "";
    last = {
      id: uid(),
      ref: "BK" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      user: me.user,
      uid: me.uid,
      name: v("name"),
      email: v("email"),
      phone: v("phone"),
      service: s.name,
      price: s.price,
      mins: s.mins,
      date: d.value,
      time: sel,
      notes: v("notes"),
      status: "Confirmed",
      created: Date.now(),
    };
    if (dayInfo(d.value))
      return (e.textContent = "That day is not available. Pick another date.");
    if (!(await DB.claim(last.date, last.time, last.uid + "|" + last.id))) {
      slots();
      return (e.textContent =
        "Sorry, that day or time was just taken. Pick another.");
    }
    all.push(last);
    if (!save("bookings", all)) return;
    $("#rc").innerHTML = [
      ["Reference", last.ref],
      ["Service", last.service],
      ["Date", last.date],
      ["Time", last.time],
      ["Total", money(last.price)],
    ]
      .map(
        (r) => `<div class="row"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`,
      )
      .join("");
    $("#m").classList.add("open");
    slots();
  };
  $("#dl").onclick = () => downloadReceipt(last);
  $("#cl").onclick = () => $("#m").classList.remove("open");

  onLive(() => {
    if (d.value && dayInfo(d.value)) d.value = "";
    drawCal();
    const keep = sel;
    slots();
    if (keep)
      $$(".slot")
        .find((x) => x.textContent === keep && !x.disabled)
        ?.click();
  });
});
