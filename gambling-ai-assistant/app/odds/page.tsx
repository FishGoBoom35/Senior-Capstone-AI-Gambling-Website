"use client";

import Sidebar from "@/components/sidebar";
import { useEffect, useMemo, useState } from "react";

type Market = "h2h" | "spreads" | "totals";
type Outcome = { outcome: string; price: number; point: number | null };
type ApiGame = { id: string; home_team: string; away_team: string; commence_time: string; updated_at: string; is_sample: boolean; books: Record<string, Partial<Record<Market, Outcome[]>>> };
type Pick = { gameId: string; matchup: string; book: string; market: Market; outcome: string; price: number; point: number | null };
type Opportunity = { id: string; game: ApiGame; market: Market; first: Pick; second: Pick; probability: number; roi: number };

const marketLabels: Record<Market, string> = { h2h: "Moneyline", spreads: "Spreads", totals: "Over/Under" };

function formatOdds(price: number | undefined) { return price === undefined ? "—" : `${price > 0 ? "+" : ""}${price}`; }
function formatPick(pick: Pick) {
  if (pick.market === "h2h") return `${pick.outcome} ${formatOdds(pick.price)}`;
  return `${pick.outcome} ${pick.point ?? "—"} (${formatOdds(pick.price)})`;
}
function decimalOdds(price: number) { return price > 0 ? 1 + price / 100 : 1 + 100 / Math.abs(price); }
function americanOdds(decimal: number) { const value = decimal >= 2 ? (decimal - 1) * 100 : -100 / (decimal - 1); const rounded = Math.round(value); return `${rounded > 0 ? "+" : ""}${rounded}`; }
function impliedProbability(price: number) { return price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100); }

function isBetter(market: Market, outcome: string, candidate: Outcome, current: Outcome) {
  if (market === "h2h") return candidate.price > current.price;
  if (market === "spreads") return (candidate.point ?? -Infinity) > (current.point ?? -Infinity) || (candidate.point === current.point && candidate.price > current.price);
  const wantsLower = outcome === "Over";
  return (wantsLower ? (candidate.point ?? Infinity) < (current.point ?? Infinity) : (candidate.point ?? -Infinity) > (current.point ?? -Infinity)) || (candidate.point === current.point && candidate.price > current.price);
}

function bestPick(game: ApiGame, market: Market, outcome: string) {
  let result: Pick | undefined;
  Object.entries(game.books).forEach(([book, markets]) => (markets[market] ?? []).filter((item) => item.outcome === outcome).forEach((item) => {
    const candidate = { gameId: game.id, matchup: `${game.away_team} vs. ${game.home_team}`, book, market, outcome, price: item.price, point: item.point };
    if (!result || isBetter(market, outcome, item, result)) result = candidate;
  }));
  return result;
}

function opportunitiesForGame(game: ApiGame) {
  const opportunities: Opportunity[] = [];
  const add = (market: Market, first: Pick | undefined, second: Pick | undefined, suffix: string) => {
    if (!first || !second) return;
    const probability = impliedProbability(first.price) + impliedProbability(second.price);
    if (probability < 1) opportunities.push({ id: `${game.id}-${market}-${suffix}`, game, market, first, second, probability, roi: (1 / probability - 1) * 100 });
  };
  add("h2h", bestPick(game, "h2h", game.away_team), bestPick(game, "h2h", game.home_team), "moneyline");
  const spreadPairs = new Map<string, { away?: Pick; home?: Pick }>();
  Object.entries(game.books).forEach(([book, markets]) => (markets.spreads ?? []).forEach((item) => {
    const pick = { gameId: game.id, matchup: `${game.away_team} vs. ${game.home_team}`, book, market: "spreads" as const, outcome: item.outcome, price: item.price, point: item.point };
    const key = item.outcome === game.away_team ? String(item.point) : String(-(item.point ?? 0));
    const group = spreadPairs.get(key) ?? {};
    if (item.outcome === game.away_team && (!group.away || item.price > group.away.price)) group.away = pick;
    if (item.outcome === game.home_team && (!group.home || item.price > group.home.price)) group.home = pick;
    spreadPairs.set(key, group);
  }));
  spreadPairs.forEach((pair, point) => add("spreads", pair.away, pair.home, point));
  const totalPairs = new Map<string, { over?: Pick; under?: Pick }>();
  Object.entries(game.books).forEach(([book, markets]) => (markets.totals ?? []).forEach((item) => {
    const pick = { gameId: game.id, matchup: `${game.away_team} vs. ${game.home_team}`, book, market: "totals" as const, outcome: item.outcome, price: item.price, point: item.point };
    const group = totalPairs.get(String(item.point)) ?? {};
    if (item.outcome === "Over" && (!group.over || item.price > group.over.price)) group.over = pick;
    if (item.outcome === "Under" && (!group.under || item.price > group.under.price)) group.under = pick;
    totalPairs.set(String(item.point), group);
  }));
  totalPairs.forEach((pair, point) => add("totals", pair.over, pair.under, point));
  return opportunities;
}

