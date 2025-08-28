# Weather Now (Open-Meteo)

A tiny React app to quickly check current weather for any city.

## Tech
- React (hooks & built-in state)
- Open-Meteo Geocoding + Forecast APIs (no key)
- Tailwind-like utility classes (no external dependency required to run)

## Features
- City search with disambiguation (choose from matches)
- Current conditions (temp, feels like, humidity, wind speed/dir, day/night + WMO code)
- °C/°F toggle (persisted)
- “Use my location” (geolocation)
- Recent searches (persisted)
- Graceful error states and loading indicators
- Accessible and responsive

## How it works
1. Geocode city: `https://geocoding-api.open-meteo.com/v1/search?name=...`
2. Select a result → fetch current weather:
   `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day&timezone=auto`

## Run locally
```bash
npm create vite@latest weather-now -- --template react
cd weather-now
npm install
# replace src/App.jsx with this repo's App.jsx
npm run dev
