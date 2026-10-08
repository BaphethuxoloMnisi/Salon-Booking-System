ready.then(() => {
  Auth.require("admin");
  renderNav();
  const T = { Bookings, Availability, Services, Gallery, Settings };
  let cur = "Bookings";
  $("#tabs").innerHTML = Object.keys(T)
    .map((k) => `<button>${k}</button>`)
    .join("");
  function show(k) {
    cur = k;
    $$("#tabs button").forEach((b) =>
      b.classList.toggle("on", b.textContent === k),
    );
    T[k]();
  }
  $$("#tabs button").forEach((b) => (b.onclick = () => show(b.textContent)));
  show("Bookings");
  function Bookings() {
    const B = DB.get("bookings", []).sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time),
    );
    $("#v").innerHTML = B.length
      ? `<div class="tbl"><table><tr><th>Ref</th><th>Client</th><th>Service</th><th>When</th><th>Status</th><th></th></tr>${B.map(
          (
            b,
          ) => `<tr><td>${b.ref}</td><td>${esc(b.name)}<br>${esc(b.email)}<br>${esc(b.phone)}<br><small>@${esc(b.user || "guest")}</small></td><td>${esc(b.service)}<br>${money(b.price)}</td><td>${b.date}<br>${b.time}</td>
<td><select data-s="${b.id}">${["Pending", "Confirmed", "Completed", "Cancelled"].map((s) => `<option${s === b.status ? " selected" : ""}>${s}</option>`).join("")}</select></td><td><button class="btn sm ghost" data-e="${b.id}">Reschedule</button> <button class="btn sm" data-r="${b.id}">Receipt</button> <button class="btn sm del" data-d="${b.id}">Delete</button></td></tr>`,
        ).join("")}</table></div>`
      : '<p class="empty">No bookings yet. They appear here as clients book.</p>';
    const upd = (id, f) => {
      const A = DB.get("bookings", []);
      f(
        A.find((x) => x.id === id),
        A,
      );
      save("bookings", A);
      Bookings();
    };
    $$("[data-s]").forEach(
      (e) => (e.onchange = () => upd(e.dataset.s, (b) => (b.status = e.value))),
    );
    $$("[data-e]").forEach(
      (e) =>
        (e.onclick = () => {
          const dt = prompt("New date (YYYY-MM-DD)"),
            tm = dt && prompt("New time (HH:MM)");
          if (!dt || !tm) return;
          if (!/^\d{4}-\d\d-\d\d$/.test(dt) || !/^\d\d:\d\d$/.test(tm))
            return alert("Use the formats YYYY-MM-DD and HH:MM.");
          if (
            B.some(
              (x) =>
                x.id !== e.dataset.e &&
                x.date === dt &&
                x.time === tm &&
                x.status !== "Cancelled",
            )
          )
            return alert("That slot is already booked.");
          upd(e.dataset.e, (b) => {
            b.moved = {
              fromDate: b.date,
              fromTime: b.time,
              at: Date.now(),
              seen: false,
            };
            b.date = dt;
            b.time = tm;
          });
        }),
    );
    $$("[data-r]").forEach(
      (e) =>
        (e.onclick = () =>
          downloadReceipt(B.find((b) => b.id === e.dataset.r))),
    );
    $$("[data-d]").forEach(
      (e) =>
        (e.onclick = () => {
          if (confirm("Delete this booking?")) {
            save(
              "bookings",
              DB.get("bookings", []).filter((b) => b.id !== e.dataset.d),
            );
            Bookings();
          }
        }),
    );
  }
  function Services() {
    const L = DB.get("services", []),
      f = `<div class="form" style="margin-bottom:32px"><div><label>Name</label><input id="n"></div><div><label>Price (R)</label><input id="p" type="number" min="0"></div><div><label>Duration (min)</label><input id="m" type="number" min="15" step="15"></div><div><label>Photo</label><input id="i" type="file" accept="image/*"></div><div class="full"><label>Description</label><textarea id="d" rows="2"></textarea></div><div class="full"><input type="hidden" id="eid"><button class="btn" id="sv">Save service</button></div></div>`;
    $("#v").innerHTML =
      f +
      (L.length
        ? `<div class="tbl"><table>${L.map((s) => `<tr><td><div class="thumb">${IMG(s.img)}</div></td><td><b>${esc(s.name)}</b><br>${esc(s.desc)}</td><td>${money(s.price)}<br>${s.mins} min</td><td><button class="btn sm ghost" data-e="${s.id}">Edit</button> <button class="btn sm del" data-d="${s.id}">Delete</button></td></tr>`).join("")}</table></div>`
        : '<p class="empty">No services. Add your first one above.</p>');
    $("#sv").onclick = () => {
      const done = (img) => {
        const id = $("#eid").value,
          o = L.find((x) => x.id === id) || { id: uid() };
        Object.assign(o, {
          name: $("#n").value,
          price: +$("#p").value,
          mins: +$("#m").value || 60,
          desc: $("#d").value,
          img: img || o.img || "",
        });
        if (!id) L.push(o);
        save("services", L);
        Services();
      };
      if (!$("#n").value || !$("#p").value)
        return alert("Enter a name and price.");
      const fl = $("#i").files[0];
      fl ? readImg(fl, done) : done();
    };
    $$("[data-e]").forEach(
      (b) =>
        (b.onclick = () => {
          const s = L.find((x) => x.id === b.dataset.e);
          $("#n").value = s.name;
          $("#p").value = s.price;
          $("#m").value = s.mins;
          $("#d").value = s.desc;
          $("#eid").value = s.id;
          scrollTo(0, 0);
        }),
    );
    $$("[data-d]").forEach(
      (b) =>
        (b.onclick = () => {
          if (confirm("Delete this service?")) {
            save(
              "services",
              L.filter((x) => x.id !== b.dataset.d),
            );
            Services();
          }
        }),
    );
  }
  function Gallery() {
    const G = DB.get("gallery", []);
    $("#v").innerHTML =
      `<label>Add photos</label><input id="u" type="file" accept="image/*" multiple style="max-width:360px;margin-bottom:28px"><div class="grid">${G.map((g) => `<div class="gi">${IMG(g.img)}<button class="btn sm del" data-d="${g.id}">Delete</button></div>`).join("") || '<p class="empty">No photos yet.</p>'}</div>`;
    $("#u").onchange = async (e) => {
      for (const f of e.target.files)
        await new Promise((r) =>
          readImg(f, (i) => {
            G.push({ id: uid(), img: i });
            r();
          }),
        );
      save("gallery", G);
      Gallery();
    };
    $$("[data-d]").forEach(
      (b) =>
        (b.onclick = () => {
          save(
            "gallery",
            G.filter((x) => x.id !== b.dataset.d),
          );
          Gallery();
        }),
    );
  }
  function Settings() {
    const s = DB.get("settings");
    $("#v").innerHTML =
      `<div class="form"><div><label>Salon name</label><input id="n" value="${esc(s.name)}"></div><div class="full"><label>Tagline</label><input id="t" value="${esc(s.tagline)}"></div><div class="full"><label>Hero photo</label><input id="h" type="file" accept="image/*"></div><div class="full"><button class="btn" id="sv">Save settings</button></div></div>`;
    $("#sv").onclick = () => {
      const done = (h) => {
        Object.assign(s, {
          name: $("#n").value,

          tagline: $("#t").value,
        });
        if (h) s.hero = h;
        save("settings", s);
        alert("Saved.");
      };
      const f = $("#h").files[0];
      f ? readImg(f, done) : done();
    };
  }

  function Availability() {
    const s = DB.get("settings"),
      open = s.openDays ?? [1, 2, 3, 4, 5, 6],
      closed = Object.keys(s.closed || {}).sort();
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    $("#v").innerHTML = `<div class="form">
      <div class="full"><label>Days the salon takes bookings</label><div class="slots">${names.map((n, i) => `<label class="chk"><input type="checkbox" data-wd="${i}" ${open.includes(i) ? "checked" : ""}> ${n}</label>`).join("")}</div></div>
      <div><label for="mx">Maximum bookings per day</label><input id="mx" type="number" min="1" max="20" value="${s.maxPerDay ?? 2}"></div>
      <div class="full"><button class="btn" id="sv">Save availability</button></div>
      <div class="full"><label for="cd">Close a specific date (holiday, leave)</label><div class="acts"><input id="cd" type="date" min="${today()}" style="max-width:220px"><button class="btn sm" id="ad">Close this date</button></div></div>
      <div class="full">${closed.length ? closed.map((c) => `<span class="chip">${c} <button data-x="${c}" aria-label="Reopen ${c}">×</button></span>`).join("") : '<p class="empty">No closed dates.</p>'}</div></div>`;
    $("#sv").onclick = () => {
      const days = $$("[data-wd]")
        .filter((c) => c.checked)
        .map((c) => +c.dataset.wd);
      if (!days.length) return alert("Choose at least one day.");
      s.openDays = days;
      s.maxPerDay = Math.max(1, +$("#mx").value || 2);
      save("settings", s);
      alert("Saved.");
    };
    $("#ad").onclick = () => {
      if (!$("#cd").value) return alert("Pick a date first.");
      s.closed = { ...(s.closed || {}), [$("#cd").value]: true };
      save("settings", s);
      Availability();
    };
    $$("[data-x]").forEach(
      (b) =>
        (b.onclick = () => {
          delete s.closed[b.dataset.x];
          save("settings", s);
          Availability();
        }),
    );
  }

  onLive(() => cur === "Bookings" && show("Bookings"));
});
