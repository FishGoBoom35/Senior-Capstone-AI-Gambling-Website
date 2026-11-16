"use client";

import Sidebar from "@/components/sidebar";
import { analyzeArbitrage, type ApiGame, type Market, type Outcome } from "@/lib/arbitrage";
import { useEffect, useMemo, useState } from "react";

type Selection = {
  gameId: string;
  matchup: string;
  team: string;
  sportsbook: string;
  price: number;
  market: Market;
  point?: number | null;
};

const marketLabels: Record<Market, string> = {
  h2h: "Moneyline",
  spreads: "Spread",
  totals: "Over / Under",
};

function formatOdds(price: number | undefined) {
  return price === undefined ? "—" : `${price > 0 ? "+" : ""}${price}`;
}

function bestPrice(game: ApiGame, market: Market, outcomeName: string) {
  const prices = Object.values(game.books)
    .flatMap((book) => book[market] ?? [])
    .filter((outcome) => outcome.outcome === outcomeName)
    .map((outcome) => outcome.price);
  return prices.length ? Math.max(...prices) : undefined;
}

function selectionLabel(outcome: Outcome, market: Market) {
  if (market === "spreads") {
    const point = outcome.point === undefined || outcome.point === null
      ? ""
      : ` ${outcome.point > 0 ? "+" : ""}${outcome.point}`;
    return `${outcome.outcome}${point}`;
  }
  if (market === "totals") return `${outcome.outcome} ${outcome.point ?? ""}`.trim();
  return outcome.outcome;
}

function decimalOdds(price: number) {
  return price > 0 ? 1 + price / 100 : 1 + 100 / Math.abs(price);
}

