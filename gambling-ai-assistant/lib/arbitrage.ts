export type Market = "h2h" | "spreads" | "totals";

export type Outcome = {
  outcome: string;
  price: number;
  point?: number | null;
};

export type ApiGame = {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  is_sample: boolean;
  books: Record<string, Partial<Record<Market, Outcome[]>>>;
};

export type ArbitrageOpportunity = {
  id: string;
  gameId: string;
  matchup: string;
  market: Market;
  first: Outcome & { sportsbook: string };
  second: Outcome & { sportsbook: string };
  third?: Outcome & { sportsbook: string };
  combinedProbability: number;
  theoreticalRoi: number;
  minimumProfit: number;
  hasMiddle: boolean;
  classification: "guaranteed" | "push-exposed" | "middle" | "not-guaranteed" | "theoretical";
  note: string;
};

type PricedOutcome = Outcome & { sportsbook: string };

export function impliedProbability(price: number) {
  return price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100);
}

function decimalOdds(price: number) {
  return price > 0 ? 1 + price / 100 : 1 + 100 / Math.abs(price);
}

function outcomeResult(value: number, point: number) {
  const result = value + point;
  if (Math.abs(result) < 0.000001) return "push" as const;
  return result > 0 ? "win" as const : "loss" as const;
}

function totalResult(total: number, side: "Over" | "Under", point: number) {
  const result = side === "Over" ? total - point : point - total;
  if (Math.abs(result) < 0.000001) return "push" as const;
  return result > 0 ? "win" as const : "loss" as const;
}

function allocation(first: PricedOutcome, second: PricedOutcome) {
  const firstDecimal = decimalOdds(first.price);
  const secondDecimal = decimalOdds(second.price);
  const firstStake = secondDecimal / (firstDecimal + secondDecimal);
  return { firstStake, secondStake: 1 - firstStake, firstDecimal, secondDecimal };
}

function profit(result: "win" | "push" | "loss", stake: number, decimal: number) {
  if (result === "win") return stake * (decimal - 1);
  if (result === "push") return 0;
  return -stake;
}

function allPriced(game: ApiGame, market: Market, outcome: string): PricedOutcome[] {
  return Object.entries(game.books).flatMap(([sportsbook, markets]) =>
    (markets[market] ?? [])
      .filter((item) => item.outcome === outcome)
      .map((item) => ({ ...item, sportsbook })),
  );
}

function makeOpportunity(
  game: ApiGame,
  market: Market,
  first: PricedOutcome,
  second: PricedOutcome,
  minimumProfit: number,
  hasMiddle: boolean,
  classification: ArbitrageOpportunity["classification"],
  note: string,
): ArbitrageOpportunity {
  const combinedProbability = impliedProbability(first.price) + impliedProbability(second.price);
  return {
    id: `${game.id}:${market}:${first.sportsbook}:${first.outcome}:${first.point ?? ""}:${second.sportsbook}:${second.outcome}:${second.point ?? ""}`,
    gameId: game.id,
    matchup: `${game.away_team} vs. ${game.home_team}`,
    market,
    first,
    second,
    combinedProbability,
    theoreticalRoi: (1 / combinedProbability - 1) * 100,
    minimumProfit,
    hasMiddle,
    classification,
    note,
  };
}

function makeThreeWayMoneyline(game: ApiGame, first: PricedOutcome, second: PricedOutcome, third: PricedOutcome): ArbitrageOpportunity {
  const combinedProbability = impliedProbability(first.price) + impliedProbability(second.price) + impliedProbability(third.price);
  const minimumProfit = 1 / combinedProbability - 1;
  return {
    id: `${game.id}:h2h:${first.sportsbook}:${second.sportsbook}:${third.sportsbook}`,
    gameId: game.id,
    matchup: `${game.away_team} vs. ${game.home_team}`,
    market: "h2h",
    first,
    second,
    third,
    combinedProbability,
    theoreticalRoi: minimumProfit * 100,
    minimumProfit,
    hasMiddle: false,
    classification: "guaranteed",
    note: "All listed moneyline settlement outcomes, including a draw, are covered.",
  };
}

