# FarmFlo Simulation Studio — Python Training Project

Data access, synthetic simulation, and model training for FarmFlo Simulation Studio.

## Setup

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Data sources

All three sources are queried live and cached locally under `data/cache/`. That folder is not committed; run the scripts below to regenerate it.

### COSMOS UK

Soil moisture, rainfall, temperature, humidity, and radiation from the UK Centre for Ecology and Hydrology's network of monitoring sites across the UK, recording since 2013. Published under the Open Government Licence and queried live from `https://cosmos-api.ceh.ac.uk`. This is the primary ground truth for soil moisture in this project.

Run with:

```
python src/data_access/cosmos_uk.py
```

### NASA POWER

Temperature, rainfall, humidity, and radiation reference data from NASA's Prediction Of Worldwide Energy Resources project, queried live from `https://power.larc.nasa.gov/api`. Public domain, no licence restriction.

Run with:

```
python src/data_access/nasa_power.py
```

### Open Meteo

Temperature, rainfall, humidity, and radiation reference data from Open Meteo's historical weather archive, which blends ERA5 and ERA5 Land reanalysis, queried live from `https://archive-api.open-meteo.com`. Free for non-commercial use under the Open Meteo terms, attribution required.

Run with:

```
python src/data_access/open_meteo.py
```

### Building the combined dataset

```
python src/data_access/build_dataset.py
```

This selects a representative spread of COSMOS UK sites, fetches their full recorded history alongside matching NASA POWER and Open Meteo data for the same coordinates and dates, and writes the merged result to `data/cache/farmflo_uk_dataset.csv`.
