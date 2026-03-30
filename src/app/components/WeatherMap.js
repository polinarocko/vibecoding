"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const WEATHER_CODES = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌧️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Moderate snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Slight showers", icon: "🌦️" },
  81: { label: "Moderate showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm + hail", icon: "⛈️" },
  99: { label: "Thunderstorm + heavy hail", icon: "⛈️" },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { label: "Unknown", icon: "❓" };
}

function createWeatherIcon(emoji) {
  return L.divIcon({
    html: `<div style="font-size:28px;text-align:center;line-height:1;">${emoji}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Temperature to RGBA colour (blue→cyan→green→yellow→orange→red)
function tempToRGBA(temp, alpha) {
  const t = Math.max(-20, Math.min(45, temp));
  const ratio = (t + 20) / 65;
  const stops = [
    [0.0, 40, 70, 200],
    [0.2, 60, 160, 240],
    [0.35, 50, 200, 180],
    [0.5, 80, 200, 60],
    [0.65, 220, 220, 40],
    [0.8, 240, 150, 30],
    [1.0, 220, 40, 40],
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (ratio >= stops[i][0] && ratio <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const f = (ratio - lo[0]) / (hi[0] - lo[0] || 1);
  return [
    Math.round(lo[1] + (hi[1] - lo[1]) * f),
    Math.round(lo[2] + (hi[2] - lo[2]) * f),
    Math.round(lo[3] + (hi[3] - lo[3]) * f),
    alpha,
  ];
}

function tempToCSS(temp) {
  const [r, g, b] = tempToRGBA(temp, 255);
  return `rgb(${r},${g},${b})`;
}

// IDW (Inverse Distance Weighting) interpolation
function idwInterpolate(px, py, points, power) {
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < points.length; i++) {
    const dx = px - points[i].x;
    const dy = py - points[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return points[i].temp;
    const w = 1 / Math.pow(dist, power);
    numerator += w * points[i].temp;
    denominator += w;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

const heatmapCache = new Map();

// Draw an arrow on canvas from (x,y) in direction (dx,dy) of given length
function drawArrow(ctx, x, y, dx, dy, len) {
  const ex = x + dx * len;
  const ey = y + dy * len;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  const headLen = 6;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

// Canvas overlay that paints a smooth interpolated temperature heatmap and wind arrows
function HeatmapOverlay({ show, showWind }) {
  const map = useMap();
  const canvasLayerRef = useRef(null);
  const dataRef = useRef([]);
  const fetchControllerRef = useRef(null);
  const debounceRef = useRef(null);

  const drawOverlay = useCallback(() => {
    if (!canvasLayerRef.current || !dataRef.current.length) return;
    const overlay = canvasLayerRef.current;
    const canvas = overlay.getContainer();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
    ctx.clearRect(0, 0, size.x, size.y);

    if (show) {
      // Convert data points to pixel coords
      const pixelPoints = dataRef.current.map((d) => {
        const pt = map.latLngToContainerPoint([d.lat, d.lon]);
        return { x: pt.x, y: pt.y, temp: d.temp };
      });

      // Render at lower resolution for performance, then scale up
      const scale = 4;
      const w = Math.ceil(size.x / scale);
      const h = Math.ceil(size.y / scale);
      const imgData = ctx.createImageData(w, h);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const temp = idwInterpolate(x * scale, y * scale, pixelPoints, 2.5);
          const [r, g, b, a] = tempToRGBA(temp, 120);
          const idx = (y * w + x) * 4;
          imgData.data[idx] = r;
          imgData.data[idx + 1] = g;
          imgData.data[idx + 2] = b;
          imgData.data[idx + 3] = a;
        }
      }

      // Draw at small size then scale up for smooth look
      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      offscreen.getContext("2d").putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(offscreen, 0, 0, size.x, size.y);
    }

    // Wind arrows
    if (showWind) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      dataRef.current.forEach((d) => {
        if (d.windSpeed == null || d.windDir == null) return;
        const pt = map.latLngToContainerPoint([d.lat, d.lon]);
        const len = Math.min(d.windSpeed * 1.2, 40);
        if (len < 2) return;
        // wind_direction is FROM, so arrow points in opposite direction
        const dx = -Math.sin(d.windDir * Math.PI / 180);
        const dy = Math.cos(d.windDir * Math.PI / 180);
        drawArrow(ctx, pt.x, pt.y, dx, dy, len);
      });
    }
  }, [map, show, showWind]);

  const fetchAndDraw = useCallback(async () => {
    if (fetchControllerRef.current) fetchControllerRef.current.abort();
    fetchControllerRef.current = new AbortController();

    const bounds = map.getBounds();
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    // Build grid — 7x7 = 49 points
    const steps = 7;
    const latStep = (north - south) / (steps - 1);
    const lonStep = (east - west) / (steps - 1);
    const points = [];
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        points.push({
          lat: south + latStep * i,
          lon: west + lonStep * j,
        });
      }
    }

    const lats = points.map((p) => p.lat.toFixed(2)).join(",");
    const lons = points.map((p) => p.lon.toFixed(2)).join(",");
    const cacheKey = `${lats}|${lons}`;

    if (heatmapCache.has(cacheKey)) {
      dataRef.current = heatmapCache.get(cacheKey);
      drawOverlay();
      return;
    }

    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=auto`,
        { signal: fetchControllerRef.current.signal }
      );
      if (!res.ok) return;
      const data = await res.json();
      const results = Array.isArray(data) ? data : [data];
      const parsed = results.map((d, idx) => ({
        lat: points[idx].lat,
        lon: points[idx].lon,
        temp: d.current.temperature_2m,
        windSpeed: d.current.wind_speed_10m,
        windDir: d.current.wind_direction_10m,
      }));
      heatmapCache.set(cacheKey, parsed);
      dataRef.current = parsed;
      drawOverlay();
    } catch {
      // ignore aborted fetches
    }
  }, [map, drawOverlay]);

  // Debounced fetch on map move
  const scheduleFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchAndDraw, 600);
  }, [fetchAndDraw]);

  useMapEvents({
    moveend: () => {
      drawOverlay(); // redraw immediately with existing data
      scheduleFetch(); // then fetch new data
    },
    zoomend: () => {
      fetchAndDraw();
    },
    resize: drawOverlay,
  });

  // Create canvas overlay layer
  useEffect(() => {
    const CanvasOverlay = L.Layer.extend({
      onAdd(map) {
        this._map = map;
        const canvas = L.DomUtil.create("canvas", "leaflet-overlay-pane");
        const size = map.getSize();
        canvas.width = size.x;
        canvas.height = size.y;
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "400";
        map.getPanes().overlayPane.appendChild(canvas);
        this._canvas = canvas;

        // Keep canvas position synced with map panning
        map.on("move", this._updatePosition, this);
        this._updatePosition();
      },
      onRemove(map) {
        if (this._canvas && this._canvas.parentNode) {
          this._canvas.parentNode.removeChild(this._canvas);
        }
        map.off("move", this._updatePosition, this);
      },
      getContainer() {
        return this._canvas;
      },
      _updatePosition() {
        if (!this._canvas || !this._map) return;
        const topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
      },
    });

    const overlay = new CanvasOverlay();
    overlay.addTo(map);
    canvasLayerRef.current = overlay;

    fetchAndDraw();

    return () => {
      if (canvasLayerRef.current) map.removeLayer(canvasLayerRef.current);
    };
  }, [map, fetchAndDraw]);

  // Redraw when show toggles
  useEffect(() => {
    drawOverlay();
  }, [show, showWind, drawOverlay]);

  return null;
}

