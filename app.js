(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const F = window.CarFilters;
  const SELECTS = ["condition", "brand", "model", "year_from", "year_to", "body", "drive", "fuel"];
  const PRICES = ["price_from", "price_to"];
  const el = (id) => document.getElementById(id === "brand" ? "brand-select" : id);

  let cars = [];
  const state = {};

  function readPrefill() {
    try {
      const raw = new URLSearchParams(location.search).get("s");
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  async function load() {
    const v = new URLSearchParams(location.search).get("v") || Date.now();
    const [config, data] = await Promise.all([
      fetch(`config.json?v=${v}`).then((r) => r.json()),
      fetch(`cars.json?v=${v}`).then((r) => r.json()),
    ]);
    applyConfig(config);
    cars = data.cars.map((row) => Object.fromEntries(data.fields.map((f, i) => [f, row[i]])));

    // Prefill from the previous search; values that are no longer in the base are dropped.
    const pre = readPrefill();
    for (const k of SELECTS) {
      if (pre[k] !== undefined && pre[k] !== "") state[k] = k.startsWith("year") ? Number(pre[k]) : String(pre[k]);
    }
    for (const k of PRICES) if (Number(pre[k]) > 0) state[k] = Number(pre[k]);
    for (const k of SELECTS) {
      if (state[k] !== undefined && !F.options(cars, state, k).includes(state[k])) delete state[k];
    }
    if (!state.brand) delete state.model;
    render();
  }

  function applyConfig(c) {
    if (c.accent) document.documentElement.style.setProperty("--accent", c.accent);
    if (c.title) {
      document.getElementById("brand").textContent = c.title;
      document.title = c.title;
    }
    if (c.bot_username) document.getElementById("bot").textContent = "@" + c.bot_username;
    if (tg) {
      try {
        tg.setHeaderColor("#23272b");
        tg.setBackgroundColor("#2b2f33");
        tg.setBottomBarColor && tg.setBottomBarColor("#2b2f33");
      } catch (e) { /* older Telegram clients */ }
    }
  }

  function fillSelect(select, values, current, placeholder) {
    const opts = [`<option value="">${placeholder}</option>`];
    if (current !== undefined && !values.includes(current)) values = [current, ...values];
    for (const v of values) {
      const sel = v === current ? " selected" : "";
      opts.push(`<option value="${escapeHtml(String(v))}"${sel}>${escapeHtml(String(v))}</option>`);
    }
    select.innerHTML = opts.join("");
    select.classList.toggle("is-set", current !== undefined);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const fmt = (n) => n.toLocaleString("uk-UA").replace(/ /g, " ");

  function render() {
    for (const k of SELECTS) {
      const placeholder = k.startsWith("year") ? "Оберіть" : "Оберіть зі списку";
      fillSelect(el(k), F.options(cars, state, k), state[k], placeholder);
    }
    el("model").disabled = !state.brand;
    if (!state.brand) el("model").options[0].textContent = "Спочатку марку";

    const range = F.priceRange(cars, state);
    el("price_from").placeholder = range ? fmt(range.min) : "";
    el("price_to").placeholder = range ? fmt(range.max) : "";
    for (const k of PRICES) el(k).classList.toggle("is-set", !!state[k]);

    const anySet = Object.keys(state).length > 0;
    const n = F.count(cars, state);
    const countEl = document.getElementById("count");
    countEl.textContent = anySet ? `Підібрано ${fmt(n)} авто` : "";
    countEl.classList.toggle("is-zero", anySet && n === 0);
    document.getElementById("reset").hidden = !anySet;

    const required = !!(state.condition || state.brand);
    document.getElementById("submit").disabled = !(required && n > 0);
    document.getElementById("hint").textContent = !required
      ? "Оберіть стан або марку"
      : n === 0 ? "Нічого не знайдено — змініть ціну" : "";
  }

  function onSelect(e) {
    const k = e.target.dataset.field;
    const v = e.target.value;
    if (v === "") delete state[k];
    else state[k] = k.startsWith("year") ? Number(v) : v;
    if (k === "brand") delete state.model;
    render();
  }

  function onPrice(e) {
    const k = e.target.dataset.field;
    const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
    if (digits) {
      state[k] = Number(digits);
      e.target.value = fmt(state[k]);
    } else {
      delete state[k];
      e.target.value = "";
    }
    render();
  }

  function reset() {
    for (const k of Object.keys(state)) delete state[k];
    for (const k of PRICES) el(k).value = "";
    render();
  }

  function submit() {
    const payload = JSON.stringify(state);
    if (tg && tg.sendData) tg.sendData(payload); // Telegram closes the Mini App after this
    else alert("Без Telegram: " + payload);
  }

  for (const k of SELECTS) el(k).addEventListener("change", onSelect);
  for (const k of PRICES) el(k).addEventListener("input", onPrice);
  document.getElementById("reset").addEventListener("click", reset);
  document.getElementById("submit").addEventListener("click", submit);

  if (tg) {
    tg.ready();
    tg.expand();
  }
  load().then(() => {
    for (const k of PRICES) if (state[k]) el(k).value = fmt(state[k]);
  }).catch(() => {
    document.getElementById("count").textContent = "Не вдалося завантажити каталог. Спробуйте пізніше.";
  });
})();
