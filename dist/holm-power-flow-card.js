/* HOLM Power Flow Card — flux de puissance compact et horizontal : Solaire → Maison ⇄ Réseau, + appareils actifs.
 * Les capteurs sont lus automatiquement dans le tableau de bord Énergie de Home Assistant (modifiables dans l'éditeur).
 *   type: custom:holm-power-flow-card
 *   solar_power / grid_power (W, négatif = injection accepté) / export_power / home_power / export_energy
 *   solar_label / home_label / grid_label : entité affichée sous chaque nœud
 *   tariff_entity + hc_price (nombre ou entité) : couleur du réseau en heures creuses / pleines
 *   threshold, curve_factor, show_frame, show_devices, show_device_names, max_devices, device_threshold, devices
 *   solar_color / home_color / grid_color / grid_hp_color / export_color
 * https://github.com/kaaribou/holm-power-flow-card — licence MIT
 */
(() => {
const VERSION = "1.0.0";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fr = (v, d = 1) => Number(v).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtW = (w) => (Math.abs(w) >= 1000 ? [fr(w / 1000, Math.abs(w) >= 10000 ? 1 : 2), "kW"] : [fr(w, 0), "W"]);
const DEF = { solar_color: "#e3a21a", home_color: "#0abfbf", grid_color: "#4a90d9", grid_hp_color: "#e2702a", export_color: "#9b6fd6" };
const ICONS = [
  [/chauffe.?eau|ballon/i, "mdi:water-boiler"], [/clim/i, "mdi:snowflake"], [/chauffage|radiateur/i, "mdi:radiator"],
  [/s[eè]che.?serviette/i, "mdi:heating-coil"], [/volet/i, "mdi:window-shutter"], [/frigo|r[ée]frig/i, "mdi:fridge-outline"],
  [/lave.?linge/i, "mdi:washing-machine"], [/lave.?vais/i, "mdi:dishwasher"], [/s[eè]che.?linge/i, "mdi:tumble-dryer"],
  [/tv|t[ée]l[ée]/i, "mdi:television"], [/spa/i, "mdi:hot-tub"], [/vid[ée]oproj/i, "mdi:projector"], [/robot|tondeuse/i, "mdi:robot-mower"],
  [/friteuse/i, "mdi:pot-steam"], [/serre/i, "mdi:greenhouse"], [/d[ée]shumid/i, "mdi:air-humidifier"], [/local tech|serveur|nas/i, "mdi:server"],
  [/multiprise/i, "mdi:power-plug-outline"], [/bureau/i, "mdi:desk"], [/cuisson|four|plaque/i, "mdi:stove"], [/prise/i, "mdi:power-socket-eu"],
];
const iconFor = (n) => (ICONS.find(([r]) => r.test(n)) || [0, "mdi:flash"])[1];
// vitesse des points : paliers pour ne pas relancer l'animation à chaque mesure
const level = (w, th) => (w < th ? 0 : w < 200 ? 1 : w < 800 ? 2 : w < 2000 ? 3 : w < 4000 ? 4 : 5);
const DUR = [0, 3.4, 2.4, 1.7, 1.2, 0.85];

class HolmPowerFlowCard extends HTMLElement {
  setConfig(c) {
    this._c = { threshold: 20, show_devices: true, max_devices: 10, device_threshold: 15, show_device_names: false, show_frame: true, ...c };
    this._sig = null;
    if (this._src) this._build(); else if (this._hass && !this._inited) this._init();
  }
  set hass(h) {
    this._hass = h;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (!this._inited) this._init(); else this._update();
  }
  connectedCallback() {
    if (!this._ro) this._ro = new ResizeObserver(() => { const w = this.clientWidth; if (w && Math.abs(w - (this._w || 0)) > 4) { this._w = w; this._build(); } });
    this._ro.observe(this);
    clearInterval(this._tk); this._tk = setInterval(() => this._update(true), 30000);
  }
  disconnectedCallback() { this._ro?.disconnect(); clearInterval(this._tk); }
  async _init() {
    this._inited = true;
    let p = { energy_sources: [], device_consumption: [] };
    try { p = await this._hass.callWS({ type: "energy/get_prefs" }); } catch (e) { /* pas de tableau Énergie */ }
    const s = { solar: null, solarE: null, grid: null, expE: null, devices: [] };
    for (const x of p.energy_sources || []) {
      if (x.type === "solar") { s.solar = s.solar || x.stat_rate; s.solarE = s.solarE || x.stat_energy_from; }
      if (x.type === "grid") {
        s.grid = s.grid || x.power_config?.stat_rate || x.stat_rate;
        const to = x.flow_to ? x.flow_to[0]?.stat_energy_to : x.stat_energy_to; s.expE = s.expE || to;
      }
    }
    s.devices = (p.device_consumption || []).filter((d) => d.stat_rate).map((d) => ({ entity: d.stat_rate, name: d.name }));
    this._src = s;
    this._expHist = [];
    const expE = this._c.export_energy || s.expE;
    if (!this._c.export_power && expE) {
      try {
        const st = new Date(Date.now() - 20 * 60000);
        const r = await this._hass.callWS({ type: "history/history_during_period", start_time: st.toISOString(), entity_ids: [expE], minimal_response: true, no_attributes: true, significant_changes_only: false });
        this._expHist = (r[expE] || []).map((x) => ({ t: (x.lu || x.lc) * 1000, v: parseFloat(x.s) })).filter((x) => !isNaN(x.v));
      } catch (e) { /* estimation facultative */ }
    }
    this._build();
  }
  _ent(k) {
    const c = this._c, s = this._src || {};
    return { solar: c.solar_power || s.solar, grid: c.grid_power || s.grid, exp: c.export_power, home: c.home_power, expE: c.export_energy || s.expE,
      solarE: s.solarE, tariff: c.tariff_entity || null }[k];
  }
  _n(id) { if (!id) return NaN; const s = this._hass.states[id]; if (!s) return NaN; let v = parseFloat(s.state); const u = s.attributes.unit_of_measurement; if (u === "kW") v *= 1000; return v; }
  _exportEstimate(imp) {
    const id = this._ent("expE"); if (!id) return 0;
    const s = this._hass.states[id]; const v = s ? parseFloat(s.state) : NaN;
    if (!isNaN(v)) { const t = new Date(s.last_updated).getTime(); const h = this._expHist; if (!h.length || h[h.length - 1].v !== v) h.push({ t, v }); }
    const now = Date.now(); this._expHist = this._expHist.filter((x) => now - x.t < 20 * 60000);
    if (imp > 60) return 0;
    const h = this._expHist; if (h.length < 2) return 0;
    const last = h[h.length - 1]; if (now - last.t > 8 * 60000) return 0; // plus de revente depuis 8 min
    const ref = h.find((x) => last.t - x.t <= 10 * 60000) || h[0];
    if (last.t === ref.t || last.v < ref.v) return 0;
    return ((last.v - ref.v) * 1000) / ((last.t - ref.t) / 3600000);
  }
  _values() {
    const c = this._c, th = Number(c.threshold) || 0;
    let solar = Math.max(0, this._n(this._ent("solar")) || 0);
    let g = this._n(this._ent("grid")); g = isNaN(g) ? 0 : g;
    let imp = Math.max(0, g), exp = g < 0 ? -g : 0, est = false;
    if (c.export_power) exp = Math.max(0, this._n(c.export_power) || 0);
    else if (!(g < 0)) { exp = this._exportEstimate(imp); est = exp > 0; }
    exp = Math.min(exp, solar);
    let home = c.home_power ? this._n(c.home_power) : solar + imp - exp;
    home = Math.max(0, isNaN(home) ? 0 : home);
    const selfUse = Math.max(0, solar - exp);
    const share = home > 0 ? Math.min(1, selfUse / home) : solar > 0 ? 1 : 0;
    return { solar, imp, exp, home, selfUse, share, est, th };
  }
  _gridColor() {
    const c = this._c, t = this._ent("tariff");
    if (!t) return c.grid_color || DEF.grid_color;
    // hc_price : un prix (0.1589) ou une entité qui contient le prix des heures creuses
    const v = parseFloat(this._hass.states[t]?.state);
    const hc = typeof c.hc_price === "string" && c.hc_price.includes(".") && isNaN(Number(c.hc_price)) ? this._n(c.hc_price) : Number(c.hc_price);
    const isHC = !isNaN(v) && !isNaN(hc) && Math.abs(v - hc) < 1e-6;
    this._isHC = isHC;
    return isHC ? c.grid_color || DEF.grid_color : c.grid_hp_color || DEF.grid_hp_color;
  }
  _build() {
    if (!this.shadowRoot || !this._c || !this._src) return;
    const c = this._c, W = Math.max(260, (this._w || this.clientWidth || 400) - 24), H = 96, cy = 30, r = 22;
    const xs = Math.round(W * 0.14), xh = Math.round(W * 0.5), xg = Math.round(W * 0.86);
    const col = { s: c.solar_color || DEF.solar_color, h: c.home_color || DEF.home_color, e: c.export_color || DEF.export_color };
    const cf = c.curve_factor !== undefined ? Number(c.curve_factor) : 1;
    const sag = 10 * cf;
    // chemins : solaire → maison, réseau → maison (import), maison → réseau (export), solaire → réseau (arc)
    const pSH = `M${xs + r + 4},${cy} C${xs + r + 4 + (xh - xs) * 0.35},${cy + sag} ${xh - r - 4 - (xh - xs) * 0.35},${cy + sag} ${xh - r - 4},${cy}`;
    const pGH = `M${xg - r - 4},${cy} C${xg - r - 4 - (xg - xh) * 0.35},${cy + sag} ${xh + r + 4 + (xg - xh) * 0.35},${cy + sag} ${xh + r + 4},${cy}`;
    const pHG = `M${xh + r + 4},${cy} C${xh + r + 4 + (xg - xh) * 0.35},${cy + sag} ${xg - r - 4 - (xg - xh) * 0.35},${cy + sag} ${xg - r - 4},${cy}`;
    const dots = (cls, path, color) => [0, 1, 2].map((i) => `<circle r="3" class="dot ${cls}" style="offset-path:path('${path}');fill:${color};--i:${i}"/>`).join("");
    this.shadowRoot.innerHTML = `
    <style>
      :host { display:block; }
      ha-card { display:block; padding:10px 12px 10px; box-sizing:border-box; height:100%; overflow:hidden; }
      ha-card.noframe { background:none !important; box-shadow:none !important; border:none !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
      ha-card.noframe::before, ha-card.noframe::after { content:none !important; display:none !important; }
      .tt { font-size:14px; font-weight:600; color:var(--primary-text-color); margin:0 0 4px 2px; }
      .flow { position:relative; height:${H}px; }
      svg { position:absolute; inset:0; overflow:visible; }
      .ln { fill:none; stroke-width:2; stroke-linecap:round; opacity:.18; transition:opacity .6s, stroke .6s; }
      .ln.on { opacity:.55; }
      .dot { opacity:0; offset-rotate:0deg; filter:drop-shadow(0 0 4px currentColor); }
      .dot.run { opacity:1; animation:mv var(--d) linear infinite; animation-delay:calc(var(--d) * var(--i) / -3); }
      @keyframes mv { from { offset-distance:0%; } to { offset-distance:100%; } }
      .node { position:absolute; top:0; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; width:${Math.min(120, Math.round(W * 0.3))}px; text-align:center; cursor:pointer; }
      .ic { width:${2 * r}px; height:${2 * r}px; border-radius:50%; display:flex; align-items:center; justify-content:center; position:relative; box-sizing:border-box;
            background:color-mix(in srgb, var(--c) 16%, transparent); color:var(--c); border:1.5px solid color-mix(in srgb, var(--c) 45%, transparent);
            transition:box-shadow .6s, opacity .6s; margin-top:${cy - r}px; }
      .ic ha-icon { --mdc-icon-size:22px; }
      .node.on .ic { box-shadow:0 0 14px color-mix(in srgb, var(--c) 45%, transparent); }
      .node.off .ic { opacity:.45; }
      .home .ic { border:none; background:none; }
      .home .ring { position:absolute; inset:0; border-radius:50%; background:conic-gradient(var(--rs) 0 var(--p), var(--rg) var(--p) 100%);
            -webkit-mask:radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px)); mask:radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px)); transition:background .6s; }
      .home .ic::before { content:""; position:absolute; inset:4px; border-radius:50%; background:color-mix(in srgb, var(--c) 14%, transparent); }
      .v { font-size:15px; font-weight:700; color:var(--primary-text-color); margin-top:4px; white-space:nowrap; font-variant-numeric:tabular-nums; line-height:1.1; }
      .v small { font-size:.66em; font-weight:500; color:var(--secondary-text-color); margin-left:1px; }
      .v .ar { font-size:.8em; margin-right:2px; }
      .s { font-size:11px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; line-height:1.3; }
      .devs { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; padding:6px 1px 1px; margin-top:4px; border-top:1px solid color-mix(in srgb, var(--primary-text-color) 7%, transparent); }
      .devs::-webkit-scrollbar { display:none; }
      .devs:empty { display:none; }
      .dv { flex:none; display:flex; align-items:center; gap:5px; padding:4px 9px 4px 5px; border-radius:999px; cursor:pointer;
            background:color-mix(in srgb, var(--c) calc(8% + var(--a) * 22%), transparent); border:1px solid color-mix(in srgb, var(--c) 30%, transparent); }
      .dv ha-icon { --mdc-icon-size:15px; color:var(--c); width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--c) 20%, transparent); }
      .dv b { font-size:12px; font-weight:600; color:var(--primary-text-color); font-variant-numeric:tabular-nums; white-space:nowrap; }
      .dv i { font-style:normal; font-size:11px; color:var(--secondary-text-color); white-space:nowrap; max-width:90px; overflow:hidden; text-overflow:ellipsis; }
    </style>
    <ha-card class="${c.show_frame === false ? "noframe" : ""}">
      ${c.title ? `<div class="tt">${esc(c.title)}</div>` : ""}
      <div class="flow">
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
          <path id="lSH" class="ln" d="${pSH}" stroke="${col.s}"/><path id="lGH" class="ln" d="${pGH}"/>
          ${dots("dSH", pSH, col.s)}${dots("dGH", pGH, "var(--gc)")}${dots("dHG", pHG, col.e)}
        </svg>
        <div class="node solar" data-e="solar" style="left:${xs}px;--c:${col.s}"><div class="ic"><ha-icon icon="mdi:solar-power-variant"></ha-icon></div><div class="v" id="vS"></div><div class="s" id="sS"></div></div>
        <div class="node home" data-e="home" style="left:${xh}px;--c:${col.h}"><div class="ic"><div class="ring"></div><ha-icon icon="mdi:home-lightning-bolt"></ha-icon></div><div class="v" id="vH"></div><div class="s" id="sH"></div></div>
        <div class="node grid" data-e="grid" style="left:${xg}px"><div class="ic"><ha-icon icon="mdi:transmission-tower"></ha-icon></div><div class="v" id="vG"></div><div class="s" id="sG"></div></div>
      </div>
      <div class="devs"></div>
    </ha-card>`;
    const sr = this.shadowRoot;
    sr.querySelectorAll(".node").forEach((n) => n.addEventListener("click", () => {
      const k = n.dataset.e, id = k === "solar" ? this._ent("solar") : k === "grid" ? this._ent("grid") : this._ent("home") || this._ent("grid");
      if (id) this._more(id);
    }));
    sr.querySelector(".devs").addEventListener("click", (ev) => { const d = ev.target.closest(".dv"); if (d) this._more(d.dataset.e); });
    this._lv = {}; this._devSig = null;
    this._update(true);
  }
  _more(id) { const ev = new Event("hass-more-info", { bubbles: true, composed: true }); ev.detail = { entityId: id }; this.dispatchEvent(ev); }
  _label(key, def) {
    const id = this._c[key];
    if (id === false || id === "none") return "";
    if (id) { const s = this._hass.states[id]; if (!s) return ""; const u = s.attributes.unit_of_measurement || ""; const n = parseFloat(s.state);
      return `${isNaN(n) ? s.state : fr(n, Math.abs(n) < 10 ? 2 : 1)}${u ? " " + u : ""}`; }
    return def;
  }
  _update(force) {
    const sr = this.shadowRoot; if (!sr || !sr.querySelector(".flow") || !this._hass) return;
    const c = this._c, e = this._ent.bind(this);
    const ids = [e("solar"), e("grid"), c.export_power, c.home_power, e("expE"), e("solarE"), e("tariff"), c.solar_label, c.grid_label, c.home_label, ...(this._src?.devices || []).map((d) => d.entity)];
    const sig = ids.map((i) => (i ? this._hass.states[i]?.state : "")).join("|");
    if (!force && sig === this._sig) return;
    this._sig = sig;
    const v = this._values(), gc = this._gridColor();
    const card = sr.querySelector(".flow");
    card.style.setProperty("--gc", gc);
    sr.querySelector(".grid").style.setProperty("--c", v.exp > v.th ? c.export_color || DEF.export_color : gc);
    const set = (id, html) => { const el = sr.getElementById(id); if (el && el.innerHTML !== html) el.innerHTML = html; };
    const w = (x, pre = "") => { const [a, u] = fmtW(x); return `${pre}${a}<small>${u}</small>`; };
    set("vS", w(v.solar));
    const se = e("solarE") ? this._n(e("solarE")) : NaN;
    set("sS", this._label("solar_label", isNaN(se) ? "Solaire" : `${fr(se, 1)} kWh auj.`));
    set("vH", w(v.home));
    set("sH", this._label("home_label", v.home > 0 ? `${fr(v.share * 100, 0)} % solaire` : "Maison"));
    if (v.exp > v.th) set("vG", w(v.exp, `<span class="ar">↑</span>${v.est ? "≈" : ""}`));
    else set("vG", w(v.imp, v.imp > v.th ? `<span class="ar">↓</span>` : ""));
    const tv = e("tariff") ? parseFloat(this._hass.states[e("tariff")]?.state) : NaN;
    set("sG", this._label("grid_label", v.exp > v.th ? "Revente" : !isNaN(tv) ? `${this._isHC ? "HC" : "HP"} · ${fr(tv, 4)} €` : "Réseau"));
    // anneau maison : part solaire / réseau
    const ring = sr.querySelector(".home .ring");
    ring.style.setProperty("--rs", c.solar_color || DEF.solar_color); ring.style.setProperty("--rg", gc);
    ring.style.setProperty("--p", `${Math.round(v.share * 100)}%`);
    if (v.home <= v.th) { ring.style.setProperty("--rs", "rgba(127,127,127,.3)"); ring.style.setProperty("--rg", "rgba(127,127,127,.3)"); }
    // nœuds allumés / éteints
    sr.querySelector(".solar").className = `node solar ${v.solar > v.th ? "on" : "off"}`;
    sr.querySelector(".grid").className = `node grid ${v.imp > v.th || v.exp > v.th ? "on" : "off"}`;
    sr.querySelector(".home").className = `node home ${v.home > v.th ? "on" : ""}`;
    // lignes & points
    sr.getElementById("lSH").classList.toggle("on", v.solar > v.th);
    const lGH = sr.getElementById("lGH"); lGH.classList.toggle("on", v.imp > v.th || v.exp > v.th);
    lGH.setAttribute("stroke", v.exp > v.th ? c.export_color || DEF.export_color : gc);
    const run = (cls, watts) => {
      const L = level(watts, v.th);
      if (this._lv[cls] === L) return; this._lv[cls] = L;
      sr.querySelectorAll("." + cls).forEach((d) => { d.classList.toggle("run", L > 0); if (L) d.style.setProperty("--d", DUR[L] + "s"); });
    };
    run("dSH", v.solar); run("dGH", v.imp); run("dHG", v.exp);
    // appareils actifs
    if (c.show_devices !== false) {
      const list = (Array.isArray(c.devices) && c.devices.length ? c.devices.map((d) => (typeof d === "string" ? { entity: d } : d)) : this._src.devices)
        .map((d) => ({ ...d, w: this._n(d.entity) })).filter((d) => d.w >= (Number(c.device_threshold) || 0))
        .sort((a, b) => b.w - a.w).slice(0, Number(c.max_devices) || 10);
      const mx = Math.max(...list.map((d) => d.w), 1);
      const html = list.map((d) => {
        const name = d.name || this._hass.states[d.entity]?.attributes.friendly_name || d.entity;
        const [a, u] = fmtW(d.w);
        return `<div class="dv" data-e="${esc(d.entity)}" title="${esc(name)}" style="--c:${d.color || c.home_color || DEF.home_color};--a:${(d.w / mx).toFixed(2)}"><ha-icon icon="${d.icon || iconFor(name)}"></ha-icon>${c.show_device_names ? `<i>${esc(name)}</i>` : ""}<b>${a} ${u}</b></div>`;
      }).join("");
      if (html !== this._devSig) { this._devSig = html; sr.querySelector(".devs").innerHTML = html; }
    }
  }
  static getConfigElement() { return document.createElement("holm-power-flow-card-editor"); }
  static getStubConfig() { return {}; }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 6 }; }
}

