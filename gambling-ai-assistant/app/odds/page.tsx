
"use client";

import Sidebar from "@/components/sidebar";
import { useState } from "react";

// Temporary data until our backend is connected
const games = [
  {
    id: 1,
    away: "Kansas City Chiefs",
    home: "Jacksonville Jaguars",
    date: "Sunday, Nov 1 @ 4:25 PM ET",
    odds: {
      DraftKings: ["-145", "+125"],
      FanDuel: ["-140", "+120"],
      BetMGM: ["-150", "+130"],
    },
  },
  {
    id: 2,
    away: "Buffalo Bills",
    home: "New England Patriots",
    date: "Sunday, Nov 1 @ 4:25 PM ET",
    odds: {
      DraftKings: ["-170", "+145"],
      FanDuel: ["-165", "+140"],
      BetMGM: ["-175", "+150"],
    },
  },
  {
    id: 3,
    away: "Dallas Cowboys",
    home: "Philadelphia Eagles",
    date: "Sunday, Nov 1 @ 4:25 PM ET",
    odds: {
      DraftKings: ["+120", "-140"],
      FanDuel: ["+125", "-145"],
      BetMGM: ["+115", "-135"],
    },
  },
];

const sportsbooks = [
  "DraftKings",
  "FanDuel",
  "BetMGM",
] as const;

// Find the best available moneyline for each team
function getBestOdds(game: (typeof games)[number], teamIndex: number) {
  const allOdds = sportsbooks.map((book) =>
    Number(game.odds[book][teamIndex])
  );

  return Math.max(...allOdds);
}

export default function OddsPage() {
  const [search, setSearch] = useState("");

  const filteredGames = games.filter((game) =>
    `${game.away} ${game.home}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f6f7f9] lg:flex">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6 text-[#171717] lg:p-10">
        <div className="mx-auto max-w-7xl">

          {/* Page heading */}
          <div className="mb-8">
            <p className="text-xs font-bold tracking-widest text-green-700">
              SPORTSBOOK COMPARISON
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              NFL Odds Dashboard
            </h1>

            <p className="mt-2 text-gray-500">
              Compare betting lines across different sportsbooks.
            </p>
          </div>

          {/* Summary cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {[
              ["Games Tracked", games.length],
              ["Sportsbooks", sportsbooks.length],
              ["Odds Entries", games.length * sportsbooks.length * 2],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <p className="text-sm text-gray-500">
                  {label}
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {value}
                </h2>
              </div>
            ))}
          </div>

          {/* Matchups table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

            {/* Table heading */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-6">
              <div>
                <h2 className="text-xl font-bold">
                  NFL Matchups
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Sample moneyline odds
                </p>
              </div>

              <input
                type="text"
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">

                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-4">Matchup</th>

                    {sportsbooks.map((book) => (
                      <th key={book} className="p-4">
                        {book}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredGames.map((game) => (
                    <tr
                      key={game.id}
                      className="border-t border-gray-200"
                    >
                      {/* Teams and date */}
                      <td className="p-4">
                        <p className="font-semibold">
                          {game.away}
                        </p>

                        <p className="text-gray-500">
                          vs. {game.home}
                        </p>

                        <p className="mt-2 text-xs text-gray-400">
                          {game.date}
                        </p>
                      </td>

                      {/* Sportsbook odds */}
                      {sportsbooks.map((book) => (
                        <td key={book} className="p-4">
                          <div className="space-y-2">

                            {game.odds[book].map((odd, index) => {
                              const bestOdds = getBestOdds(game, index);

                              const isBest =
                                Number(odd) === bestOdds;

                              return (
                                <div
                                  key={index}
                                  className={`rounded-md border px-3 py-2 text-center font-semibold ${
                                    isBest
                                      ? "border-green-400 bg-green-100 text-green-800"
                                      : "border-transparent bg-gray-100 text-gray-900"
                                  }`}
                                >
                                  {odd}
                                </div>
                              );
                            })}

                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}

                  {filteredGames.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-gray-500"
                      >
                        No matching games found.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-block h-4 w-4 rounded border border-green-400 bg-green-100" />

            <p className="text-sm text-gray-500">
              Green indicates the best available moneyline odds
              for each team.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
