import { LoaderCircle } from "lucide-react";
import { useEffect, useState, type HTMLAttributes } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

export interface WeatherData {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  time: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
}

const weatherDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const formatNumber = (value: number) => value.toFixed(1);

interface WeatherModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: { lat: number; lon: number } | null;
}

export function WeatherModal({
  open,
  onOpenChange,
  coordinates,
}: WeatherModalProps) {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    if (!open) {
      return;
    }

    if (!coordinates) {
      setWeather(null);
      setLoading(false);
      setError("Unable to resolve map coordinates for weather.");
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      setWeather(null);

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current_weather=true&timezone=auto`,
        );

        if (!response.ok) {
          throw new Error("Unable to fetch weather data.");
        }

        const json = await response.json();
        const currentWeather = json.current_weather;

        if (!currentWeather) {
          throw new Error("No weather data returned from Open-Meteo.");
        }

        if (!canceled) {
          setWeather({
            temperature: currentWeather.temperature,
            windspeed: currentWeather.windspeed,
            winddirection: currentWeather.winddirection,
            weathercode: currentWeather.weathercode,
            time: currentWeather.time,
            latitude: json.latitude,
            longitude: json.longitude,
            timezone: json.timezone,
            elevation: json.elevation,
          });
        }
      } catch (error) {
        if (!canceled) {
          setWeather(null);
          setError(
            error instanceof Error
              ? error.message
              : "Unexpected error while loading weather.",
          );
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      canceled = true;
    };
  }, [open, coordinates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="glow-text font-mono text-primary">
            {t("weather.title")}
          </DialogTitle>
          <DialogDescription>{t("weather.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-sm text-muted-foreground">
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <LoaderCircle className="h-12 w-12 animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          ) : weather ? (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t("weather.temperature")}
                  </p>
                  <p className="text-2xl font-semibold text-foreground">
                    {formatNumber(weather.temperature)}°C
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t("weather.conditions")}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {weatherDescriptions[weather.weathercode] ?? "Unknown"}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t("weather.wind_speed")}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatNumber(weather.windspeed)} km/h
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t("weather.wind_direction")}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatNumber(weather.winddirection)}°
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t("weather.map_center")}
                </p>
                <p className="text-sm text-foreground">
                  {weather.latitude.toFixed(4)}, {weather.longitude.toFixed(4)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {weather.time} · {weather.timezone}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {t("weather.description")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
