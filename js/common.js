const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
/* ---------- Data layer: Firebase Realtime Database + in-memory cache ----------
   Reads come from a live cache kept current by Firebase listeners. Writes send only the
   items that changed, so two people never overwrite each other. Access is limited by database.rules.json. */
const COLLECTIONS = { services: "id", gallery: "id", bookings: "id" };
let cache = {},
  rdb = null;
const listeners = [];
const onLive = (fn) => listeners.push(fn);
const clean = (v) => JSON.parse(JSON.stringify(v));
const slotKey = (date, time) => date + "_" + time.replace(":", "");
const isActive = (b) => b && b.status !== "Cancelled";

function write(paths) {
  for (const p in paths) {
    const parts = p.split("/"),
      last = parts.pop();
    let o = cache;
    parts.forEach((s) => (o = o[s] ??= {}));
    paths[p] == null ? delete o[last] : (o[last] = paths[p]);
  }
  return rdb
    .ref()
    .update(clean(paths))
    .catch((e) => alert("Could not save: " + e.message));
}

const DB = {
  get(k, d) {
    const v = cache[k];
    // return copies: callers edit them, and set() diffs the copy against the live cache
    return v == null ? d : clean(COLLECTIONS[k] ? Object.values(v) : v);
  },
  set(k, v) {
    const key = COLLECTIONS[k];
    if (!key) return write({ [k]: v });
    const next = Object.fromEntries(v.map((x) => [x[key], x])),
      prev = cache[k] || {},
      paths = {};
    for (const id in next)
      if (JSON.stringify(next[id]) !== JSON.stringify(prev[id]))
        paths[`${k}/${id}`] = next[id];
    for (const id in prev) if (!(id in next)) paths[`${k}/${id}`] = null;
    if (k === "bookings") {
      // mirror active bookings into slots/ so everyone can see which times are taken
      for (const id of new Set([...Object.keys(prev), ...Object.keys(next)])) {
        const o = prev[id],
          n = next[id];
        if (
          o &&
          n &&
          o.date === n.date &&
          o.time === n.time &&
          isActive(o) === isActive(n)
        )
          continue;
        if (isActive(o)) paths["slots/" + slotKey(o.date, o.time)] = null;
        if (isActive(n)) paths["slots/" + slotKey(n.date, n.time)] = n.uid + "|" + n.id;
      }
    }
    return write(paths);
  },
  put: (path, value) => write({ [path]: value }),
  // Atomically reserve a time slot, and refuse it if the day already has the maximum bookings.
  async claim(date, time, id) {
    const key = slotKey(date, time),
      max = (cache.settings || {}).maxPerDay ?? 2;
    const res = await rdb
      .ref("slots/" + key)
      .transaction((cur) => (cur ? undefined : id));
    if (!res.committed) return false;
    // Re-count the day: if two people raced past the limit, give our slot back.
    const day = await rdb
      .ref("slots")
      .orderByKey()
      .startAt(date + "_")
      .endAt(date + "_\uf8ff")
      .once("value");
    if (Object.keys(day.val() || {}).length > max) {
      await rdb.ref("slots/" + key).remove();
      return false;
    }
    return true;
  },
};
const U = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const money = (n) => "R" + Number(n).toLocaleString();
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const IMG = (src, alt = "") =>
  `<img src="${src}" alt="${esc(alt)}" loading="lazy" onerror="this.removeAttribute('src')">`;