function analyzeSpread(game: ApiGame, first: PricedOutcome, second: PricedOutcome) {
  if (first.point == null || second.point == null) return null;
  const stakes = allocation(first, second);
  let minimumProfit = Infinity;
  let hasMiddle = false;
  let hasPush = false;
  let hasUncovered = false;

  // NFL score margins are integers. The endpoints represent every behavior beyond them too.
  for (let margin = -100; margin <= 100; margin += 1) {
    const firstResult = outcomeResult(margin, first.point);
    const secondResult = outcomeResult(-margin, second.point);
    const net = profit(firstResult, stakes.firstStake, stakes.firstDecimal)
      + profit(secondResult, stakes.secondStake, stakes.secondDecimal);
    minimumProfit = Math.min(minimumProfit, net);
    hasMiddle ||= firstResult === "win" && secondResult === "win";
    hasPush ||= firstResult === "push" || secondResult === "push";
    hasUncovered ||= firstResult === "loss" && secondResult === "loss";
  }

  const classification = minimumProfit > 0.000001
    ? "guaranteed"
    : hasMiddle && !hasUncovered
      ? "middle"
      : hasPush && minimumProfit >= -0.000001
        ? "push-exposed"
        : "not-guaranteed";
  const note = classification === "guaranteed"
    ? hasMiddle ? "Guaranteed profit across every final margin; some margins win both bets." : "Guaranteed profit across every final margin."
    : classification === "middle"
      ? "Potential middle: both bets can win for some final margins, but the worst-case result is not guaranteed profit."
      : classification === "push-exposed"
        ? "All margins are covered, but a push can reduce the result to break-even."
        : hasUncovered
          ? "Some final margins lose both bets or otherwise produce a loss."
          : "Settlement outcomes do not guarantee a profit.";
  return makeOpportunity(game, "spreads", first, second, minimumProfit, hasMiddle, classification, note);
}

function analyzeTotal(game: ApiGame, over: PricedOutcome, under: PricedOutcome) {
  if (over.point == null || under.point == null) return null;
  const stakes = allocation(over, under);
  let minimumProfit = Infinity;
  let hasMiddle = false;
  let hasPush = false;
  let hasUncovered = false;

  for (let total = 0; total <= 200; total += 1) {
    const overResult = totalResult(total, "Over", over.point);
    const underResult = totalResult(total, "Under", under.point);
    const net = profit(overResult, stakes.firstStake, stakes.firstDecimal)
      + profit(underResult, stakes.secondStake, stakes.secondDecimal);
    minimumProfit = Math.min(minimumProfit, net);
    hasMiddle ||= overResult === "win" && underResult === "win";
    hasPush ||= overResult === "push" || underResult === "push";
    hasUncovered ||= overResult === "loss" && underResult === "loss";
  }

  const classification = minimumProfit > 0.000001
    ? "guaranteed"
    : hasMiddle && !hasUncovered
      ? "middle"
      : hasPush && minimumProfit >= -0.000001
        ? "push-exposed"
        : "not-guaranteed";
  const note = classification === "guaranteed"
    ? hasMiddle ? "Guaranteed profit across every final total; some totals win both bets." : "Guaranteed profit across every final total."
    : classification === "middle"
      ? "Potential middle: both bets can win for some final totals, but the worst-case result is not guaranteed profit."
      : classification === "push-exposed"
        ? "All totals are covered, but a push can reduce the result to break-even."
        : hasUncovered
          ? "Some final totals lose both bets or otherwise produce a loss."
          : "Settlement outcomes do not guarantee a profit.";
  return makeOpportunity(game, "totals", over, under, minimumProfit, hasMiddle, classification, note);
}

export function analyzeArbitrage(games: ApiGame[]) {
  const opportunities: ArbitrageOpportunity[] = [];

  for (const game of games) {
    const awayMoneyline = allPriced(game, "h2h", game.away_team);
    const homeMoneyline = allPriced(game, "h2h", game.home_team);
    const draws = allPriced(game, "h2h", "Draw");
    for (const away of awayMoneyline) for (const home of homeMoneyline) {
      if (draws.length) {
        for (const draw of draws) {
          if (impliedProbability(away.price) + impliedProbability(home.price) + impliedProbability(draw.price) < 1) {
            opportunities.push(makeThreeWayMoneyline(game, away, home, draw));
          }
        }
      } else {
        const combined = impliedProbability(away.price) + impliedProbability(home.price);
        if (combined < 1) {
          opportunities.push(makeOpportunity(
            game, "h2h", away, home, -1, false, "theoretical",
            "The API supplies two moneyline outcomes, but tie settlement is not confirmed; shown as theoretical, not guaranteed.",
          ));
        }
      }
    }

    const awaySpreads = allPriced(game, "spreads", game.away_team);
    const homeSpreads = allPriced(game, "spreads", game.home_team);
    for (const away of awaySpreads) for (const home of homeSpreads) {
      const result = analyzeSpread(game, away, home);
      if (result && (result.minimumProfit >= -0.000001 || result.hasMiddle || result.combinedProbability < 1)) opportunities.push(result);
    }

    const overs = allPriced(game, "totals", "Over");
    const unders = allPriced(game, "totals", "Under");
    for (const over of overs) for (const under of unders) {
      const result = analyzeTotal(game, over, under);
      if (result && (result.minimumProfit >= -0.000001 || result.hasMiddle || result.combinedProbability < 1)) opportunities.push(result);
    }
  }

  return opportunities.sort((a, b) => b.minimumProfit - a.minimumProfit || b.theoreticalRoi - a.theoreticalRoi);
}
