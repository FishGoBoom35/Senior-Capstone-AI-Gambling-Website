
"use client";

import Link from "next/link";
import { useState } from "react";

const navigation = [
  { name: "Home", href: "/", icon: "▦" },
  { name: "Odds", href: "/odds", icon: "◈" },
  { name: "AI Analysis", href: "/analysis", icon: "✧" },
  { name: "AI Chatbot", href: "/chatbot", icon: "◇" },
  { name: "History", href: "/history", icon: "◷" },
];

const games = [
  {
    id: 1,
    league: "NFL",
    away: "Kansas City Chiefs",
    home: "Jacksonville Jaguars",
    odds: "-145",
    status: "Sample matchup",
  },
  {
    id: 2,
    league: "NFL",
    away: "Buffalo Bills",
    home: "New England Patriots",
    odds: "-120",
    status: "Sample matchup",
  },
];

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#171717] lg:flex">
      {/* Mobile navigation */}
      <div className="flex items-center justify-between bg-[#10151f] p-4 text-white lg:hidden">
        <span className="font-bold">
          ALL THE <span className="text-[#a5ed80]">ODDS</span>
        </span>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`w-full bg-[#10151f] text-white lg:flex lg:min-h-screen lg:w-64 lg:shrink-0 lg:flex-col ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div className="border-b border-white/10 p-7">
          <div className="text-xl font-black tracking-tight">
            ✳ ALL THE <span className="text-[#a5ed80]">ODDS</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            YOUR SPORTS ANALYSIS HUB
          </p>
        </div>

        <div className="flex-1 px-4 py-8">
          <p className="mb-4 px-3 text-xs font-semibold tracking-widest text-gray-500">
            DISCOVER
          </p>

          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
                  item.href === "/"
                    ? "bg-[#a5ed80] font-semibold text-[#10151f]"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 p-6">
          <p className="text-sm font-semibold">
            ✦ A smarter way to play.
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-400">
            Explore matchups and make informed decisions
            with data-driven insights.
          </p>
          <p className="mt-6 text-xs text-gray-500">
            DEMO EXPERIENCE · NO REAL MONEY
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-5">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400">
              ALL THE ODDS
            </p>
            <h2 className="text-lg font-bold">Dashboard</h2>
          </div>

          <span className="rounded-full bg-green-100 px-4 py-2 text-xs font-bold text-green-800">
            DEMO MODE
          </span>
        </header>

        <main className="mx-auto max-w-6xl space-y-10 p-6 lg:p-10">
          {/* Welcome */}
          <section>
            <p className="mb-3 text-xs font-bold tracking-widest text-green-700">
              YOUR FRONT ROW SEAT
            </p>
            <h1 className="text-4xl font-black tracking-tight lg:text-5xl">
              Let's make it{" "}
              <span className="text-green-700">interesting.</span>
            </h1>
            <p className="mt-4 text-gray-500">
              Compare odds, explore predictions, and
              understand the numbers behind every matchup.
            </p>
          </section>

          {/* Hero */}
          <section className="overflow-hidden rounded-2xl bg-[#10151f] p-8 text-white lg:p-12">
            <p className="mb-4 text-xs font-bold tracking-widest text-[#a5ed80]">
              ✦ THE ALL THE ODDS EXPERIENCE
            </p>
            <h2 className="text-4xl font-black leading-tight lg:text-5xl">
              BETTER PLAYS.
              <br />
              <span className="text-[#a5ed80]">
                SMARTER INSIGHTS.
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-6 text-gray-300">
              Sportsbook comparisons, predictive analysis,
              and historical data — all in one place.
            </p>

            <Link
              href="/odds"
              className="mt-8 inline-block rounded-lg bg-[#a5ed80] px-6 py-3 text-sm font-bold text-[#10151f] hover:bg-[#c0f5a6]"
            >
              Explore matchups →
            </Link>
          </section>

          {/* Features */}
          <section>
            <h2 className="mb-5 text-2xl font-bold">
              Explore our features
            </h2>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  title: "Compare Odds",
                  description:
                    "Compare sportsbook lines and identify favorable odds.",
                  href: "/odds",
                  icon: "◈",
                },
                {
                  title: "AI Analysis",
                  description:
                    "Explore predicted outcomes and matchup statistics.",
                  href: "/analysis",
                  icon: "✧",
                },
                {
                  title: "AI Chatbot",
                  description:
                    "Ask questions about teams, games, and predictions.",
                  href: "/chatbot",
                  icon: "◇",
                },
              ].map((feature) => (
                <Link
                  href={feature.href}
                  key={feature.title}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-green-400 hover:shadow-md"
                >
                  <div className="mb-5 text-3xl text-green-700">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    {feature.description}
                  </p>
                  <p className="mt-5 text-sm font-bold text-green-700">
                    Explore →
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Featured matchups */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Featured matchups
              </h2>
              <Link
                href="/odds"
                className="text-sm font-semibold text-green-700"
              >
                View all →
              </Link>
            </div>

            <div className="space-y-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6"
                >
                  <div>
                    <p className="mb-2 text-xs font-bold text-green-700">
                      {game.league} · {game.status}
                    </p>
                    <h3 className="font-bold">
                      {game.away} vs. {game.home}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                      Example odds: {game.odds}
                    </p>
                  </div>

                  <Link
                    href="/analysis"
                    className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold hover:bg-gray-50"
                  >
                    View analysis →
                  </Link>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Sample matchups and odds for demonstration only.
            </p>
          </section>

          <footer className="border-t border-gray-200 pt-6 text-xs text-gray-400">
            © 2026 ALL THE ODDS · DEMO ONLY · NO REAL-MONEY WAGERING
          </footer>
        </main>
      </div>
    </div>
  );
}
