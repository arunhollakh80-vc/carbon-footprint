/* Main page: configurator, car on stage, result, recommendations, cleaner cars, model database.
   The numbers come from footprint.js (same formulas as the Python and Java versions). */
(function () {
  const D = window.CFS_DATA, F = window.Footprint;
  const $ = id => document.getElementById(id);
  const fmt = (n, d = 0) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const models = D.models, factors = D.factors;
  const byId = new Map(models.map(m => [m.id, m]));
  const DEFAULT_CAR = (models.find(m => m.model.toUpperCase() === "X5 XDRIVE40I") || models[0]).id;
  const PAINT = { "BMW": "var(--paint-bmw)", "Mercedes-Benz": "var(--paint-merc)" };
  const BANDS = [["Low", "var(--band-low)"], ["Moderate", "var(--band-mod)"], ["High", "var(--band-high)"], ["Very high", "var(--band-vhigh)"]];
  const BAND_EDGES = [0, 1.5, 3, 5, 8];   // tonnes; must match band() in footprint.js

  // ------------------------------------------------------------ state (remembered in the browser)
  const state = { ...F.DEFAULT_PROFILE, car_id: DEFAULT_CAR };
  try {
    const s = JSON.parse(localStorage.getItem("cfs-car") || "{}");
    ["car_id", "km_month", "city_share", "fuel_price"].forEach(k => { if (typeof s[k] === "number") state[k] = s[k]; });
  } catch (e) { /* storage unavailable */ }
  if (!byId.has(state.car_id)) state.car_id = DEFAULT_CAR;
  const save = () => { try { localStorage.setItem("cfs-car", JSON.stringify(state)); } catch (e) { /* ignore */ } };
  const car = () => byId.get(state.car_id);

  // ------------------------------------------------------------ car pictures
  // Generic side views by body type, drawn here (not drawings of a specific model).
  const SHAPES = {
    sedan: {
      body: "M18 112Q18 92 46 88L96 80Q132 50 176 46L240 46Q282 48 312 78L362 86Q384 90 384 108L384 114Q384 121 376 121L26 121Q18 121 18 114Z",
      glass: ["M112 79Q140 58 177 55L201 55L201 79Z", "M209 55L238 55Q270 58 294 79L209 79Z"],
    },
    suv: {
      body: "M18 112Q18 78 50 74L106 70Q128 34 166 30L304 30Q336 32 350 62L374 70Q386 74 386 94L386 114Q386 121 378 121L26 121Q18 121 18 114Z",
      glass: ["M124 68Q142 42 170 39L206 39L206 68Z", "M214 39L264 39L264 68L214 68Z", "M272 39L302 39Q322 42 334 68L272 68Z"],
    },
    wagon: {
      body: "M18 112Q18 92 46 88L96 80Q132 50 176 46L318 46Q346 48 360 80L374 86Q386 90 386 106L386 114Q386 121 378 121L26 121Q18 121 18 114Z",
      glass: ["M112 79Q140 58 177 55L201 55L201 79Z", "M209 55L262 55L262 79L209 79Z", "M270 55L314 55Q334 58 345 79L270 79Z"],
    },
    sports: {
      body: "M18 112Q20 97 60 93L132 87Q162 61 206 58L240 58Q276 60 302 85L364 93Q386 97 386 110L386 114Q386 121 378 121L26 121Q18 121 18 114Z",
      glass: ["M148 86Q170 69 206 66L238 66Q262 68 284 86Z"],
    },
  };
  const TYPE_NAME = { sedan: "saloon", suv: "SUV", wagon: "estate", sports: "sports car" };
  function bodyType(cls) {
    if (cls.includes("SUV") || cls.includes("SPECIAL")) return "suv";
    if (cls.includes("WAGON")) return "wagon";
    if (cls.includes("TWO-SEATER")) return "sports";
    return "sedan";
  }
  let uid = 0;
  function carSvg(type, paint) {
    const s = SHAPES[type], u = "cv" + (++uid);
    const spokes = x => [18, 90, 162, 234, 306].map(a => {
      const r = a * Math.PI / 180;
      return `<path d="M${x} 121L${(x + 14 * Math.cos(r)).toFixed(1)} ${(121 + 14 * Math.sin(r)).toFixed(1)}" stroke="#39424a" stroke-width="3.4" stroke-linecap="round"/>`;
    }).join("");
    const wheel = x => `<circle cx="${x}" cy="121" r="29" fill="#030507"/><circle cx="${x}" cy="121" r="24.5" fill="#0c0f12"/>` +
      `<circle cx="${x}" cy="121" r="17" fill="url(#${u}r)"/>${spokes(x)}<circle cx="${x}" cy="121" r="4.5" fill="#e6e9eb"/>` +
      `<circle cx="${x}" cy="121" r="17" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1"/>`;
    return `<svg viewBox="0 0 404 160" role="img" aria-label="Illustration of ${type === "suv" ? "an" : "a"} ${TYPE_NAME[type]}">` +
      `<defs><linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/>` +
      `<stop offset=".36" stop-color="#fff" stop-opacity=".05"/><stop offset=".68" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>` +
      `<linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6f8595"/><stop offset=".5" stop-color="#1c2832"/><stop offset="1" stop-color="#0c141a"/></linearGradient>` +
      `<radialGradient id="${u}r" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#f2f4f5"/><stop offset=".55" stop-color="#9aa3aa"/><stop offset="1" stop-color="#3f474e"/></radialGradient>` +
      `<radialGradient id="${u}f"><stop offset="0" stop-color="#000" stop-opacity=".8"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
      `<filter id="${u}b" x="-100%" y="-300%" width="300%" height="700%"><feGaussianBlur stdDeviation="5"/></filter></defs>` +
      `<ellipse cx="202" cy="147" rx="198" ry="13" fill="url(#${u}f)"/>` +
      `<path d="${s.body}" fill="${paint}"/><path d="${s.body}" fill="url(#${u}s)"/>` +
      s.glass.map(g => `<path d="${g}" fill="url(#${u}g)"/>`).join("") +
      `<path d="M58 100H352" stroke="rgba(255,255,255,.22)" stroke-width="1.3"/>` +
      `<ellipse cx="22" cy="99" rx="22" ry="7" fill="#ffe7a8" opacity=".55" filter="url(#${u}b)"/>` +
      `<rect x="20" y="96" width="17" height="6" rx="3" fill="#fff7df"/><rect x="371" y="94" width="13" height="7" rx="3" fill="#ff4f4f"/>` +
      wheel(102) + wheel(306) + `</svg>`;
  }
  /** Fills an element with a photo from web/images if one was added, otherwise the illustration. */
  function paint(el, c) {
    const type = bodyType(c.vehicle_class);
    el.innerHTML = carSvg(type, PAINT[c.make]);
    const img = new Image();
    img.alt = `${c.make} ${TYPE_NAME[type]}`;
    img.onload = () => { el.innerHTML = ""; el.appendChild(img); };
    img.src = `images/${c.make === "BMW" ? "bmw" : "mercedes"}-${type}.jpg`;
  }
  const tierTag = t => `<span class="tag ${t}">${t} emission group</span>`;

  // ------------------------------------------------------------ model picker (combobox)
  const input = $("modelInput"), list = $("modelList");
  let options = [], active = -1;
  const brandNow = () => document.querySelector('input[name="brand"]:checked').value;
  function openList(query) {
    const q = (query || "").trim().toLowerCase(), b = brandNow();
    options = models.filter(m => m.make === b && (!q || m.model.toLowerCase().includes(q) || m.vehicle_class.toLowerCase().includes(q)))
      .sort((x, y) => x.model.localeCompare(y.model) || x.co2_g_km - y.co2_g_km);
    active = Math.max(0, options.findIndex(m => m.id === state.car_id));
    list.innerHTML = options.length ? options.map((m, i) =>
      `<li role="option" id="opt${m.id}" data-id="${m.id}" aria-selected="${m.id === state.car_id}" class="${i === active ? "active" : ""}">` +
      `<b>${esc(m.model)}</b><span class="g">${m.co2_g_km} g/km</span>` +
      `<small>${F.classLabel(m.vehicle_class)} · ${m.engine_l.toFixed(1)} L ${esc(m.fuel_name.toLowerCase())}</small></li>`).join("")
      : `<li class="none">No ${b} model matches “${esc(q)}”. Try a shorter name.</li>`;
    list.hidden = false; input.setAttribute("aria-expanded", "true");
    const el = list.querySelector("li.active"); if (el) el.scrollIntoView({ block: "nearest" });
  }
  function closeList() { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.value = car().model; }
  function moveActive(d) {
    if (!options.length) return;
    active = (active + d + options.length) % options.length;
    list.querySelectorAll("li").forEach((li, i) => li.classList.toggle("active", i === active));
    const el = list.children[active]; el.scrollIntoView({ block: "nearest" });
    input.setAttribute("aria-activedescendant", el.id);
  }
  input.addEventListener("focus", () => { input.select(); openList(""); });
  input.addEventListener("input", () => openList(input.value));
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) openList(""); else moveActive(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
    else if (e.key === "Enter") { e.preventDefault(); if (options[active]) { setCar(options[active].id); input.blur(); } }
    else if (e.key === "Escape") { closeList(); }
  });
  input.addEventListener("blur", () => setTimeout(closeList, 120));
  list.addEventListener("mousedown", e => {
    const li = e.target.closest("li[data-id]"); if (!li) return;
    e.preventDefault(); setCar(Number(li.dataset.id)); input.blur();
  });
  document.querySelectorAll('input[name="brand"]').forEach(r => r.addEventListener("change", () => {
    if (car().make === r.value) return;
    // start from a well-known model of that brand
    const pick = models.find(m => m.make === r.value && m.model.toUpperCase() === (r.value === "BMW" ? "X5 XDRIVE40I" : "C 300 4MATIC"))
      || models.filter(m => m.make === r.value)[0];
    setCar(pick.id);
  }));

  // ------------------------------------------------------------ sliders and fuel price
  function syncInputs() {
    document.querySelector(`input[name="brand"][value="${car().make}"]`).checked = true;
    input.value = car().model;
    ["km_month", "city_share"].forEach(id => {
      const el = $(id); el.value = state[id];
      el.style.setProperty("--fill", (100 * (el.value - el.min) / (el.max - el.min)) + "%");
    });
    $("o_km").textContent = `${fmt(state.km_month)} km a month`;
    $("o_city").textContent = state.city_share === 0 ? "All highway" : state.city_share === 100 ? "All city" : `${state.city_share}% city`;
    $("fuel_price").value = state.fuel_price;
  }
  ["km_month", "city_share"].forEach(id => $(id).addEventListener("input", e => { state[id] = Number(e.target.value); syncInputs(); update(); }));
  $("fuel_price").addEventListener("input", e => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0) { state.fuel_price = Math.min(200, Math.max(50, v)); update(); }
  });
  $("fuel_price").addEventListener("change", syncInputs);
  document.querySelectorAll(".stepper button").forEach(b => b.addEventListener("click", () => {
    state.fuel_price = Math.min(200, Math.max(50, state.fuel_price + Number(b.dataset.step)));
    syncInputs(); update();
  }));
  $("resetBtn").addEventListener("click", () => { Object.assign(state, F.DEFAULT_PROFILE); setCar(DEFAULT_CAR); });

  function setCar(id) { state.car_id = id; syncInputs(); update(); highlightRow(); }

  // ------------------------------------------------------------ stage
  let shown = null;
  function drawStage(c) {
    if (shown === c.id) return;
    const first = shown === null;
    shown = c.id;
    paint($("heroCar"), c); paint($("heroReflect"), c);
    if (!first) ["heroCar", "heroReflect"].forEach(id => { const el = $(id); el.classList.remove("drive-in"); void el.offsetWidth; el.classList.add("drive-in"); });
    $("tierTag").className = "tag " + c.tier; $("tierTag").textContent = `${c.tier} emission group`;
    $("stageClass").textContent = F.classLabel(c.vehicle_class);
    $("stageMake").textContent = c.make;
    $("stageModel").textContent = c.model;
    $("specs").innerHTML = [["Rated CO₂", `${c.co2_g_km} g/km`], ["Engine", `${c.engine_l.toFixed(1)} L, ${c.cylinders} cyl`],
      ["City", `${c.fuel_city.toFixed(1)} L/100 km`], ["Highway", `${c.fuel_hwy.toFixed(1)} L/100 km`]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  }

  // ------------------------------------------------------------ gauge
  function bandPos(t) {   // 0..1 along the dial: each band takes a quarter
    for (let i = 0; i < 4; i++) if (t < BAND_EDGES[i + 1]) return (i + (t - BAND_EDGES[i]) / (BAND_EDGES[i + 1] - BAND_EDGES[i])) / 4;
    return 1;
  }
  const CX = 120, CY = 124, R = 96;
  const pt = (a, r) => [CX + r * Math.cos(a * Math.PI / 180), CY - r * Math.sin(a * Math.PI / 180)];
  function arc(a0, a1, r) { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; }
  function buildGauge() {
    let s = `<path d="${arc(180, 0, R)}" stroke="#1d252c" stroke-width="16" fill="none"/>`;
    BANDS.forEach(([, col], i) => { s += `<path d="${arc(180 - 45 * i - 1, 180 - 45 * (i + 1) + 1, R)}" stroke="${col}" stroke-width="10" fill="none" opacity=".9"/>`; });
    BAND_EDGES.forEach((e, i) => {
      const [x, y] = pt(180 - 45 * i, R + 16);
      s += `<text class="lbl" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${i === 0 ? "end" : i === 4 ? "start" : "middle"}">${i === 4 ? "8+" : e} t</text>`;
    });
    s += `<g class="needle" id="needle" style="transform-origin:${CX}px ${CY}px"><path d="M${CX} ${CY - 3}L${CX - R + 18} ${CY}L${CX} ${CY + 3}Z" fill="var(--text)"/></g>` +
      `<circle cx="${CX}" cy="${CY}" r="7" fill="var(--text)"/><circle cx="${CX}" cy="${CY}" r="3" fill="var(--panel)"/>`;
    $("gauge").innerHTML = s;
  }

  // ------------------------------------------------------------ result
  const ICONS = {
    car: '<path d="M3 15l2-5.5A2 2 0 0 1 6.9 8h10.2a2 2 0 0 1 1.9 1.5L21 15v3h-2.2M5.2 18H3v-3h18M8 18h8"/><circle cx="6.6" cy="18" r="1.9"/><circle cx="17.4" cy="18" r="1.9"/>',
    bus: '<rect x="4.5" y="3" width="15" height="14" rx="2.5"/><path d="M4.5 11h15M8 20.5V17M16 20.5V17"/><circle cx="8.2" cy="14" r=".6"/><circle cx="15.8" cy="14" r=".6"/>',
    smooth: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l3.8-5"/><path d="M7 17h.01M17 17h.01"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6.5a3 3 0 0 0 0-6h-5a3 3 0 0 1 0-6H16"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  };
  const iconFor = t => /cleaner car/i.test(t) ? "car" : /bus/i.test(t) ? "bus" : /smooth/i.test(t) ? "smooth" : /trips/i.test(t) ? "route" : "clock";

  function update() {
    const c = car(), r = F.estimate(state, c);
    drawStage(c);

    // gauge
    const t = r.total / 1000, bi = BANDS.findIndex(b => b[0] === r.band);
    $("needle").style.transform = `rotate(${(bandPos(t) * 180).toFixed(1)}deg)`;
    $("gTotal").textContent = fmt(t, 2);
    $("gBand").innerHTML = `<i style="background:${BANDS[bi][1]}"></i><span><b>${r.band}</b> for one car · about ${fmt(r.total / 365, 1)} kg of CO₂ a day</span>`;

    // tiles
    $("tLitres").textContent = fmt(r.litres);
    $("tCost").textContent = "₹" + fmt(r.cost);
    $("tCo2").textContent = `${fmt(r.co2)} g/km`;
    $("tCo2Sub").textContent = `rated ${c.co2_g_km} g/km at the official mix`;
    const cleaner = models.filter(m => m.co2_g_km < c.co2_g_km).length;
    const pct = Math.round(100 * (models.length - cleaner - 1) / (models.length - 1));
    $("tRank").textContent = `Cleaner than ${pct}%`;
    $("tRankSub").textContent = `${cleaner} of ${models.length} models are rated lower`;
    $("rankMark").style.left = `${100 * cleaner / (models.length - 1)}%`;

    // city / highway split
    const city = r.parts["City driving"], hwy = r.parts["Highway driving"];
    $("splitBar").innerHTML = `<div style="flex-grow:${city};background:var(--gold)"></div><div style="flex-grow:${hwy};background:var(--blue)"></div>`;
    $("splitLegend").innerHTML =
      `<div><i style="background:var(--gold)"></i><b>City driving · ${fmt(city)} kg</b><span>${r.total ? fmt(100 * city / r.total) : 0}% of the total, at ${fmt(c.co2_g_km * c.fuel_city / c.fuel_comb)} g/km</span></div>` +
      `<div><i style="background:var(--blue)"></i><b>Highway driving · ${fmt(hwy)} kg</b><span>${r.total ? fmt(100 * hwy / r.total) : 0}% of the total, at ${fmt(c.co2_g_km * c.fuel_hwy / c.fuel_comb)} g/km</span></div>`;
    $("splitNote").textContent = `${state.city_share}% of ${fmt(state.km_month * 12)} km a year in the city`;

    // recommendations
    const tips = F.recommend(state, c, models, factors);
    $("tipList").innerHTML = tips.map((tp, i) =>
      `<article class="tip${i === 0 ? " top" : ""}"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[iconFor(tp.title)]}</svg></span>` +
      `<h3>${esc(tp.title)}</h3><p>${esc(tp.tip)}</p>` +
      `<div class="save"><b>−${fmt(tp.kg)} kg</b><span>CO₂ a year</span><span class="rs">₹${fmt(tp.rupees)}</span><span>less on fuel</span></div>` +
      `<div class="share" title="${fmt(100 * tp.kg / r.total)}% of your car's yearly CO₂"><i style="width:${Math.min(100, 100 * tp.kg / r.total)}%"></i></div></article>`).join("")
      || `<p class="empty">Nothing to suggest at this distance.</p>`;

    drawAlternatives(c, r);
    save();
  }

  // ------------------------------------------------------------ cleaner cars in the same class
  function drawAlternatives(c, r) {
    const seen = new Set();
    const alts = models.filter(m => m.vehicle_class === c.vehicle_class && m.fuel_type !== "E" && m.co2_g_km < c.co2_g_km)
      .sort((a, b) => a.co2_g_km - b.co2_g_km || a.id - b.id)
      .filter(m => { const k = m.make + "|" + m.model; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
    $("altLead").textContent = alts.length
      ? `${F.classLabel(c.vehicle_class)} models rated lower than your ${c.model}, with what each would save at your driving.`
      : "";
    const kmYear = state.km_month * 12, me = F.blended(c, state.city_share);
    $("altCards").innerHTML = alts.length ? alts.map(m => {
      const a = F.blended(m, state.city_share);
      return `<article class="alt"><div class="car-image" data-car="${m.id}"></div><div class="alt-body">` +
        `<div class="alt-title"><div><small>${esc(m.make)}</small><h3>${esc(m.model)}</h3></div>${tierTag(m.tier).replace(" emission group", "")}</div>` +
        `<div class="alt-nums"><div><span>Rated CO₂</span><b>${m.co2_g_km} g/km</b></div><div><span>Combined</span><b>${m.fuel_comb.toFixed(1)} L/100 km</b></div></div>` +
        `<p class="alt-save">−${fmt((me.co2 - a.co2) * kmYear / 1000)} kg CO₂ and ₹${fmt((me.fuel - a.fuel) * kmYear / 100 * state.fuel_price)} a year</p>` +
        `<button class="outline" type="button" data-use="${m.id}">Put this car on stage</button></div></article>`;
    }).join("") : `<p class="empty">Your ${esc(c.model)} is already the lowest-rated ${F.classLabel(c.vehicle_class).toLowerCase()} model in the data.</p>`;
    $("altCards").querySelectorAll(".car-image[data-car]").forEach(el => paint(el, byId.get(Number(el.dataset.car))));
  }
  $("altCards").addEventListener("click", e => {
    const b = e.target.closest("[data-use]"); if (!b) return;
    setCar(Number(b.dataset.use)); $("estimate").scrollIntoView({ behavior: "smooth" });
  });

  // ------------------------------------------------------------ model database
  let filtered = models, limit = 15, sortKey = "co2_g_km", sortDir = 1;
  const MAX_CO2 = Math.max(...models.map(m => m.co2_g_km));
  function drawTable() {
    const q = $("searchBox").value.trim().toLowerCase(), b = $("brandFilter").value, cl = $("classFilter").value, t = $("tierFilter").value;
    filtered = models.filter(m => (!q || (m.make + " " + m.model + " " + m.fuel_name).toLowerCase().includes(q)) &&
      (!b || m.make === b) && (!cl || m.vehicle_class === cl) && (!t || m.tier === t))
      .sort((x, y) => ((x[sortKey] > y[sortKey]) - (x[sortKey] < y[sortKey])) * sortDir || x.co2_g_km - y.co2_g_km || x.id - y.id);
    $("tableBody").innerHTML = filtered.slice(0, limit).map(m =>
      `<tr data-row="${m.id}" class="${m.id === state.car_id ? "current" : ""}"><td><b>${esc(m.model)}</b><span class="mk">${m.make}</span></td>` +
      `<td>${F.classLabel(m.vehicle_class)}</td><td class="num">${m.engine_l.toFixed(1)} L</td><td>${esc(m.fuel_name)}</td>` +
      `<td class="num">${m.fuel_city.toFixed(1)}</td><td class="num">${m.fuel_hwy.toFixed(1)}</td>` +
      `<td><div class="co2cell"><b>${m.co2_g_km}</b><i style="width:${(100 * m.co2_g_km / MAX_CO2).toFixed(1)}%"></i></div></td>` +
      `<td>${tierTag(m.tier).replace(" emission group", "")}</td><td><button class="view" type="button" data-view="${m.id}">View</button></td></tr>`).join("") ||
      `<tr><td colspan="9" class="muted">No model matches these filters. Press Clear to see all models.</td></tr>`;
    $("status").textContent = `Showing ${Math.min(limit, filtered.length)} of ${filtered.length} matching models · ${models.length} in the database`;
    $("more").hidden = filtered.length <= limit;
    document.querySelectorAll("th button[data-sort]").forEach(btn => {
      if (btn.dataset.sort === sortKey) btn.setAttribute("aria-sort", sortDir === 1 ? "ascending" : "descending");
      else btn.removeAttribute("aria-sort");
    });
  }
  function highlightRow() { document.querySelectorAll("#tableBody tr[data-row]").forEach(tr => tr.classList.toggle("current", Number(tr.dataset.row) === state.car_id)); }
  document.querySelectorAll("th button[data-sort]").forEach(btn => btn.addEventListener("click", () => {
    sortDir = sortKey === btn.dataset.sort ? -sortDir : 1; sortKey = btn.dataset.sort; drawTable();
  }));
  ["searchBox", "brandFilter", "classFilter", "tierFilter"].forEach(id =>
    $(id).addEventListener(id === "searchBox" ? "input" : "change", () => { limit = 15; drawTable(); }));
  $("quickSearch").addEventListener("input", e => { $("searchBox").value = e.target.value; limit = 15; drawTable(); });
  $("quickSearch").addEventListener("keydown", e => { if (e.key === "Enter") $("database").scrollIntoView({ behavior: "smooth" }); });
  $("clearFilters").addEventListener("click", () => {
    ["searchBox", "brandFilter", "classFilter", "tierFilter", "quickSearch"].forEach(id => { $(id).value = ""; }); limit = 15; drawTable();
  });
  $("more").addEventListener("click", () => { limit += 30; drawTable(); });

  // ------------------------------------------------------------ details window
  let modalCar = null, lastFocus = null;
  function showDetails(id) {
    const m = byId.get(id); if (!m) return;
    modalCar = id; lastFocus = document.activeElement;
    paint($("modalCar"), m);
    $("modalMake").textContent = m.make;
    $("modalTitle").textContent = m.model;
    $("modalBody").innerHTML = [["Vehicle class", F.classLabel(m.vehicle_class)], ["Emission group (K-Means)", m.tier],
      ["Engine", `${m.engine_l.toFixed(1)} L, ${m.cylinders} cylinders`], ["Fuel", m.fuel_name],
      ["City", `${m.fuel_city.toFixed(1)} L/100 km`], ["Highway", `${m.fuel_hwy.toFixed(1)} L/100 km`],
      ["Combined", `${m.fuel_comb.toFixed(1)} L/100 km`], ["Rated CO₂", `${m.co2_g_km} g/km`]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    $("modalUse").hidden = id === state.car_id;
    $("detailModal").classList.add("open"); $("modalClose").focus();
  }
  function closeModal() { $("detailModal").classList.remove("open"); if (lastFocus) lastFocus.focus(); }
  $("tableBody").addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (b) showDetails(Number(b.dataset.view)); });
  $("modalClose").addEventListener("click", closeModal); $("modalDone").addEventListener("click", closeModal);
  $("modalUse").addEventListener("click", () => { closeModal(); setCar(modalCar); $("estimate").scrollIntoView({ behavior: "smooth" }); });
  $("detailModal").addEventListener("click", e => { if (e.target.id === "detailModal") closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("detailModal").classList.contains("open")) closeModal(); });

  // ------------------------------------------------------------ CSV export
  const COLUMNS = [["Brand", "make"], ["Model", "model"], ["Vehicle class", "vehicle_class"], ["Engine size (L)", "engine_l"], ["Cylinders", "cylinders"],
    ["Fuel", "fuel_name"], ["Fuel consumption city (L/100 km)", "fuel_city"], ["Fuel consumption highway (L/100 km)", "fuel_hwy"],
    ["Fuel consumption combined (L/100 km)", "fuel_comb"], ["CO2 emissions (g/km)", "co2_g_km"], ["Emission group", "tier"]];
  function exportRows(rows, name) {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [COLUMNS.map(c => q(c[0])).join(",")].concat(rows.map(r => COLUMNS.map(c => q(r[c[1]])).join(",")));
    const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }
  $("exportCsv").addEventListener("click", () => exportRows(filtered, "BMW_Mercedes_filtered_models.csv"));
  $("exportAll").addEventListener("click", () => exportRows(models, "BMW_Mercedes_all_models.csv"));

  // ------------------------------------------------------------ start
  $("nBMW").textContent = `${models.filter(m => m.make === "BMW").length} models`;
  $("nMerc").textContent = `${models.filter(m => m.make === "Mercedes-Benz").length} models`;
  $("classFilter").innerHTML += [...new Set(models.map(m => m.vehicle_class))].sort().map(c => `<option value="${c}">${F.classLabel(c)}</option>`).join("");
  buildGauge(); syncInputs(); drawTable(); update();
})();
