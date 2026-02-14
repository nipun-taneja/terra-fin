Terra30 Backend (Skeleton)

Setup:
  python -m venv .venv
  (Windows) .venv\Scripts\activate
  pip install -r requirements.txt

Run:
  python scripts/init_data.py
  python scripts/run_enrich.py

Outputs in /data:
  farms.csv, fields.csv, fields_seasons.csv, management_events.csv
  weather_daily.csv, estimates.csv