function americanOdds(decimal: number) {
  if (decimal <= 1) return "—";
  const price = decimal >= 2 ? (decimal - 1) * 100 : -100 / (decimal - 1);
  const rounded = Math.round(price);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

export default function OddsPage() {
  const [games, setGames] = useState<ApiGame[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selections, setSelections] = useState<Selection[]>([]);
  const [stake, setStake] = useState("");
  const [market, setMarket] = useState<Market>("h2h");

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
  const arbitrageOpportunities = useMemo(() => analyzeArbitrage(games), [games]);
  const guaranteedArbitrage = arbitrageOpportunities.filter((opportunity) => opportunity.classification === "guaranteed");
  const message = status === "loading"
    ? "Loading the latest stored odds…"
    : status === "error"
      ? "Odds service is unavailable. Start the local stack with npm run dev."
      : isSample
        ? "Sample odds from the local database."
        : "Latest odds from the connected Odds API.";
  const stakeAmount = Number(stake) || 0;
  const combinedDecimal = selections.reduce((total, selection) => total * decimalOdds(selection.price), 1);
  const potentialReturn = stakeAmount > 0 && selections.length > 0 ? stakeAmount * combinedDecimal : 0;
  const potentialProfit = Math.max(potentialReturn - stakeAmount, 0);

  function toggleSelection(selection: Selection) {
    setSelections((current) => {
      const existing = current.find((item) => item.gameId === selection.gameId);
      if (existing?.team === selection.team && existing.sportsbook === selection.sportsbook && existing.market === selection.market) {
        return current.filter((item) => item.gameId !== selection.gameId);
      }
      return [...current.filter((item) => item.gameId !== selection.gameId), selection];
    });
  }

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
            {[["Games Tracked", games.length], ["Sportsbooks", sportsbooks.length], ["Guaranteed Arbitrage", guaranteedArbitrage.length]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-500">{label}</p>
                <h2 className="mt-2 text-3xl font-bold">{value}</h2>
              </div>
            ))}
          </div>

          <section className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-6">
              <div><p className="text-xs font-bold tracking-widest text-green-700">SETTLEMENT-AWARE ANALYSIS</p><h2 className="mt-1 text-xl font-bold">Arbitrage Scanner</h2><p className="mt-1 text-sm text-gray-500">Analyzes every stored sportsbook pairing across moneyline, spreads, and totals.</p></div>
              <span className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">{arbitrageOpportunities.length} candidate{arbitrageOpportunities.length === 1 ? "" : "s"}</span>
            </div>
            {status === "loading" ? <p className="p-6 text-sm text-gray-500">Analyzing available markets…</p> : arbitrageOpportunities.length === 0 ? <p className="p-6 text-sm text-gray-500">No arbitrage or settlement-safe middle candidates were found in the currently stored odds.</p> : <div className="divide-y divide-gray-200">{arbitrageOpportunities.slice(0, 30).map((opportunity) => {
              const badge = opportunity.classification === "guaranteed" ? "bg-green-100 text-green-800" : opportunity.classification === "middle" ? "bg-blue-100 text-blue-800" : opportunity.classification === "push-exposed" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700";
              const label = opportunity.classification === "guaranteed" ? "Guaranteed arbitrage" : opportunity.classification === "middle" ? "Potential middle" : opportunity.classification === "push-exposed" ? "Push-exposed" : opportunity.classification === "theoretical" ? "Theoretical only" : "Not guaranteed";
              const line = (outcome: Outcome) => `${outcome.outcome}${outcome.point == null ? "" : ` ${outcome.point > 0 && opportunity.market === "spreads" ? "+" : ""}${outcome.point}`}`;
              return <div key={opportunity.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>{label}</span><span className="text-xs font-semibold text-gray-500">{marketLabels[opportunity.market]}</span></div><p className="mt-2 font-semibold">{opportunity.matchup}</p><p className="mt-1 text-sm text-gray-600">{line(opportunity.first)} <strong>{formatOdds(opportunity.first.price)}</strong> at {opportunity.first.sportsbook} <span className="mx-1">·</span> {line(opportunity.second)} <strong>{formatOdds(opportunity.second.price)}</strong> at {opportunity.second.sportsbook}{opportunity.third && <><span className="mx-1">·</span>{line(opportunity.third)} <strong>{formatOdds(opportunity.third.price)}</strong> at {opportunity.third.sportsbook}</>}</p><p className="mt-1 text-xs leading-5 text-gray-500">{opportunity.note}</p></div><div className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm lg:text-right"><span className="text-gray-500">Implied total</span><strong>{(opportunity.combinedProbability * 100).toFixed(2)}%</strong><span className="text-gray-500">Theoretical ROI</span><strong>{opportunity.theoreticalRoi.toFixed(2)}%</strong>{opportunity.classification !== "theoretical" && <><span className="text-gray-500">Worst-case ROI</span><strong className={opportunity.minimumProfit > 0 ? "text-green-700" : "text-gray-900"}>{(opportunity.minimumProfit * 100).toFixed(2)}%</strong></>}</div></div>;
            })}</div>}
            {arbitrageOpportunities.length > 30 && <p className="border-t border-gray-200 p-4 text-center text-xs text-gray-500">Showing the top 30 of {arbitrageOpportunities.length} analyzed candidates.</p>}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-6">
              <div><h2 className="text-xl font-bold">NFL Matchups</h2><p className="mt-1 text-sm text-gray-500">{marketLabels[market]} odds by sportsbook</p></div>
              <input type="text" placeholder="Search teams..." value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm" />
            </div>
            <div className="flex gap-2 border-b border-gray-200 px-6 py-3">
              {(Object.keys(marketLabels) as Market[]).map((option) => <button key={option} type="button" onClick={() => setMarket(option)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${market === option ? "bg-[#10151f] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{marketLabels[option]}</button>)}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><th className="p-4">Matchup</th>{sportsbooks.map((book) => <th key={book} className="p-4">{book}</th>)}</tr></thead>
                <tbody>
                  {filteredGames.map((game) => (
                    <tr key={game.id} className="border-t border-gray-200">
                      <td className="p-4"><p className="font-semibold">{game.away_team}</p><p className="text-gray-500">vs. {game.home_team}</p><p className="mt-2 text-xs text-gray-400">{new Date(game.commence_time).toLocaleString()}</p></td>
                      {sportsbooks.map((book) => {
                        const outcomes = game.books[book]?.[market] ?? [];
                        const outcomeNames = market === "totals" ? ["Over", "Under"] : [game.away_team, game.home_team];
                        return <td key={book} className="p-4"><div className="space-y-2">{outcomeNames.map((outcomeName) => {
                          const outcome = outcomes.find((item) => item.outcome === outcomeName);
                          if (!outcome) return <div key={outcomeName} className="rounded-md bg-gray-100 px-3 py-2 text-center font-semibold text-gray-400">—</div>;
                        const isBest = outcome.price === bestPrice(game, market, outcomeName);
                          const team = selectionLabel(outcome, market);
                          const selected = selections.some((item) => item.gameId === game.id && item.team === team && item.sportsbook === book && item.market === market);
                          return <button type="button" key={outcomeName} onClick={() => toggleSelection({ gameId: game.id, matchup: `${game.away_team} vs. ${game.home_team}`, team, sportsbook: book, price: outcome.price, market, point: outcome.point })} className={`w-full rounded-md border px-3 py-2 text-center font-semibold transition ${selected ? "border-[#10151f] bg-[#10151f] text-white" : isBest ? "border-green-400 bg-green-100 text-green-800 hover:border-green-700" : "border-transparent bg-gray-100 text-gray-900 hover:border-gray-400"}`}><span className="block text-xs">{team}</span><span>{formatOdds(outcome.price)}</span></button>;
                        })}</div></td>;
                      })}
                    </tr>
                  ))}
                  {status === "ready" && filteredGames.length === 0 && <tr><td colSpan={Math.max(sportsbooks.length + 1, 2)} className="p-8 text-center text-gray-500">No matching games found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <aside className="h-fit rounded-xl border border-gray-200 bg-white p-5 xl:sticky xl:top-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-green-700">DEMO ONLY</p><h2 className="mt-1 text-xl font-bold">Bet Slip</h2></div>{selections.length > 0 && <button type="button" onClick={() => setSelections([])} className="text-sm font-medium text-gray-500 hover:text-gray-900">Clear</button>}</div>
            <p className="mt-2 text-sm text-gray-500">{selections.length > 1 ? "Parlay" : "Straight bet"} · {selections.length} selection{selections.length === 1 ? "" : "s"}</p>
            {selections.length === 0 ? <p className="py-10 text-center text-sm leading-6 text-gray-500">Select a moneyline, spread, or total from a matchup to build a hypothetical bet.</p> : <>
              <div className="mt-5 space-y-3">{selections.map((selection) => <div key={selection.gameId} className="rounded-lg bg-gray-50 p-3"><div className="flex justify-between gap-3"><div><p className="font-semibold">{selection.team}</p><p className="mt-1 text-xs text-gray-500">{selection.matchup}</p><p className="mt-1 text-xs text-gray-400">{selection.sportsbook} {marketLabels[selection.market].toLowerCase()}</p></div><div className="flex items-start gap-2"><span className="font-bold">{formatOdds(selection.price)}</span><button type="button" onClick={() => setSelections((current) => current.filter((item) => item.gameId !== selection.gameId))} aria-label={`Remove ${selection.team}`} className="text-gray-400 hover:text-gray-900">×</button></div></div></div>)}</div>
              <label className="mt-5 block text-sm font-medium" htmlFor="stake">Hypothetical stake</label>
              <div className="mt-2 flex items-center rounded-lg border border-gray-300 px-3"><span className="text-gray-500">$</span><input id="stake" type="number" min="0" step="0.01" inputMode="decimal" value={stake} onChange={(event) => setStake(event.target.value)} placeholder="0.00" className="w-full border-0 px-2 py-3 outline-none" /></div>
              <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm">{selections.length > 1 && <div className="flex justify-between font-semibold text-[#10151f]"><span>Total parlay odds</span><span>{americanOdds(combinedDecimal)}</span></div>}<div className="flex justify-between text-gray-500"><span>Potential profit</span><span>${potentialProfit.toFixed(2)}</span></div><div className="flex justify-between text-base font-bold"><span>Potential return</span><span>${potentialReturn.toFixed(2)}</span></div></div>
              <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Demo only. No real wager is placed or accepted.</p>
            </>}
          </aside>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2"><span className="inline-block h-4 w-4 rounded border border-green-400 bg-green-100" /><p className="text-sm text-gray-500">Green indicates the best available displayed price for each outcome.</p></div>
        </div>
      </main>
    </div>
  );
}
