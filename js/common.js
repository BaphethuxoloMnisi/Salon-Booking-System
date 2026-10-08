const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const DB = {
  get(k, d) {
    try {
      return JSON.parse(localStorage.getItem("sl_" + k)) ?? d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    localStorage.setItem("sl_" + k, JSON.stringify(v));
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
    ].map((i) => ({ id: uid() + i.slice(0, 3), img: U(i) })),
  );
if (!DB.get("settings"))
  DB.set("settings", {
    name: "Maison Orchid",
    tagline: "Hair, nails and makeup in a calm, light-filled studio.",
    hero: U("1562322140-8baeececf3df"),
    pass: "admin123",
  });
// Resize uploads so localStorage (about 5MB) is not exhausted
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
  try {
    DB.set(k, v);
    return true;
  } catch {
    alert("Storage is full. Delete some images and try again.");
    return false;
  }
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
