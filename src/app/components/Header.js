"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWeather } from "./WeatherProvider";

export default function Header() {
  const { searchCity, setSearchCity, searchByCity } = useWeather();
  const pathname = usePathname();

  return (
    <header className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">🌤️ Weather</h1>
          <nav className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 text-sm font-medium">
            <Link
              href="/"
              className={`px-4 py-2 transition-colors ${
                pathname === "/"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              🗺️ Map
            </Link>
            <Link
              href="/forecast"
              className={`px-4 py-2 transition-colors ${
                pathname === "/forecast"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              📅 Forecast
            </Link>
          </nav>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            searchByCity(searchCity);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            placeholder="Search city..."
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-500 px-5 py-2 font-semibold text-white hover:bg-blue-600 transition-colors text-sm"
          >
            Search
          </button>
        </form>
      </div>
    </header>
  );
}
