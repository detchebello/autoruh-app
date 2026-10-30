// Search rules for the Mini App. Same rules as bot/catalog.py (matches) — keep both in sync.
(function (root) {
  const TEXT_KEYS = ["condition", "brand", "model", "body", "drive", "fuel"];

  function matches(car, s, skip) {
    for (const k of TEXT_KEYS) {
      if (k !== skip && s[k] && car[k] !== s[k]) return false;
    }
    if (skip !== "year") {
      if (s.year_from && car.year < s.year_from) return false;
      if (s.year_to && car.year > s.year_to) return false;
    }
    if (skip !== "price") {
      if (s.price_from && car.price < s.price_from) return false;
      if (s.price_to && car.price > s.price_to) return false;
    }
    return true;
  }

  const byText = (a, b) => String(a).localeCompare(String(b), "uk", { sensitivity: "base", numeric: true });

  // Values of `field` that still give at least one car with every OTHER filter applied.
  function options(cars, s, field) {
    const skip = field === "year_from" || field === "year_to" ? "year" : field;
    const key = skip === "year" ? "year" : field;
    const values = new Set();
    for (const c of cars) if (matches(c, s, skip)) values.add(c[key]);
    let list = [...values];
    if (key === "year") {
      list.sort((a, b) => a - b);
      if (field === "year_from" && s.year_to) list = list.filter((y) => y <= s.year_to);
      if (field === "year_to" && s.year_from) list = list.filter((y) => y >= s.year_from);
    } else {
      list.sort(byText);
    }
    return list;
  }

  function priceRange(cars, s) {
    let min = Infinity, max = 0;
    for (const c of cars) {
      if (!matches(c, s, "price")) continue;
      if (c.price < min) min = c.price;
      if (c.price > max) max = c.price;
    }
    return max ? { min, max } : null;
  }

  function count(cars, s) {
    let n = 0;
    for (const c of cars) if (matches(c, s)) n++;
    return n;
  }

  const api = { matches, options, priceRange, count };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CarFilters = api;
})(this);