function FlyToLocation({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function WeatherMap({ lat, lon, onLocationSelect }) {
  const [markers, setMarkers] = useState([]);
  const [mapCenter, setMapCenter] = useState([lat || 40.71, lon || -74.01]);
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showWind, setShowWind] = useState(true);
  const clickTimeoutRef = useRef(null);
  const lastExternalCoords = useRef({ lat, lon });
  const isMapClick = useRef(false);

  useEffect(() => {
    if (
      lat && lon &&
      !isMapClick.current &&
      (lat !== lastExternalCoords.current.lat || lon !== lastExternalCoords.current.lon)
    ) {
      lastExternalCoords.current = { lat, lon };
      setMapCenter([lat, lon]);
    }
    isMapClick.current = false;
  }, [lat, lon]);

  async function fetchMarkerWeather(clickLat, clickLon) {
    const exists = markers.some(
      (m) => Math.abs(m.lat - clickLat) < 0.05 && Math.abs(m.lon - clickLon) < 0.05
    );
    if (exists || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${clickLat}&longitude=${clickLon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`
      );
      if (!res.ok) return;
      const data = await res.json();
      const info = getWeatherInfo(data.current.weather_code);

      setMarkers((prev) => [
        ...prev.slice(-9),
        {
          id: Date.now(),
          lat: clickLat,
          lon: clickLon,
          temp: Math.round(data.current.temperature_2m),
          label: info.label,
          icon: info.icon,
          wind: data.current.wind_speed_10m,
          humidity: data.current.relative_humidity_2m,
        },
      ]);
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  }

  function handleMapClick(clickLat, clickLon) {
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    if (isLoading) return;

    clickTimeoutRef.current = setTimeout(() => {
      isMapClick.current = true;
      fetchMarkerWeather(clickLat, clickLon);
      if (onLocationSelect) onLocationSelect(clickLat, clickLon);
    }, 300);
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Controls */}
      <div className="flex items-center gap-6 bg-white/90 dark:bg-gray-800/90 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">🌡️ Temp</span>
          <button
            onClick={() => setShowOverlay((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              showOverlay ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                showOverlay ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">💨 Wind</span>
          <button
            onClick={() => setShowWind((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              showWind ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                showWind ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: "420px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <HeatmapOverlay show={showOverlay} showWind={showWind} />
        <FlyToLocation center={mapCenter} />
        <ClickHandler onMapClick={handleMapClick} />

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lon]} icon={createWeatherIcon(m.icon)}>
            <Popup>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <div style={{ fontSize: 32 }}>{m.icon}</div>
                <div style={{ fontSize: 24, fontWeight: "bold" }}>{m.temp}°C</div>
                <div style={{ color: "#666" }}>{m.label}</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                  💨 {m.wind} km/h &nbsp; 💧 {m.humidity}%
                </div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                  {m.lat.toFixed(2)}, {m.lon.toFixed(2)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      {showOverlay && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-800/90">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">-20°C</span>
          <div
            className="flex-1 h-3 rounded-full"
            style={{
              background: `linear-gradient(to right, ${tempToCSS(-20)}, ${tempToCSS(-5)}, ${tempToCSS(5)}, ${tempToCSS(15)}, ${tempToCSS(25)}, ${tempToCSS(35)}, ${tempToCSS(45)})`,
            }}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">45°C</span>
        </div>
      )}

      <p className="text-xs text-center text-gray-400 dark:text-gray-500 py-2">
        Click anywhere for weather details · Pan/zoom to update heatmap
      </p>
    </div>
  );
}
