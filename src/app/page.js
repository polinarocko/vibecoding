"use client";

import dynamic from "next/dynamic";
import { useWeather, getWeatherInfo } from "@/app/components/WeatherProvider";

const WeatherMap = dynamic(() => import("@/app/components/WeatherMap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl bg-white/70 dark:bg-gray-800/70 h-[420px] flex items-center justify-center text-gray-400">
      Loading map...
    </div>
  ),
});

export default function MapPage() {
  const { weather, location, loading, error, coords, fetchWeather } = useWeather();

  return (
    <div className="flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        {loading && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Loading weather data...
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 dark:text-red-400 py-4">{error}</div>
        )}
        {!loading && !error && weather && (
          <div className="flex items-center gap-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow px-5 py-3">
            <span className="text-3xl">{getWeatherInfo(weather.current.weather_code).icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">📍 {location}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {Math.round(weather.current.temperature_2m)}°C
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  {getWeatherInfo(weather.current.weather_code).label}
                </span>
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 text-right shrink-0">
              <div>💨 {weather.current.wind_speed_10m} km/h</div>
              <div>💧 {weather.current.relative_humidity_2m}%</div>
            </div>
          </div>
        )}

        <WeatherMap
          lat={coords.lat}
          lon={coords.lon}
          onLocationSelect={(lat, lon) => fetchWeather(lat, lon)}
        />

        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Click anywhere on the map for weather details
        </p>
      </div>
    </div>
  );
}
