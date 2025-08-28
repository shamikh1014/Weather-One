
import './App.css'


import React, { useEffect, useState } from "react";

// --- Utility: WMO weather codes mapping (condensed)
const WMO = {
  0: { label: "Clear sky", emoji: "☀️" },
  1: { label: "Mainly clear", emoji: "🌤️" },
  2: { label: "Partly cloudy", emoji: "⛅" },
  3: { label: "Overcast", emoji: "☁️" },
  45: { label: "Fog", emoji: "🌫️" },
  48: { label: "Depositing rime fog", emoji: "🌫️" },
  51: { label: "Light drizzle", emoji: "🌦️" },
  53: { label: "Moderate drizzle", emoji: "🌦️" },
  55: { label: "Dense drizzle", emoji: "🌧️" },
  56: { label: "Light freezing drizzle", emoji: "🌨️" },
  57: { label: "Dense freezing drizzle", emoji: "🌨️" },
  61: { label: "Slight rain", emoji: "🌧️" },
  63: { label: "Moderate rain", emoji: "🌧️" },
  65: { label: "Heavy rain", emoji: "🌧️" },
  66: { label: "Light freezing rain", emoji: "🌨️" },
  67: { label: "Heavy freezing rain", emoji: "❄️" },
  71: { label: "Slight snow fall", emoji: "🌨️" },
  73: { label: "Moderate snow fall", emoji: "🌨️" },
  75: { label: "Heavy snow fall", emoji: "❄️" },
  77: { label: "Snow grains", emoji: "🌨️" },
  80: { label: "Slight rain showers", emoji: "🌧️" },
  81: { label: "Moderate rain showers", emoji: "🌧️" },
  82: { label: "Violent rain showers", emoji: "⛈️" },
  85: { label: "Slight snow showers", emoji: "🌨️" },
  86: { label: "Heavy snow showers", emoji: "❄️" },
  95: { label: "Thunderstorm", emoji: "⛈️" },
  96: { label: "Thunderstorm w/ slight hail", emoji: "⛈️" },
  99: { label: "Thunderstorm w/ heavy hail", emoji: "⛈️" },
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white shadow-md rounded-xl p-4 ${className}`}>
    {children}
  </div>
);

const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
};

export default function WeatherNowApp() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [current, setCurrent] = useState(null);
  const [place, setPlace] = useState(null);
  const [unit, setUnit] = useLocalStorage("wn_unit", "C");
  const [recent, setRecent] = useLocalStorage("wn_recent", []);

  const convertTemp = (tC) => (unit === "C" ? tC : tC * 9 / 5 + 32);
  const unitSymbol = unit === "C" ? "°C" : "°F";

  const handleSearch = async (name) => {
    const q = (name ?? query).trim();
    if (!q) return;
    setError("");
    setLoading(true);
    setCandidates([]);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q
        )}&count=5&language=en&format=json`
      );
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      if (!data?.results?.length) {
        setError("No matching locations found.");
        setLoading(false);
        return;
      }
      setCandidates(data.results);
    } catch (e) {
      setError("Failed to search locations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (loc) => {
    setError("");
    setLoading(true);
    setCurrent(null);
    setPlace(loc);
    try {
      const params = new URLSearchParams({
        latitude: String(loc.latitude),
        longitude: String(loc.longitude),
        current: [
          "temperature_2m",
          "apparent_temperature",
          "relative_humidity_2m",
          "wind_speed_10m",
          "wind_direction_10m",
          "weather_code",
          "is_day",
        ].join(","),
        timezone: "auto",
      });
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`
      );
      if (!res.ok) throw new Error("Weather fetch failed");
      const data = await res.json();
      setCurrent(data.current);
      setRecent((prev) => {
        const item = {
          name: loc.name,
          country: loc.country,
          admin1: loc.admin1,
          latitude: loc.latitude,
          longitude: loc.longitude,
        };
        const filtered = prev.filter(
          (r) =>
            !(
              r.name === item.name &&
              r.admin1 === item.admin1 &&
              r.country === item.country
            )
        );
        return [item, ...filtered].slice(0, 6);
      });
      setCandidates([]);
    } catch (e) {
      setError("Couldn't load weather. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`
          );
          const data = await res.json();
          const loc =
            data?.results?.[0] || {
              name: "Your location",
              country: "",
              admin1: "",
              latitude,
              longitude,
            };
          fetchWeather(loc);
        } catch {
          fetchWeather({
            name: "Your location",
            country: "",
            admin1: "",
            latitude,
            longitude,
          });
        }
      },
      () => {
        setLoading(false);
        setError("Unable to access your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const windDir = (deg) => {
    if (deg == null) return "-";
    const dirs = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    return dirs[Math.round(((deg % 360) / 22.5)) % 16];
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Weather Now</h1>
          <div className="space-x-2">
            <button
              onClick={() => setUnit((u) => (u === "C" ? "F" : "C"))}
              className="px-3 py-1 bg-blue-600 text-white rounded-md cursor-pointer"
            >
              {unit === "C" ? "°C → °F" : "°F → °C"}
            </button>
            <button
              onClick={useMyLocation}
              className="px-3 py-1 bg-green-600 text-white rounded-md cursor-pointer"
            >
              Use my location
            </button>
          </div>
        </header>

        {/* Search */}
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city (e.g., Delhi, London, Tokyo)"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          {error && <p className="text-red-600 mt-2">{error}</p>}

          {candidates.length > 0 && (
            <div className="mt-3">
              <p className="font-medium">Select a location:</p>
              <ul className="space-y-1">
                {candidates.map((c) => (
                  <li key={`${c.id}-${c.latitude}-${c.longitude}`}>
                    <button
                      onClick={() => fetchWeather(c)}
                      className="text-blue-600 hover:underline"
                    >
                      {c.name} {c.admin1 ? `, ${c.admin1}` : ""} {c.country}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Weather + Sidebar */}
        {place && current && (
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="md:col-span-2 space-y-3">
              <h2 className="text-xl font-semibold">
                {place.name}{" "}
                {place.admin1 ? `• ${place.admin1}` : ""}{" "}
                {place.country ? `• ${place.country}` : ""}
              </h2>
              <p className="text-sm text-gray-600">
                Latitude {place.latitude.toFixed(2)}, Longitude {place.longitude.toFixed(2)}
              </p>
              <div className="text-5xl">{WMO[current.weather_code]?.emoji || "🌍"}</div>
              <div className="space-y-1">
                <p>
                  <strong>Temperature:</strong>{" "}
                  {convertTemp(current.temperature_2m).toFixed(1)}
                  {unitSymbol}
                </p>
                <p>
                  <strong>Feels:</strong>{" "}{convertTemp(current.apparent_temperature).toFixed(1)}
                  {unitSymbol}
                </p>
                <p>
                  <strong>Condition:</strong>{" "}
                  {WMO[current.weather_code]?.label || `Code ${current.weather_code}`}
                </p>
                <p>
                  <strong>Humidity:</strong> {current.relative_humidity_2m}%
                </p>
                <p>
                  <strong>Wind:</strong> {current.wind_speed_10m} km/h{" "}
                  {windDir(current.wind_direction_10m)}
                </p>
              </div>
            </Card>

            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold mb-2">Recent searches</h3>
                {recent.length === 0 ? (
                  <p>No recent cities yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {recent.map((r, idx) => (
                      <li key={idx}>
                        <button
                          onClick={() => fetchWeather(r)}
                          className="text-blue-600 hover:underline"
                        >
                          {r.name} {r.admin1 ? `, ${r.admin1}` : ""} {r.country}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {recent.length > 0 && (
                  <button
                    onClick={() => setRecent([])}
                    className="mt-2 text-sm text-red-600 hover:underline"
                  >
                    Clear recent
                  </button>
                )}
              </Card>

              <Card>
                <h3 className="font-semibold mb-2">About</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Search any city, then pick the exact location if multiple matches appear.</li>
                  <li>
                    Data from{" "}
                    <a
                      href="https://open-meteo.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Open-Meteo
                    </a>.
                  </li>
                  <li>Toggle °C/°F. Choice is saved locally.</li>
                  <li>Use your device location for quick weather lookup.</li>
                </ul>
              </Card>
            </div>
          </div>
        )}

        {!place && <p className="text-gray-600">Search a city to see current weather.</p>}

        <footer className="text-center text-sm text-gray-500 mt-8">
          Built with React • Open-Meteo APIs
        </footer>
      </div>
    </div>
  );
}
