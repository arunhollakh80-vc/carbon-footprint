# Carbon Footprint Estimation and Recommendation System

Mini project, scoped to cars: it estimates the yearly carbon footprint of a **BMW or
Mercedes-Benz** car from the model and the owner's travel pattern (distance, city or highway
driving), and gives personalised suggestions to reduce it.

ML approach: **regression + clustering + rule-based recommendation (hybrid)**.

| Part | Language | Where |
|---|---|---|
| Data preparation, ML models, estimator, API | Python | `python/` |
| Console application | Java | `java/` |
| Website (estimator, recommendations, database) and project-details page | HTML, CSS, JavaScript | `web/` |
| Database and analysis queries | SQL (SQLite) | `sql/` |

All three estimators (Python, Java, JavaScript) use the same formulas and give the same
result. `node tests/check_consistency.js` checks this.

## Run it in VS Code

1. Open this folder in VS Code (File > Open Folder).
2. Install the extensions "Python" (Microsoft) and "Extension Pack for Java" (Microsoft).
   You need Python 3.10+ and, for the Java part, JDK 11+.
3. Open a terminal (Terminal > New Terminal) and run:

```
python -m venv .venv
.venv\Scripts\activate          (Windows)      source .venv/bin/activate   (Mac/Linux)
pip install -r requirements.txt
python run_all.py
```

`run_all.py` prepares the data, trains the models, exports the website data and builds
the database. After that:

| What | Command |
|---|---|
| Terminal estimator (Python) | `python python/3_estimate_cli.py` (add `--demo` for a sample) |
| Website | `python python/app.py`, then open http://127.0.0.1:5000 |
| Website without a server | double-click `web/index.html` |
| Java console app | `javac -d java/out java/CarbonFootprintApp.java` then `java -cp java/out CarbonFootprintApp` |
| SQL analysis | `python sql/build_database.py` |

The Run and Debug panel (Ctrl+Shift+D) also has these as ready-made launch entries.

## The website

- `web/index.html` is the main page, styled like a car configurator in the dark and gold
  look of the original BMW_Mercedes_Carbon_Emission_Analysis.html: model picker with search,
  sliders for distance and city driving, the car on a showroom stage, a CO2 gauge, result
  tiles, ranked recommendations, cleaner cars in the same class, and the model database with
  filters, sorting, a details window and CSV export. Choices are remembered in the browser.
- Fonts (Bodoni Moda and Manrope) load from Google Fonts when online; offline the page
  falls back to Georgia and Arial.
- `web/details.html` holds everything else for evaluators: all 386 models, the laboratory
  against road comparison, the ML results, the CO2 predictor and the data sources.
- The car pictures are illustrations drawn by the page for each body type. To show real
  photos, add your own files as described in `web/images/README.txt`.

## Datasets

| Dataset | Role | Link |
|---|---|---|
| CO2 Emission by Vehicles (`CO2_Emissions_Canada.csv`) | **Main dataset.** 7,385 rated vehicles, 12 columns. 946 rows are BMW or Mercedes-Benz, 866 after removing duplicates. | https://www.kaggle.com/datasets/debajyotipodder/co2-emission-by-vehicles |
| Fuel consumption ratings, Government of Canada | Original source of the main dataset | https://open.canada.ca/data/en/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64 |
| `2024_Cars_Aggregated.csv` (EU real-world OBFCM vs WLTP) | Second dataset: 39 BMW / Mercedes-Benz fleet records, 2021 to 2024. Used for the "laboratory vs road" analysis. | supplied file, saved as `data/eu_obfcm_bmw_mercedes_2021_2024.csv` |

## How it works

**1. Estimation.** The dataset rates each car in city driving and in highway driving. The
user gives the distance and the share of city driving, and the ratings are blended:

```
fuel (L/100 km) = share x city fuel + (1 - share) x highway fuel
CO2 (g/km)      = rated CO2 x fuel / combined fuel
yearly CO2      = CO2 x km per year        yearly fuel cost = litres x price per litre
```

At 55% city driving this equals the official combined rating.

**2. Regression** (`python/2_train_models.py`): predicts the CO2 rating of a car. Linear
Regression, Random Forest and Gradient Boosting are compared with 5-fold cross-validation.
The split is by model name, so test cars are never seen in training.

| Inputs | Best algorithm | Test R2 | Test MAE |
|---|---|---|---|
| Specifications only (engine, cylinders, class, transmission, fuel, brand) | Gradient Boosting | 0.90 | 10.0 g/km |
| Specifications + fuel consumption | Linear Regression | 0.99 | 2.4 g/km |

The second model is near perfect because CO2 is physically proportional to fuel burned
(about 23.2 g/km per L/100 km of petrol). The first one is the useful one: it predicts a
rating when fuel consumption is not known.

**3. Clustering**: K-Means (k = 3) on engine size, cylinders, fuel consumption and CO2 groups
the 386 model variants into Low (avg 209 g/km), Medium (249) and High (321) emission tiers.
Silhouette score 0.53. k = 2 and k = 6 score slightly higher (0.59); three was chosen because
it reads naturally as low / medium / high.

**4. Recommendation (hybrid)**

- Data-driven: finds the cleanest BMW or Mercedes-Benz model in the same vehicle class as
  the user's car and calculates the yearly CO2 and fuel-cost saving for the user's driving.
- Rule-based: driving-habit rules (move trips to bus or metro, drive smoothly, combine short
  trips, avoid rush-hour traffic). Each rule calculates its own saving, and tips are ranked.

Charts are saved in `reports/`, numbers in `reports/metrics.json`.

## Limitations (say these in your viva)

- Car ratings are laboratory tailpipe CO2 for the Canadian market (model years 2014 to 2020).
  Real driving emits more: the EU data shows about 20 to 25% more for petrol and diesel.
- Electric and plug-in hybrid cars are not in the main dataset.
- The 10% eco-driving saving and the bus factor (0.10 kg per passenger-km) are approximate
  and can be changed in `data/emission_factors.csv`. The default fuel price of 100 rupees per
  litre is a placeholder the user adjusts.
- Fuel-cost savings count fuel only (for example, not the bus fare).
- The bands (Low under 1.5 t, Moderate under 3 t, High under 5 t) are defined by this
  project, not an official standard.

## Folder structure

```
data/         main CSV, EU fleet CSV, emission factors, processed/ (generated)
python/       1_prepare_data, 2_train_models, 3_estimate_cli, 4_export_web_data, footprint, app
java/         CarbonFootprintApp.java
web/          index.html + app.css + app.js   the app the user sees
              details.html + details.css + details.js   data, models and method
              footprint.js (formulas), data.js (generated), images/ (optional photos)
sql/          schema.sql, queries.sql, build_database.py
reports/      charts and metrics (generated)
models/       trained models (generated by step 2)
tests/        check_consistency.js
```
