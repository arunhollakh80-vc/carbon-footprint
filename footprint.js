/*
 * Car footprint estimation and recommendation logic (JavaScript version).
 * Same formulas as python/footprint.py and java/CarbonFootprintApp.java.
 * No DOM code here, so it can also be tested with Node (see tests/check_consistency.js).
 */
(function (root) {
  const DEFAULT_PROFILE = { km_month: 1000, city_share: 55, fuel_price: 100 };

  /** Fuel (L/100 km) and CO2 (g/km) of a car for a given % of city driving. */
  function blended(car, cityShare) {
    const s = Math.min(100, Math.max(0, cityShare)) / 100;
    const fuel = s * car.fuel_city + (1 - s) * car.fuel_hwy;
    return { fuel, co2: car.co2_g_km * fuel / car.fuel_comb };
  }

  /** Project-defined bands for the yearly CO2 of one car. */
  function band(totalKg) {
    if (totalKg < 1500) return "Low";
    if (totalKg < 3000) return "Moderate";
    if (totalKg < 5000) return "High";
    return "Very high";
  }

  /** Yearly CO2 (kg), fuel (litres) and fuel cost of the car. */
  function estimate(p, car) {
    const s = Math.min(100, Math.max(0, p.city_share)) / 100;
    const kmYear = p.km_month * 12;
    const b = blended(car, p.city_share);
    const perLitre = car.co2_g_km / car.fuel_comb;
    const city = s * kmYear * car.fuel_city * perLitre / 1000;
    const hwy = (1 - s) * kmYear * car.fuel_hwy * perLitre / 1000;
    const litres = b.fuel * kmYear / 100;
    return {
      co2: b.co2, fuel: b.fuel, parts: { "City driving": city, "Highway driving": hwy },
      total: city + hwy, litres, cost: litres * p.fuel_price, band: band(city + hwy),
    };
  }

  /** Cleanest car in the same class (E85 flex-fuel ratings are skipped). */
  function bestAlternative(car, models) {
    let best = null;
    for (const v of models) {
      if (v.vehicle_class !== car.vehicle_class || v.fuel_type === "E" || v.co2_g_km >= car.co2_g_km) continue;
      if (!best || v.co2_g_km < best.co2_g_km || (v.co2_g_km === best.co2_g_km && v.id < best.id)) best = v;
    }
    return best;
  }

  const classLabel = c => (c.charAt(0) + c.slice(1).toLowerCase()).replace(/suv/i, "SUV");

  /** Suggestions sorted by yearly CO2 saving. Each has kg and rupees saved. */
  function recommend(p, car, models, f) {
    const kmYear = p.km_month * 12;
    const b = blended(car, p.city_share);
    const totalKg = b.co2 * kmYear / 1000;
    const cost = b.fuel * kmYear / 100 * p.fuel_price;
    const tips = [];
    const add = (title, tip, kg, rupees, kind) => { if (kg > 0.5) tips.push({ title, tip, kg, rupees, kind }); };

    const alt = bestAlternative(car, models);
    if (alt) {
      const a = blended(alt, p.city_share);
      add("Choose a cleaner car next time",
        `In the same class, the ${alt.make} ${alt.model} is rated ${alt.co2_g_km} g/km against ${car.co2_g_km} g/km for your ${car.make} ${car.model}.`,
        (b.co2 - a.co2) * kmYear / 1000, (b.fuel - a.fuel) * kmYear / 100 * p.fuel_price, "car");
    }
    if (p.km_month >= 800) add("Move one trip in five to bus or metro",
      "You drive a lot. Taking the bus or metro for a fifth of your kilometres still cuts emissions after counting the bus.",
      0.20 * kmYear * (b.co2 / 1000 - f.bus), 0.20 * cost, "habit");
    add("Drive smoothly",
      "Accelerate gently, keep the tyres at the right pressure and switch off instead of idling. This saves about a tenth of your fuel.",
      f.eco_driving * totalKg, f.eco_driving * cost, "habit");
    add("Combine short trips", "Plan errands into one round and skip one drive in ten.", 0.10 * totalKg, 0.10 * cost, "habit");
    if (p.city_share >= 70) {
      const cityLike = car.co2_g_km * car.fuel_city / car.fuel_comb, hwyLike = car.co2_g_km * car.fuel_hwy / car.fuel_comb;
      add("Avoid rush-hour traffic",
        `Your car emits ${cityLike.toFixed(0)} g/km in city traffic and ${hwyLike.toFixed(0)} g/km on open roads. ` +
        "Shifting a tenth of your city driving to free-flowing hours or routes narrows that gap.",
        0.10 * (p.city_share / 100) * kmYear * (cityLike - hwyLike) / 1000,
        0.10 * (p.city_share / 100) * kmYear * (car.fuel_city - car.fuel_hwy) / 100 * p.fuel_price, "habit");
    }
    return tips.sort((x, y) => y.kg - x.kg);
  }

  const api = { DEFAULT_PROFILE, blended, band, estimate, bestAlternative, recommend, classLabel };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Footprint = api;
})(typeof window !== "undefined" ? window : globalThis);