// ---------------- Éditeur visuel ----------------
const L = { title: "Titre (optionnel)", show_frame: "Afficher le cadre de la carte", threshold: "Seuil d'activité (W)", curve_factor: "Courbure des lignes (0 = droites)",
  solar_power: "Puissance solaire (vide = tableau Énergie)", grid_power: "Puissance réseau (vide = tableau Énergie)", export_power: "Puissance revendue (vide = estimée)",
  home_power: "Puissance maison (vide = calculée)", export_energy: "Énergie revendue pour l'estimation (vide = tableau Énergie)",
  solar_label: "Info sous Solaire (vide = production du jour)", home_label: "Info sous Maison (vide = part solaire)", grid_label: "Info sous Réseau (vide = tarif HC/HP)",
  tariff_entity: "Tarif actuel (couleur HC / HP)", hc_price: "Prix HC (nombre, pour reconnaître les heures creuses)", hc_price_entity: "… ou entité contenant le prix HC",
  show_devices: "Afficher les appareils actifs", show_device_names: "Afficher le nom des appareils", max_devices: "Nombre max d'appareils", device_threshold: "Seuil appareil (W)",
  solar_color: "Couleur solaire", home_color: "Couleur maison / appareils", grid_color: "Couleur réseau (HC)", grid_hp_color: "Couleur réseau (HP)", export_color: "Couleur revente" };
