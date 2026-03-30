"use client";

import { createContext, useContext, useState, useEffect } from "react";

export const WEATHER_CODES = {
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

export function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { label: "Unknown", icon: "❓" };
}

export function formatDay(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const WeatherContext = createContext(null);
const weatherCache = new Map();

export function WeatherProvider({ children }) {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [coords, setCoords] = useState({ lat: 40.71, lon: -74.01 });

  async function fetchWeather(lat, lon, cityName) {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    if (weatherCache.has(key)) {
      setWeather(weatherCache.get(key));
      setCoords({ lat, lon });
      setLocation(cityName || key);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`
      );
      if (res.status === 429) throw new Error("Rate limit reached — try again in a moment");
      if (!res.ok) throw new Error("Failed to fetch weather data");
      const data = await res.json();
      weatherCache.set(key, data);
      setWeather(data);
      setCoords({ lat, lon });
      setLocation(cityName || key);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchByCity(city) {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      );
      const data = await res.json();
      if (!data.results?.length) {
        setError("City not found. Try another name.");
        setLoading(false);
        return;
      }
      const { latitude, longitude, name, country } = data.results[0];
      await fetchWeather(latitude, longitude, `${name}, ${country}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(40.71, -74.01, "New York, US")
      );
    } else {
      fetchWeather(40.71, -74.01, "New York, US");
    }
  }, []);

  return (
    <WeatherContext.Provider
      value={{ weather, location, loading, error, searchCity, setSearchCity, coords, fetchWeather, searchByCity }}
    >
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  return useContext(WeatherContext);
}
