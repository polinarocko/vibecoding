# 🌤️ Weather Forecast

A beautiful, real-time weather app built with **Next.js 16**, **React 19**, and **Leaflet** — featuring an interactive temperature heatmap, live wind arrows, and a 7-day forecast.

---

## ✨ Features

| | |
|---|---|
| 🗺️ **Interactive Map** | Pan and zoom a live temperature heatmap powered by IDW interpolation |
| 💨 **Wind Overlay** | Real-time wind direction arrows drawn on canvas, updated on every zoom |
| 📅 **7-Day Forecast** | Daily high/low, precipitation, and weather condition cards |
| 🔍 **City Search** | Search any city worldwide via the geocoding API |
| 📍 **Geolocation** | Automatically loads weather for your current location |
| 🖱️ **Click for Weather** | Click anywhere on the map to pin a weather marker |
| ⚡ **Request Caching** | In-memory cache prevents redundant API calls |
| 🌙 **Dark Mode** | Full dark mode support via Tailwind CSS |

---

## 📸 Pages

### 🗺️ Map — `/`
A full-screen interactive weather map with a temperature heatmap and wind arrows. Toggle each layer independently. Click anywhere to drop a weather pin.

### 📅 Forecast — `/forecast`
Current conditions at a glance plus a scrollable 7-day forecast with daily highs/lows, precipitation, and weather icons.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack

- **[Next.js 16](https://nextjs.org/)** — App Router, file-based routing, dynamic imports
- **[React 19](https://react.dev/)** — Hooks, Context API, `useCallback`, `useRef`
- **[Leaflet](https://leafletjs.com/) + [React Leaflet](https://react-leaflet.js.org/)** — Interactive map with custom canvas overlay layers
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first styling with dark mode
- **[Open-Meteo API](https://open-meteo.com/)** — Free, open-source weather & geocoding API

---

## 🗂️ Project Structure

```
src/app/
├── page.js                  # Map page (/)
├── forecast/
│   └── page.js              # Forecast page (/forecast)
├── components/
│   ├── WeatherProvider.js   # Shared context — state, fetching, caching
│   ├── Header.js            # Sticky header with nav tabs and search
│   └── WeatherMap.js        # Interactive map with heatmap + wind overlay
├── layout.js                # Root layout with WeatherProvider + Header
└── globals.css
```

---

## 🌐 Data Sources

All weather data is provided by **[Open-Meteo](https://open-meteo.com/)** — a free, open-source weather API with no API key required.

- Current conditions: temperature, weather code, wind speed & direction, humidity
- Daily forecast: high/low temps, precipitation, weather code
- Geocoding: city name → coordinates

---

## 📄 License

MIT