function seed() {
  if (!DB.get("services"))
    DB.set("services", [
      {
        id: "s1",
        name: "Signature Cut & Style",
        price: 450,
        mins: 60,
        desc: "Consultation, wash, precision cut and blow-dry.",
        img: U("1560066984-138dadb4c035"),
      },
      {
        id: "s2",
        name: "Colour & Balayage",
        price: 1400,
        mins: 150,
        desc: "Hand-painted colour with a gloss finish.",
        img: U("1522337360788-8b13dee7a37e"),
      },
      {
        id: "s3",
        name: "Gel Manicure",
        price: 280,
        mins: 60,
        desc: "Shape, cuticle care and long-wear gel colour.",
        img: U("1604654894610-df63bc536371"),
      },
      {
        id: "s4",
        name: "Bridal & Event Makeup",
        price: 900,
        mins: 90,
        desc: "Skin prep and a look that lasts all day.",
        img: U("1487412947147-5cebf100ffc2"),
      },
    ]);
  if (!DB.get("gallery"))
    DB.set(
      "gallery",
      [
        "1562322140-8baeececf3df",
        "1521590832167-7bcbfaa6381f",
        "1560066984-138dadb4c035",
        "1522337360788-8b13dee7a37e",
        "1604654894610-df63bc536371",
        "1487412947147-5cebf100ffc2",
      ].map((i) => ({ id: "g" + i.slice(0, 6), img: U(i) })),
    );
  if (!DB.get("settings"))
    DB.set("settings", {
      name: "Maison Orchid",
      tagline: "Hair, nails and makeup in a calm, light-filled studio.",
      hero: U("1562322140-8baeececf3df"),
    });
}
// Resize uploads: images are stored inside the database, so keep them small
function readImg(file, cb) {
  const r = new FileReader();
  r.onload = () => {
    const i = new Image();
    i.onload = () => {
      const c = document.createElement("canvas"),
        s = Math.min(1, 800 / i.width);
      c.width = i.width * s;
      c.height = i.height * s;
      c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.75));
    };
    i.src = r.result;
  };
  r.readAsDataURL(file);
}
function save(k, v) {
  DB.set(k, v);
  return true;
}
function receiptHTML(b) {
  const S = DB.get("settings"),
    rows = [
      ["Reference", b.ref],
      ["Name", b.name],
      ["Email", b.email],
      ["Phone", b.phone],
      ["Service", b.service],
      ["Duration", b.mins + " min"],
      ["Date", b.date],
      ["Time", b.time],
      ["Notes", b.notes || "None"],
      ["Total due", money(b.price)],
      ["Booked on", new Date(b.created).toLocaleString()],
    ];
  return `<!doctype html><meta charset=utf-8><title>Receipt ${b.ref}</title><body style="font:16px/1.6 Georgia,serif;max-width:520px;margin:40px auto;padding:32px;border:1px solid #ddd"><h1 style="margin:0">${esc(S.name)}</h1><p>Booking receipt</p>${rows.map((r) => `<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ccc;padding:6px 0"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join("")}<p style="margin-top:24px;font-size:14px">Please arrive 10 minutes early. Payment is made at the salon.</p>`;
}
function downloadReceipt(b) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([receiptHTML(b)], { type: "text/html" }),
  );
  a.download = `receipt-${b.ref}.html`;
  a.click();
}
const today = () => {
  const n = new Date();
  return new Date(n - n.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};

/* ---------- Authentication (Firebase Authentication, email + password) ----------
   Usernames map to a private email address. The admin account is created by hand in the
   Firebase console (Authentication > Users) and is never stored in this code. */
const ADMIN_EMAIL = "admin@salonbooking.local";
const emailFor = (username) => username + "@salonbooking.local";
let auth = null;

const Auth = {
  me() {
    try { return JSON.parse(localStorage.getItem("sl_session")); } catch { return null; }
  },
  start(session) {
    localStorage.setItem("sl_session", JSON.stringify(session));
    return session;
  },
  async profile(fbUser) {
    if (fbUser.email === ADMIN_EMAIL) return { role: "admin", user: "admin", name: "Administrator", uid: fbUser.uid };
    const p = (await rdb.ref("users/" + fbUser.uid).once("value")).val() || {};
    return { role: "customer", uid: fbUser.uid, user: p.user || fbUser.email.split("@")[0], name: p.name || "", email: p.email || "", phone: p.phone || "" };
  },
  async login(username, password) {
    try {
      const cred = await auth.signInWithEmailAndPassword(emailFor(username.trim().toLowerCase()), password);
      const session = Auth.start(await Auth.profile(cred.user));
      if (session.role === "admin" && !DB.get("settings")) seed();
      return session;
    } catch {
      return null;
    }
  },
  async register(f) {
    const user = f.user.trim().toLowerCase();
    if (!f.name.trim() || !f.phone.trim()) return "Enter your full name and phone number.";
    if (!/\S+@\S+\.\S+/.test(f.email)) return "Enter a valid email address.";
    if (!/^[a-z0-9_]{3,20}$/.test(user) || user === "admin") return "Username: 3-20 letters, numbers or underscores.";
    if (f.pass.length < 6) return "Password must be at least 6 characters.";
    if (f.pass !== f.confirm) return "Passwords do not match.";
    try {
      const cred = await auth.createUserWithEmailAndPassword(emailFor(user), f.pass);
      const profile = { user, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() };
      await DB.put("users/" + cred.user.uid, { ...profile, created: Date.now() });
      Auth.start({ role: "customer", uid: cred.user.uid, ...profile });
      return null;
    } catch (e) {
      return e.code === "auth/email-already-in-use" ? "That username is taken." : "Could not create the account: " + e.message;
    }
  },
  logout() {
    localStorage.removeItem("sl_session");
    (auth ? auth.signOut() : Promise.resolve()).finally(() => (location.href = "login.html"));
  },
  // Redirects to the login page unless the signed-in role matches.
  require(role) {
    const me = Auth.me();
    if (!me || me.role !== role) {
      location.replace("login.html?next=" + encodeURIComponent(location.pathname.split("/").pop()));
      throw new Error("Not authorised");
    }
    return me;
  },
};

const unseenMoves = (me) =>
  me && me.role === "customer"
    ? DB.get("bookings", []).filter(
        (b) => b.user === me.user && b.moved && !b.moved.seen,
      ).length
    : 0;

/* ---------- Shared navigation with mobile hamburger ---------- */
function renderNav() {
  const me = Auth.me(),
    name = DB.get("settings", {}).name || "Salon",
    n = unseenMoves(me);
  const links =
    me && me.role === "admin"
      ? [
          ["admin.html", "Dashboard"],
          ["index.html", "View site"],
        ]
      : [
          ["index.html#services", "Services"],
          ["index.html#gallery", "Gallery"],
          ["index.html#book", "Book"],
          ...(me
            ? [
                [
                  "account.html",
                  "My bookings" +
                    (n ? ' <span class="dot">' + n + "</span>" : ""),
                ],
              ]
            : []),
        ];
  const auth = me
    ? `<a href="#" id="out">Log out (${esc(me.user)})</a>`
    : `<a href="login.html">Log in</a><a class="btn sm" href="login.html?tab=register">Register</a>`;
  $("#nav").innerHTML =
    `<div class="wrap"><a class="logo" href="index.html">${esc(name)}</a>
    <button class="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <div class="links">${links.map((l) => `<a href="${l[0]}">${l[1]}</a>`).join("")}${auth}</div></div>`;
  const burger = $(".burger"),
    menu = $(".links");
  const toggle = (open) => {
    menu.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open);
  };
  burger.onclick = () => toggle(!menu.classList.contains("open"));
  menu.onclick = (e) => {
    if (e.target.closest("a")) toggle(false);
  };
  const out = $("#out");
  if (out)
    out.onclick = (e) => {
      e.preventDefault();
      Auth.logout();
    };
}

