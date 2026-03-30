import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WeatherProvider } from "@/app/components/WeatherProvider";
import Header from "@/app/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Weather Forecast",
  description: "7-day weather forecast with current conditions",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gradient-to-br from-blue-50 to-sky-100 dark:from-gray-900 dark:to-gray-800">
        <WeatherProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
        </WeatherProvider>
      </body>
    </html>
  );
}