export default function OddsPage() {
  const [games, setGames] = useState<ApiGame[]>([]);
  const [market, setMarket] = useState<Market>("h2h");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stake, setStake] = useState("");
  const [arbStake, setArbStake] = useState("100");

  useEffect(() => { let active = true; fetch("/api/odds/nfl").then((response) => response.ok ? response.json() : Promise.reject()).then((data: ApiGame[]) => { if (active) { setGames(data); setStatus("ready"); } }).catch(() => active && setStatus("error")); return () => { active = false; }; }, []);

  const books = useMemo(() => [...new Set(games.flatMap((game) => Object.keys(game.books)))].sort(), [games]);
  const visibleGames = games.filter((game) => `${game.away_team} ${game.home_team}`.toLowerCase().includes(search.toLowerCase()));
  const opportunities = useMemo(() => games.flatMap(opportunitiesForGame).sort((a, b) => b.roi - a.roi), [games]);
  const stakeAmount = Number(stake) || 0;
  const combinedDecimal = picks.reduce((total, pick) => total * decimalOdds(pick.price), 1);
  const potentialReturn = picks.length && stakeAmount > 0 ? stakeAmount * combinedDecimal : 0;
  const togglePick = (pick: Pick) => setPicks((current) => current.some((item) => item.gameId === pick.gameId && item.market === pick.market && item.outcome === pick.outcome && item.book === pick.book && item.point === pick.point) ? current.filter((item) => !(item.gameId === pick.gameId && item.market === pick.market && item.outcome === pick.outcome && item.book === pick.book && item.point === pick.point)) : [...current.filter((item) => item.gameId !== pick.gameId), pick]);

  return <div className="min-h-screen bg-[#f6f7f9] lg:flex"><Sidebar /><main className="min-w-0 flex-1 p-6 text-[#171717] lg:p-10"><div className="mx-auto max-w-7xl">
    <div className="mb-8"><p className="text-xs font-bold tracking-widest text-green-700">SPORTSBOOK COMPARISON</p><h1 className="mt-2 text-3xl font-bold">NFL Odds Dashboard</h1><p className="mt-2 text-gray-500">{status === "loading" ? "Loading odds…" : status === "error" ? "Odds service unavailable. Start npm run dev." : games.some((game) => game.is_sample) ? "Sample odds from the local database." : "Live odds from the connected Odds API."}</p></div>
    <div className="mb-8 grid gap-4 md:grid-cols-3">{[["Games Tracked", games.length], ["Sportsbooks", books.length], ["Arbitrage Finds", opportunities.length]].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200 bg-white p-6"><p className="text-sm text-gray-500">{label}</p><h2 className="mt-2 text-3xl font-bold">{value}</h2></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-6"><div><h2 className="text-xl font-bold">NFL Matchups</h2><p className="mt-1 text-sm text-gray-500">Click any price to add it to the demo bet slip.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teams..." className="rounded-lg border border-gray-300 px-4 py-2 text-sm" /></div><div className="flex gap-2 border-b border-gray-200 px-6 pt-4">{(Object.keys(marketLabels) as Market[]).map((item) => <button type="button" key={item} onClick={() => setMarket(item)} className={`border-b-2 px-3 pb-3 text-sm font-semibold ${market === item ? "border-green-700 text-green-700" : "border-transparent text-gray-500"}`}>{marketLabels[item]}</button>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-gray-500"><tr><th className="p-4">Matchup</th>{books.map((book) => <th key={book} className="p-4">{book}</th>)}</tr></thead><tbody>{visibleGames.map((game) => <tr key={game.id} className="border-t border-gray-200"><td className="p-4"><p className="font-semibold">{game.away_team}</p><p className="text-gray-500">vs. {game.home_team}</p><p className="mt-2 text-xs text-gray-400">{new Date(game.commence_time).toLocaleString()}</p></td>{books.map((book) => <td key={book} className="p-4"><div className="space-y-2">{(market === "h2h" ? [game.away_team, game.home_team] : market === "spreads" ? [game.away_team, game.home_team] : ["Over", "Under"]).map((outcome) => { const item = (game.books[book][market] ?? []).find((entry) => entry.outcome === outcome); if (!item) return <div key={outcome} className="rounded-md bg-gray-100 px-3 py-2 text-center text-gray-400">—</div>; const pick: Pick = { gameId: game.id, matchup: `${game.away_team} vs. ${game.home_team}`, book, market, outcome, price: item.price, point: item.point }; const selected = picks.some((choice) => choice.gameId === pick.gameId && choice.market === pick.market && choice.outcome === pick.outcome && choice.book === pick.book && choice.point === pick.point); const best = bestPick(game, market, outcome); const isBest = best?.book === book && best.price === item.price && best.point === item.point; return <button type="button" key={outcome} onClick={() => togglePick(pick)} className={`w-full rounded-md border px-3 py-2 text-center font-semibold transition ${selected ? "border-[#10151f] bg-[#10151f] text-white" : isBest ? "border-green-400 bg-green-100 text-green-800" : "border-transparent bg-gray-100 hover:border-gray-400"}`}>{formatPick(pick)}</button>; })}</div></td>)}</tr>)}{status === "ready" && visibleGames.length === 0 && <tr><td colSpan={Math.max(2, books.length + 1)} className="p-8 text-center text-gray-500">No matching games found.</td></tr>}</tbody></table></div></div>
    <aside className="h-fit rounded-xl border border-gray-200 bg-white p-5 xl:sticky xl:top-6"><div className="flex justify-between"><div><p className="text-xs font-bold tracking-widest text-green-700">DEMO ONLY</p><h2 className="mt-1 text-xl font-bold">Bet Slip</h2></div>{picks.length > 0 && <button type="button" onClick={() => setPicks([])} className="text-sm text-gray-500">Clear</button>}</div><p className="mt-2 text-sm text-gray-500">{picks.length > 1 ? "Parlay" : "Straight bet"} · {picks.length} selection{picks.length === 1 ? "" : "s"}</p>{picks.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">Select live odds to build a hypothetical bet.</p> : <><div className="mt-5 space-y-3">{picks.map((pick) => <div key={`${pick.gameId}-${pick.market}-${pick.outcome}-${pick.book}`} className="rounded-lg bg-gray-50 p-3"><div className="flex justify-between gap-2"><div><p className="font-semibold">{formatPick(pick)}</p><p className="mt-1 text-xs text-gray-500">{pick.book} · {pick.matchup}</p></div><button type="button" onClick={() => setPicks((current) => current.filter((item) => item !== pick))} className="text-gray-400">×</button></div></div>)}</div><label className="mt-5 block text-sm font-medium">Hypothetical stake<div className="mt-2 flex rounded-lg border border-gray-300 px-3"><span className="py-3 text-gray-500">$</span><input type="number" min="0" step="0.01" value={stake} onChange={(event) => setStake(event.target.value)} placeholder="0.00" className="w-full border-0 px-2 outline-none" /></div></label><div className="mt-4 space-y-2 border-t pt-4 text-sm">{picks.length > 1 && <div className="flex justify-between font-semibold"><span>Total parlay odds</span><span>{americanOdds(combinedDecimal)}</span></div>}<div className="flex justify-between text-gray-500"><span>Potential profit</span><span>${Math.max(potentialReturn - stakeAmount, 0).toFixed(2)}</span></div><div className="flex justify-between text-base font-bold"><span>Potential return</span><span>${potentialReturn.toFixed(2)}</span></div></div><p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo only. No real wager is placed.</p></>}</aside></div>
    <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-widest text-green-700">MARKET SCAN</p><h2 className="mt-1 text-2xl font-bold">Arbitrage Opportunities</h2><p className="mt-1 text-sm text-gray-500">Guaranteed labels use matching settlement lines only.</p></div><label className="text-sm font-medium">Total stake<div className="mt-1 flex rounded-lg border border-gray-300 px-3"><span className="py-2 text-gray-500">$</span><input type="number" min="1" step="1" value={arbStake} onChange={(event) => setArbStake(event.target.value)} className="w-20 border-0 px-2 outline-none" /></div></label></div>{opportunities.length === 0 ? <p className="py-8 text-sm text-gray-500">No arbitrage opportunities found in the current odds.</p> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{opportunities.map((opportunity) => { const total = Number(arbStake) || 100; const firstProbability = impliedProbability(opportunity.first.price); const secondProbability = impliedProbability(opportunity.second.price); const firstStake = total * firstProbability / opportunity.probability; const secondStake = total * secondProbability / opportunity.probability; const gross = total / opportunity.probability; return <article key={opportunity.id} className="rounded-xl border border-green-200 bg-green-50 p-5"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold text-green-700">GUARANTEED · {marketLabels[opportunity.market]}</p><h3 className="mt-1 font-bold">{opportunity.game.away_team} vs. {opportunity.game.home_team}</h3></div><span className="rounded-full bg-green-700 px-3 py-1 text-sm font-bold text-white">{opportunity.roi.toFixed(2)}% ROI</span></div><div className="mt-4 space-y-2 text-sm"><p><strong>{opportunity.first.book}</strong> · {formatPick(opportunity.first)} · ${firstStake.toFixed(2)}</p><p><strong>{opportunity.second.book}</strong> · {formatPick(opportunity.second)} · ${secondStake.toFixed(2)}</p></div><div className="mt-4 flex justify-between border-t border-green-200 pt-3 text-sm"><span>Implied probability: {(opportunity.probability * 100).toFixed(2)}%</span><strong>Guaranteed profit: ${(gross - total).toFixed(2)}</strong></div></article>; })}</div>}<p className="mt-5 text-xs leading-5 text-gray-500">Odds can change before wagers are accepted. Verify both prices and sportsbook settlement rules before relying on any theoretical opportunity.</p></section>
  </div></main></div>;
}