/* ---------- Boot: connect, load, then run the page ---------- */
const ready = (async () => {
  try {
    firebase.initializeApp(firebaseConfig);
    rdb = firebase.database();
    auth = firebase.auth();
    // Wait for Firebase to restore the signed-in user before reading anything
    const fbUser = await new Promise((resolve) => {
      const off = auth.onAuthStateChanged((u) => { off(); resolve(u); });
    });
    let me = Auth.me();
    if (!fbUser) { localStorage.removeItem("sl_session"); me = null; }
    else if (!me || me.uid !== fbUser.uid) me = Auth.start(await Auth.profile(fbUser));
    const nodes = [rdb.ref("settings"), rdb.ref("services"), rdb.ref("gallery"), rdb.ref("slots")];
    if (me && me.role === "admin") nodes.push(rdb.ref("bookings"));
    else if (me) nodes.push(rdb.ref("bookings").orderByChild("uid").equalTo(me.uid));
    const loaded = Promise.all(nodes.map((n) => new Promise((resolve) => {
      let first = true;
      n.on("value", (snap) => {
        const k = snap.ref.key, v = snap.val();
        v == null ? delete cache[k] : (cache[k] = v);
        if (first) { first = false; resolve(); } else listeners.forEach((fn) => fn());
      }, (err) => { console.error("Firebase read failed:", err); resolve(); });
    })));
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for the database")), 10000));
    await Promise.race([loaded, timeout]);
    if (!DB.get("settings") && me && me.role === "admin") seed();
  } catch (e) {
    console.error(e);
    document.body.insertAdjacentHTML("afterbegin", `<div class="demo" style="background:#f2d4d4">Cannot connect to Firebase (${esc(e.message)}). Check js/firebase-config.js and the Realtime Database URL.</div>`);
    throw e;
  }
})();