const hex2rgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); if (!m) return undefined; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = (a) => Array.isArray(a) ? "#" + a.map((v) => Number(v).toString(16).padStart(2, "0")).join("") : a;
const S = ["sensor"], ANY = ["sensor", "input_number", "number"];
const COLORS = ["solar_color", "home_color", "grid_color", "grid_hp_color", "export_color"];
const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { type: "grid", name: "", schema: [
    { name: "threshold", selector: { number: { min: 0, max: 500, mode: "box", unit_of_measurement: "W" } } },
    { name: "curve_factor", selector: { number: { min: 0, max: 3, step: 0.5, mode: "slider" } } },
    { name: "show_frame", selector: { boolean: {} } },
  ] },
  { type: "expandable", title: "Capteurs", icon: "mdi:flash", flatten: true, schema: [
    { name: "solar_power", selector: { entity: { domain: S } } }, { name: "grid_power", selector: { entity: { domain: S } } },
    { name: "export_power", selector: { entity: { domain: S } } }, { name: "home_power", selector: { entity: { domain: S } } },
    { name: "export_energy", selector: { entity: { domain: S } } },
  ] },
  { type: "expandable", title: "Infos sous les icônes", icon: "mdi:label-outline", flatten: true, schema: [
    { name: "solar_label", selector: { entity: {} } }, { name: "home_label", selector: { entity: {} } }, { name: "grid_label", selector: { entity: {} } },
    { name: "tariff_entity", selector: { entity: { domain: ANY } } },
    { type: "grid", name: "", schema: [ { name: "hc_price", selector: { number: { min: 0, max: 2, step: 0.0001, mode: "box" } } }, { name: "hc_price_entity", selector: { entity: { domain: ANY } } } ] },
  ] },
  { type: "expandable", title: "Appareils actifs", icon: "mdi:power-plug", flatten: true, schema: [
    { type: "grid", name: "", schema: [
      { name: "show_devices", selector: { boolean: {} } }, { name: "show_device_names", selector: { boolean: {} } },
      { name: "max_devices", selector: { number: { min: 1, max: 30, mode: "box" } } }, { name: "device_threshold", selector: { number: { min: 0, max: 1000, mode: "box", unit_of_measurement: "W" } } },
    ] },
  ] },
  { type: "expandable", title: "Couleurs", icon: "mdi:palette", flatten: true, schema: [ { type: "grid", name: "", schema: COLORS.map((n) => ({ name: n, selector: { color_rgb: {} } })) } ] },
];
const DEFAULTS = { threshold: 20, curve_factor: 1, show_devices: true, max_devices: 10, device_threshold: 15, show_device_names: false, show_frame: true };
class HolmPowerFlowCardEditor extends HTMLElement {
  setConfig(c) { const j = JSON.stringify(c); this._config = JSON.parse(j); if (j === this._last && this._f) return; this._build(); }
  set hass(h) { this._hass = h; if (!this._f) this._build(); else this._f.hass = h; }
  _build() {
    if (!this._hass || !this._config) return;
    const c = this._config, data = { ...DEFAULTS, ...c };
    for (const k of COLORS) data[k] = hex2rgb(c[k] || DEF[k]);
    if (typeof c.hc_price === "string" && isNaN(Number(c.hc_price))) { data.hc_price_entity = c.hc_price; delete data.hc_price; }
    this.innerHTML = "";
    const f = (this._f = document.createElement("ha-form"));
    f.hass = this._hass; f.schema = SCHEMA; f.data = data; f.computeLabel = (s) => L[s.name] || s.name;
    f.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const v = ev.detail.value, o = { ...this._config };
      for (const [k, val] of Object.entries(v)) {
        if (COLORS.includes(k)) { const h = rgb2hex(val); if (!h || h === DEF[k]) delete o[k]; else o[k] = h; continue; }
        if (k === "hc_price_entity") { if (val) o.hc_price = val; else if (typeof o.hc_price === "string") delete o.hc_price; continue; }
        if (k === "hc_price" && (val === "" || val == null) && typeof o.hc_price === "string") continue;
        if (val === "" || val === undefined || val === null || DEFAULTS[k] === val) delete o[k]; else o[k] = val;
      }
      this._config = o; this._last = JSON.stringify(o);
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: o }, bubbles: true, composed: true }));
    });
    this.appendChild(f);
  }
}
if (!customElements.get("holm-power-flow-card-editor")) customElements.define("holm-power-flow-card-editor", HolmPowerFlowCardEditor);
if (!customElements.get("holm-power-flow-card")) customElements.define("holm-power-flow-card", HolmPowerFlowCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "holm-power-flow-card", name: "HOLM – Flux de puissance compact", description: "Solaire → Maison ⇄ Réseau en temps réel, horizontal et compact, avec les appareils actifs", preview: false });
console.info(`%c HOLM-POWER-FLOW %c ${VERSION} `, "background:#e3a21a;color:#111;border-radius:3px 0 0 3px", "background:#123;color:#fff;border-radius:0 3px 3px 0");
})();
