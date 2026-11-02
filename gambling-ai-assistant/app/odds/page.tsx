"use client";

import Sidebar from "@/components/sidebar";
import { useEffect, useMemo, useState } from "react";

type Outcome = { outcome: string; price: number };
type ApiGame = {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  is_sample: boolean;
  books: Record<string, { h2h?: Outcome[] }>;
};

function formatOdds(price: number | undefined) {
  return price === undefined ? "—" : `${price > 0 ? "+" : ""}${price}`;
}

function bestPrice(game: ApiGame, team: string) {
  const prices = Object.values(game.books)
    .flatMap((book) => book.h2h ?? [])
    .filter((outcome) => outcome.outcome === team)
    .map((outcome) => outcome.price);
  return prices.length ? Math.max(...prices) : undefined;
}

export default function OddsPage() {
  const [games, setGames] = useState<ApiGame[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    async function loadOdds() {
      try {
        const response = await fetch("/api/odds/nfl");
        if (!response.ok) throw new Error("Odds service unavailable");
        const data: ApiGame[] = await response.json();
        if (active) {
          setGames(data);
          setStatus("ready");
        }
      } catch {
        if (active) setStatus("error");
      }
    }
    loadOdds();
    return () => { active = false; };
  }, []);

  const sportsbooks = useMemo(
    () => [...new Set(games.flatMap((game) => Object.keys(game.books)))].sort(),
    [games],
  );
  const filteredGames = games.filter((game) =>
    `${game.away_team} ${game.home_team}`.toLowerCase().includes(search.toLowerCase()),
  );
  const isSample = games.some((game) => game.is_sample);
  const pricesTracked = games.reduce(
    (total, game) => total + Object.values(game.books).reduce(
      (bookTotal, book) => bookTotal + (book.h2h?.length ?? 0), 0,
    ), 0,
  );
  const message = status === "loading"
    ? "Loading the latest stored odds…"
    : status === "error"
      ? "Odds service is unavailable. Start the local stack with npm run dev."
      : isSample
        ? "Sample odds from the local database."
        : "Latest odds from the connected Odds API.";

  return (
    <div className="min-h-screen bg-[#f6f7f9] lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6 text-[#171717] lg:p-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-xs font-bold tracking-widest text-green-700">SPORTSBOOK COMPARISON</p>
            <h1 className="mt-2 text-3xl font-bold">NFL Odds Dashboard</h1>
            <p className="mt-2 text-gray-500">{message}</p>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {[["Games Tracked", games.length], ["Sportsbooks", sportsbooks.length], ["Moneyline Prices", pricesTracked]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-500">{label}</p>
                <h2 className="mt-2 text-3xl font-bold">{value}</h2>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-6">
              <div><h2 className="text-xl font-bold">NFL Matchups</h2><p className="mt-1 text-sm text-gray-500">Moneyline odds by sportsbook</p></div>
              <input type="text" placeholder="Search teams..." value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><th className="p-4">Matchup</th>{sportsbooks.map((book) => <th key={book} className="p-4">{book}</th>)}</tr></thead>
                <tbody>
                  {filteredGames.map((game) => (
                    <tr key={game.id} className="border-t border-gray-200">
                      <td className="p-4"><p className="font-semibold">{game.away_team}</p><p className="text-gray-500">vs. {game.home_team}</p><p className="mt-2 text-xs text-gray-400">{new Date(game.commence_time).toLocaleString()}</p></td>
                      {sportsbooks.map((book) => {
                        const outcomes = game.books[book]?.h2h ?? [];
                        return <td key={book} className="p-4"><div className="space-y-2">{[game.away_team, game.home_team].map((team) => {
                          const price = outcomes.find((outcome) => outcome.outcome === team)?.price;
                          const isBest = price !== undefined && price === bestPrice(game, team);
                          return <div key={team} className={`rounded-md border px-3 py-2 text-center font-semibold ${isBest ? "border-green-400 bg-green-100 text-green-800" : "border-transparent bg-gray-100 text-gray-900"}`}>{formatOdds(price)}</div>;
                        })}</div></td>;
                      })}
                    </tr>
                  ))}
                  {status === "ready" && filteredGames.length === 0 && <tr><td colSpan={Math.max(sportsbooks.length + 1, 2)} className="p-8 text-center text-gray-500">No matching games found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2"><span className="inline-block h-4 w-4 rounded border border-green-400 bg-green-100" /><p className="text-sm text-gray-500">Green indicates the best available moneyline odds for each team.</p></div>
        </div>
      </main>
    </div>
  );
}
