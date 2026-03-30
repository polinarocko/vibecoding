"use client";

import { useWeather, getWeatherInfo, formatDay } from "@/app/components/WeatherProvider";

export default function ForecastPage() {
  const { weather, location, loading, error } = useWeather();

  return (
    <div className="flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {loading && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-16 text-lg">
            Loading weather data...
          </div>
        )}
        {error && (
          <div className="text-center text-red-500 dark:text-red-400 py-8 text-lg">{error}</div>
        )}

        {!loading && !error && weather && (
          <>
            {/* Current conditions */}
            <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">📍 {location}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-6xl font-bold text-gray-800 dark:text-white">
                    {Math.round(weather.current.temperature_2m)}°
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                    {getWeatherInfo(weather.current.weather_code).label}
                  </p>
                </div>
                <div className="text-7xl">
                  {getWeatherInfo(weather.current.weather_code).icon}
                </div>
              </div>
              <div className="flex gap-6 mt-4 text-sm text-gray-500 dark:text-gray-400">
                <span>💨 {weather.current.wind_speed_10m} km/h</span>
                <span>💧 {weather.current.relative_humidity_2m}%</span>
              </div>
            </div>

            {/* 7-day forecast */}
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
              7-Day Forecast
            </h2>
            <div className="flex flex-col gap-3">
              {weather.daily.time.map((date, i) => {
                const info = getWeatherInfo(weather.daily.weather_code[i]);
                return (
                  <div
                    key={date}
                    className="flex items-center justify-between rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm px-5 py-4"
                  >
                    <div className="w-28 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatDay(date)}
                    </div>
                    <div className="text-2xl">{info.icon}</div>
                    <div className="hidden sm:block w-32 text-sm text-gray-500 dark:text-gray-400">
                      {info.label}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      🌧️ {weather.daily.precipitation_sum[i]} mm
                    </div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-24 text-right">
                      {Math.round(weather.daily.temperature_2m_min[i])}° /{" "}
                      {Math.round(weather.daily.temperature_2m_max[i])}°
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
              Data from Open-Meteo.com — free &amp; open-source weather API
            </p>
          </>
        )}
      </div>
    </div>
  );
}
