const S = DB.get("settings"),
  SV = DB.get("services"),
  TIMES = [
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
$("#brand").textContent = S.name;
$("#h1").textContent = S.name;
$("#tag").textContent = S.tagline;
$("#foot").textContent = "© " + new Date().getFullYear() + " " + S.name;
$("#hero").innerHTML = IMG(S.hero, "Salon");
$("#svcs").innerHTML =
  SV.map(
    (s) =>
      `<article class="svc"><div class="ph">${IMG(s.img, s.name)}</div><h3>${esc(s.name)}</h3><p class="meta">${money(s.price)} · ${s.mins} min</p><p>${esc(s.desc)}</p></article>`,
  ).join("") || '<p class="empty">No services yet.</p>';
$("#gal").innerHTML = DB.get("gallery")
  .map((g) => IMG(g.img, "Salon photo"))
  .join("");
$("#svc").innerHTML = SV.map(
  (s) => `<option value="${s.id}">${esc(s.name)} — ${money(s.price)}</option>`,
).join("");
const d = $("#date");
d.min = today();
function slots() {
  const taken = DB.get("bookings", [])
    .filter((b) => b.date === d.value && b.status !== "Cancelled")
    .map((b) => b.time);
  sel = "";
  $("#slots").innerHTML = TIMES.map(
    (t) =>
      `<button type="button" class="slot" ${taken.includes(t) ? "disabled" : ""}>${t}</button>`,
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
slots();
$("#go").onclick = () => {
  const v = (k) => $("#" + k).value.trim(),
    e = $("#err");
  if (!v("name") || !/\S+@\S+\.\S+/.test(v("email")) || v("phone").length < 7)
    return (e.textContent =
      "Enter your name, a valid email and a phone number.");
  if (!d.value || d.value < today()) return (e.textContent = "Choose a date.");
  if (!sel) return (e.textContent = "Choose an available time.");
  e.textContent = "";
  const s = SV.find((x) => x.id === v("svc")),
    all = DB.get("bookings", []);
  if (!s) return (e.textContent = "Choose a service.");
  if (
    all.some(
      (b) => b.date === d.value && b.time === sel && b.status !== "Cancelled",
    )
  ) {
    slots();
    return (e.textContent = "That time was just taken. Pick another.");
  }
  last = {
    id: uid(),
    ref: "BK" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    name: v("name"),
    email: v("email"),
    phone: v("phone"),
    service: s.name,
    price: s.price,
    mins: s.mins,
    date: d.value,
    time: sel,
    notes: v("notes"),
    status: "Pending",
    created: Date.now(),
  };
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
