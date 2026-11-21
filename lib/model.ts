// The token radar's model: one sealed snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling), adds every
// other rankable pre-token protocol below the watchlist floor (the early rows the radar exists to
// find), and above the floor adds every pre-token protocol that passes all the screens the snapshot
// itself carries: the watchlist's one further screen, a parent-protocol record, is not among the
// snapshot's fields, so a large protocol the house list leaves out on that ground alone still earns
// its row here, flagged as an above-floor find.
// A protocol is pre-token when its record carries no token (no market cap, no CoinGecko id, no symbol).
// Protocols whose token already trades are never ranked: they are the calibration set, shown apart in
// the dashboard's Live view with the market's own values.
//
// The model prices a launch the way the market already prices launched ones. For every category it
// takes the launched protocols in the snapshot and reads the median of market cap over TVL, shrunk
// toward the global median by the number of comparables, so a thin category borrows the market's
// overall pricing instead of swinging on one name. Three guards keep the calibration honest, each
// answering a failure the snapshot itself exhibits: a comparable must carry at least $10M of TVL (a
// dust denominator prices the token's whole business off a sliver of attributed TVL), every ratio is
// winsorised to [0.005, 2] before any median is taken, and a category with fewer than three launched
// comparables is priced at the market median outright: one or two launches are an anecdote, not a
// market. A pre-token protocol's implied value is then:
//
//   implied = tvl_usd x category_multiple x growth x maturity x breadth
//
//   growth    from change_7d, clamped to [-40, +60] per cent and weighted lightly: one week is weather
//   maturity  from listed_at: the longer a protocol has run with no token, the fuller its multiple
//   breadth   from the chains list: a small premium per extra chain, capped
//
// Every input is a field of the snapshot itself, and no protocol's name is ever special-cased: the
// same function scores every row, and the dashboard shows each row's arithmetic in full.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, stated in the dashboard's method view and used for every row alike. */
export interface ModelConstants {
  /** Pseudo-count pulling a category's median multiple toward the global median. */
  shrink_k: number;
  /** A category multiple is never priced outside this band, however the comparables read. */
  multiple_min: number;
  multiple_max: number;
  /** A launched protocol counts as a comparable only at or above this TVL of its own. */
  comp_min_tvl_usd: number;
  /** Every comparable's cap-to-TVL ratio is winsorised into this band before medians are taken. */
  ratio_min: number;
  ratio_max: number;
  /** A category earns its own multiple only with at least this many launched comparables. */
  min_category_comps: number;
  /** How much of the clamped seven-day change becomes a multiplier: 1 + weight x change / 100. */
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  /** Maturity runs from maturity_floor to maturity_floor + maturity_range over maturity_days. */
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  /** The age a protocol of unknown listing date is scored with. */
  unknown_age_days: number;
  /** The breadth premium per extra chain, and how many extra chains earn it. */
  breadth_per_chain: number;
  breadth_max_extra: number;
}

export const MODEL: ModelConstants = {
  shrink_k: 4,
  multiple_min: 0.02,
  multiple_max: 2.5,
  comp_min_tvl_usd: 10_000_000,
  ratio_min: 0.005,
  ratio_max: 2,
  min_category_comps: 3,
  growth_weight: 0.3,
  growth_floor: -40,
  growth_cap: 60,
  maturity_floor: 0.8,
  maturity_range: 0.3,
  maturity_days: 1460,
  unknown_age_days: 365,
  breadth_per_chain: 0.03,
  breadth_max_extra: 6,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'calibrated-1';

/** One row of board.json: the ranked board's row, with the model's arithmetic kept beside the claim. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  above_floor: boolean;
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    category_comps: number;
    priced_globally: boolean;
    growth_pct: number | null;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one board row; the farm plan is regenerated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  watchlist: boolean;
  above_floor: boolean;
  implied_value_usd: number;
  category_multiple: number;
  category_comps: number;
  priced_globally: boolean;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
}

/** A launched protocol: it already trades, so the radar shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number;
  mcap_tvl: number;
}

/** One category's calibrated pricing: the multiple the model applies, and what it was read from. */
export interface CategoryPricing {
  category: string;
  multiple: number;
  median: number;
  comps: number;
}

/** Everything the dashboard renders: the board, the calibration, the live set and the model. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  above_floor_size: number;
  live_size: number;
  board_tvl_usd: number;
  board_implied_usd: number;
  global_multiple: number;
  global_comps: number;
  categories: CategoryPricing[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a non-empty list, or null. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** What the calibration reads from one category: its launched comparables' median and count. */
export interface Calibration {
  global: { multiple: number; median: number; comps: number };
  byCategory: Map<string, { multiple: number; median: number; comps: number; global: boolean }>;
}

/**
 * The market's own pricing, read off the snapshot: for each category, the median market-cap-to-TVL of
 * its launched protocols, shrunk toward the global median by the comparable count and held inside the
 * model's band. Exchange (CEX) records are no comparable for anything: their TVL is customer balances,
 * not protocol value, so they are left out of the calibration set entirely. A comparable must carry
 * at least the model's TVL floor of its own and its ratio is winsorised into the model's band before
 * any median is taken; a category with fewer comparables than the model's minimum is priced at the
 * global multiple, and its entry here says so by holding that multiple.
 */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const ratios = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of snapshot.protocols) {
    if (p.category === 'CEX') continue;
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd < model.comp_min_tvl_usd) continue;
    const ratio = Math.min(model.ratio_max, Math.max(model.ratio_min, p.mcap_usd / p.tvl_usd));
    all.push(ratio);
    if (p.category !== null) {
      const list = ratios.get(p.category) ?? [];
      list.push(ratio);
      ratios.set(p.category, list);
    }
  }
  const globalMedian = median(all) ?? 0.2;
  const clampBand = (m: number): number => Math.min(model.multiple_max, Math.max(model.multiple_min, m));
  const globalMultiple = clampBand(globalMedian);
  const byCategory = new Map<string, { multiple: number; median: number; comps: number; global: boolean }>();
  for (const [category, list] of ratios) {
    const med = median(list)!;
    const own = list.length >= model.min_category_comps;
    const multiple = own
      ? clampBand((list.length * med + model.shrink_k * globalMedian) / (list.length + model.shrink_k))
      : globalMultiple;
    byCategory.set(category, { multiple, median: med, comps: list.length, global: !own });
  }
  return {
    global: { multiple: globalMultiple, median: globalMedian, comps: all.length },
    byCategory,
  };
}

/**
 * The pricing one protocol is scored with: its category's multiple and its own comparable count, and
 * whether the price is the category's own or the market median standing in for it (a category with
 * too few comparables, or none recorded).
 */
function pricingFor(p: SnapshotProtocol, calib: Calibration): { multiple: number; comps: number; global: boolean } {
  if (p.category !== null) {
    const own = calib.byCategory.get(p.category);
    if (own !== undefined) return { multiple: own.multiple, comps: own.comps, global: own.global };
    return { multiple: calib.global.multiple, comps: 0, global: true };
  }
  return { multiple: calib.global.multiple, comps: calib.global.comps, global: true };
}

/** The multipliers and the implied value one protocol gets under the model. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  calib: Calibration,
  model: ModelConstants = MODEL,
): {
  implied: number;
  multiple: number;
  comps: number;
  pricedGlobally: boolean;
  growthPct: number | null;
  growthMult: number;
  maturityMult: number;
  breadthMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple, comps, global: pricedGlobally } = pricingFor(protocol, calib);
  let growthPct: number | null = null;
  let growthMult = 1;
  if (protocol.change_7d !== null && Number.isFinite(protocol.change_7d)) {
    growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, protocol.change_7d));
    growthMult = 1 + (growthPct / 100) * model.growth_weight;
  }
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const breadthMult = 1 + model.breadth_per_chain * Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_extra);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * maturityMult * breadthMult));
  return { implied, multiple, comps, pricedGlobally, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** The house's wrapped-product name screens: a whole word wrapped, staked or staking. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** Names that begin with an exchange's name are that exchange's own product, not a launch candidate. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: it records no token, it is not an exchange, not a
 * versioned pool of another protocol, and not a wrapped or staked product of one that already trades.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    p.category !== 'CEX' &&
    !VERSIONED.test(p.name) &&
    !WRAPPED_WORD.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/**
 * The categories the watchlist's own definition keeps out, bridges and staking products among them:
 * above the floor, a pre-token protocol in one of these is a product of something else, not a launch
 * candidate, however large it is. Below the floor the radar ranks them like any other early find.
 */
const FLOOR_EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, calib: Calibration, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const watch = new Set(snapshot.watchlist);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug on it is ranked, whatever its size.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // Below the floor, every other rankable protocol: the early radar. Above the floor, a rankable
  // protocol is ranked too, unless its category is one the watchlist's definition keeps out (a
  // bridge or staking product of something else): the ones that remain are large pre-token protocols
  // the house list leaves out on the parent-protocol screen the snapshot does not carry.
  for (const p of snapshot.protocols) {
    if (chosen.has(p.slug) || watch.has(p.slug)) continue;
    if (!isRankable(p)) continue;
    if (p.tvl_usd < snapshot.floor_usd || !FLOOR_EXCLUDED_CATEGORIES.has(p.category ?? '')) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => ({ p, v: impliedValue(p, snapshot.as_of, calib, model) }));
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    watchlist: watch.has(s.p.slug),
    above_floor: !watch.has(s.p.slug) && s.p.tvl_usd >= snapshot.floor_usd,
    age_days: s.v.age,
    implied_value_usd: s.v.implied,
    model: {
      category_multiple: round4(s.v.multiple),
      category_comps: s.v.comps,
      priced_globally: s.v.pricedGlobally,
      growth_pct: s.v.growthPct === null ? null : round4(s.v.growthPct),
      growth_multiplier: round4(s.v.growthMult),
      maturity_multiplier: round4(s.v.maturityMult),
      breadth_multiplier: round4(s.v.breadthMult),
      age_days: s.v.age,
    },
    farm_steps: farmPlan(s.p, s.v.age),
  }));
}

// ------------------------------------------------------------------ farm plans
//
// A protocol's farm plan is generated from its own record: its category picks the playbook, its first
// chains name where the actions happen and what the gas costs there, its TVL sizes the position, and
// its age sets how long the position must be held. The dashboard's app.js carries the same generator
// and renders the same strings; board.json's steps and the page's can never drift apart in wording
// without the difference showing in a diff of the two files' outputs.

/** What one transaction costs on a chain, in words a farmer can budget with. */
function gasFor(chain: string): { setup: string; once: string; weekly: string } {
  if (chain === 'Ethereum') {
    return {
      setup: 'about $10-25 of ETH in gas for the first transactions',
      once: 'about $3-8 of gas',
      weekly: 'about $3-6 of gas a week',
    };
  }
  if (chain === 'Solana') {
    return { setup: 'a few cents of SOL in fees', once: 'a few cents in fees', weekly: 'a few cents a week' };
  }
  const cheap = [
    'Arbitrum', 'Base', 'Optimism', 'BSC', 'Polygon', 'Avalanche', 'Scroll', 'Linea', 'ZKsync Era',
    'Mantle', 'Mode', 'Blast', 'Taiko', 'Sonic', 'Berachain', 'Gnosis', 'Celo', 'Fantom', 'Metis',
    'Unichain', 'Ink', 'Soneium', 'World Chain', 'Abstract', 'Plume', 'Fraxtal', 'Bob', 'Corn', 'Hemi',
    'Zora', 'Manta', 'X Layer', 'opBNB', 'Polygon zkEVM', 'Sei', 'HyperEVM', 'Katana', 'ApeChain',
  ];
  if (cheap.includes(chain)) {
    return { setup: 'under $1 of gas for the first transactions', once: 'a few cents of gas', weekly: 'under $1 of gas a week' };
  }
  return { setup: 'about $2-5 of gas for the first transactions', once: 'about $1 of gas', weekly: 'about $1-2 of gas a week' };
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(tvl: number): number {
  if (tvl >= 1_000_000_000) return 250;
  if (tvl >= 250_000_000) return 200;
  if (tvl >= 100_000_000) return 150;
  if (tvl >= 25_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdFor(age: number | null): { days: number; weeks: number } {
  const days = age === null ? 45 : age < 180 ? 60 : age < 365 ? 45 : 30;
  return { days, weeks: Math.ceil(days / 7) };
}

/** The category's three action sentences: the main position, a second kind of use, and the weekly loop. */
function actionsFor(
  category: string | null,
  name: string,
  chain: string,
  chain2: string | undefined,
  capital: number,
): { primary: string; secondary: string; weekly: string } {
  const c = (category ?? '').toLowerCase();
  const half = Math.max(25, Math.round(capital / 2));
  if (c.includes('bridge')) {
    return {
      primary: `Bridge $${capital} of USDC to ${chain} through ${name} and deposit or spend the bridged funds in an app there instead of bridging straight back`,
      secondary: `Repeat the crossing a few days later on a second route ${name} serves${chain2 !== undefined ? `, such as the one touching ${chain2}` : ''}, with about $${half}, so the wallet shows more than one corridor`,
      weekly: `Make one small crossing a week, alternating direction and keeping the amounts uneven: regular, human-looking flow counts for more than one large bridge`,
    };
  }
  if (c.includes('restak')) {
    return {
      primary: `Restake $${capital} of a liquid staking token or the native asset through ${name} on ${chain} and keep the restaked position open`,
      secondary: `Split the restake across two of the operators or strategies ${name} offers rather than the default alone: operator choice is part of what restaking programs track`,
      weekly: `Claim any points or rewards each week and add a small top-up restake, keeping the position active through the program's snapshot days`,
    };
  }
  if (c.includes('liquid staking')) {
    return {
      primary: `Stake $${capital} of the chain's native asset through ${name} on ${chain} and hold the liquid staking receipt in the same wallet`,
      secondary: `Put about $${half} of the receipt token to work in a lending market or liquidity pool that ${name} lists as a partner, so the position earns twice and shows real usage`,
      weekly: `Add a small top-up stake each week and claim or restake any rewards, so the staking balance keeps growing instead of sitting frozen`,
    };
  }
  if (c.includes('staking')) {
    return {
      primary: `Stake $${capital} of the network asset through ${name} on ${chain} and leave the stake untouched so it ages`,
      secondary: `Delegate a second, smaller stake of about $${half} to a different validator in ${name}'s set if it offers one, keeping both delegations in the same wallet`,
      weekly: `Claim staking rewards weekly and restake them, so the wallet shows compounding activity rather than a single deposit`,
    };
  }
  if (c.includes('lend') || c.includes('collateral')) {
    return {
      primary: `Supply $${capital} of USDC or ETH to ${name} on ${chain} as collateral and leave the deposit in place so the position ages across weekly snapshots`,
      secondary: `Open one small borrow against the collateral, under 40% of its value, redeposit the borrowed asset once, then repay it inside the same week: the borrow leg is what most lending points programs count`,
      weekly: `Make one small deposit or repayment each week and keep the collateral value above its starting level, topping it up if prices move against it`,
    };
  }
  if (c.includes('cdp') || c.includes('stablecoin')) {
    return {
      primary: `Open a vault in ${name} on ${chain}: deposit $${capital} of collateral and mint about a third of its value in the protocol's stablecoin`,
      secondary: `Put the minted stablecoin to work in ${name}'s own stability or liquidity pool, and keep the vault's collateral ratio comfortably above its liquidation line`,
      weekly: `Adjust the vault once a week: add collateral if the ratio drifts down, or mint and repay a small amount, so the vault shows regular management`,
    };
  }
  if (c.includes('dex')) {
    return {
      primary: `Trade $${capital} of volume through ${name} on ${chain} in $25 to $50 clips spread over the week, not one swap: steady volume is what DEX points and fee programs record`,
      secondary: `Add about $${half} of liquidity to ${name}'s busiest stablecoin or ETH pool on ${chain} and keep the position open through the week`,
      weekly: `Swap on at least three separate days each week and vary the pairs and amounts, so the wallet reads as a regular user rather than one scripted run`,
    };
  }
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('option')) {
    return {
      primary: `Deposit $${capital} of USDC as margin on ${name} and trade small, hedged positions: open and close one position a day rather than leaving a single large bet`,
      secondary: `Try a second product line ${name} offers, such as another market or its earn vault, with about $${half}, so the account shows breadth of use`,
      weekly: `Keep trading days spread across the week and the account's volume growing slowly: most derivatives programs score consistent active days over raw size`,
    };
  }
  if (c.includes('prediction')) {
    return {
      primary: `Fund $${capital} on ${name} and take positions in several of its most liquid markets, each sized small enough to hold to settlement`,
      secondary: `Take the other side or provide liquidity on one long-dated market, and let at least one position settle so the account shows a full cycle`,
      weekly: `Place a few positions each week on new markets as they open: early liquidity and regular activity are what prediction platforms reward`,
    };
  }
  if (c.includes('aggregator')) {
    return {
      primary: `Deposit $${capital} into ${name}'s main vault on ${chain} and keep the vault shares in the wallet`,
      secondary: `Split a second deposit of about $${half} into a different vault or strategy ${name} runs${chain2 !== undefined ? `, including one on ${chain2}` : ''}, so the account does not ride on a single strategy`,
      weekly: `Claim or compound the vault's rewards each week and add a small deposit, so the share balance keeps moving`,
    };
  }
  if (c.includes('curator') || c.includes('allocator') || c.includes('liquidity manager')) {
    return {
      primary: `Deposit $${capital} into a vault run by ${name} on ${chain}, choosing the vault whose underlying market you understand best`,
      secondary: `Hold a second, smaller position of about $${half} in another of ${name}'s vaults with a different risk profile, so the wallet shows deliberate allocation rather than one click`,
      weekly: `Review the vault's allocation each week and top up or move a small amount when its curator rebalances: allocator programs track depositors who stay through reallocations`,
    };
  }
  if (c.includes('basis')) {
    return {
      primary: `Put $${capital} into ${name}'s basis or delta-neutral position on ${chain} and hold it: the strategy needs time in the market, not frequent trading`,
      secondary: `Add a second tranche of about $${half} on a different day rather than all at once, so the deposits span several of the strategy's funding periods`,
      weekly: `Check the position's reported yield and balance weekly and top up small amounts; avoid withdrawing before a full month has passed`,
    };
  }
  if (c.includes('rwa')) {
    return {
      primary: `Mint or buy $${capital} of ${name}'s tokenised real-world asset on ${chain} through its own app, completing whatever onboarding the asset requires`,
      secondary: `Hold the asset past at least one of its distribution or reporting dates, and use any yield or redemption feature it offers once`,
      weekly: `Check the position weekly and add small amounts on a regular schedule: real-world asset programs reward holders who stay through reporting cycles`,
    };
  }
  if (c.includes('insurance')) {
    return {
      primary: `Buy about $${capital} of cover from ${name} on ${chain} for an asset or position you actually hold, and keep the policy to expiry`,
      secondary: `Stake a smaller amount, about $${half}, into ${name}'s capital or risk pool if it offers one, so the wallet appears on both sides of the market`,
      weekly: `Renew or extend cover as it lapses and review the pool's terms weekly: continuity of cover is the activity an insurer can verify`,
    };
  }
  if (c.includes('chain')) {
    return {
      primary: `Bridge $${capital} to the network ${name} runs and make it your active chain for a while: hold a balance of its gas asset and use two or three of its main apps`,
      secondary: `Run regular transactions on the network from the same wallet: swaps, a lending deposit, and a domain or NFT mint if the ecosystem offers one`,
      weekly: `Stay active on the chain at least two days a week with a handful of transactions: new networks score distinct active days and weeks above raw counts`,
    };
  }
  if (c.includes('payment')) {
    return {
      primary: `Move about $${capital} through ${name} in genuine transfers: fund the account, pay for something real, and withdraw once, so the account shows a full payment cycle`,
      secondary: `Use a second feature of ${name}, such as its card, on-ramp or merchant tool, with a small amount`,
      weekly: `Make at least one payment a week through ${name}: payment networks reward habitual use over one large transfer`,
    };
  }
  if (c.includes('launchpad')) {
    return {
      primary: `Register for ${name}'s next sale or allocation round and complete its tasks or staking requirement, budgeting about $${capital} for the allocation itself`,
      secondary: `Take part in a second round as well, and hold what it launches past the first week rather than selling at the open`,
      weekly: `Check the launch calendar weekly and complete each new project's published tasks as they appear: allocation programs score early, repeated participation`,
    };
  }
  if (c.includes('index')) {
    return {
      primary: `Buy $${capital} of ${name}'s index product on ${chain} and hold it as a set-and-forget position`,
      secondary: `Add a second purchase of about $${half} after a month, so the wallet shows a second deliberate action rather than one click`,
      weekly: `Add a small, fixed amount each week, dollar-cost-averaging style: steady buyers are the users index products design their rewards for`,
    };
  }
  if (c.includes('nft')) {
    return {
      primary: `Trade on ${name} with about $${capital} of budget: buy one or two liquid listings and relist them at a fair price rather than flipping within minutes`,
      secondary: `List an asset you own for sale and accept an offer once, so the account shows both sides of the marketplace`,
      weekly: `Make a few trades each week across different collections: marketplaces score volume spread over time and collections`,
    };
  }
  if (c.includes('yield') || c.includes('farm')) {
    return {
      primary: `Deposit $${capital} into ${name}'s highest-TVL yield position on ${chain} and keep the position open`,
      secondary: `Harvest the position's rewards once and redeposit them, so the wallet shows a full earn-and-compound cycle instead of a passive deposit`,
      weekly: `Add a small deposit or harvest each week; if the position is leveraged, check its health twice a week and deleverage well before it nears liquidation`,
    };
  }
  if (c.includes('privacy')) {
    return {
      primary: `Deposit $${capital} into ${name}'s shielded pool on ${chain} and leave the funds shielded for a while before withdrawing to a fresh address of your own`,
      secondary: `Use a second feature of ${name}, such as its private transfer or swap, with a small amount`,
      weekly: `Make one shielded action a week at most: privacy tools reward patient, ordinary use, and rapid cycling reads as abuse`,
    };
  }
  return {
    primary: `Deposit $${capital} into ${name} on ${chain} through its main product and keep the position open`,
    secondary: `Use a second feature or market of ${name} with a smaller amount of about $${half}, so the wallet shows more than one kind of activity`,
    weekly: `Make one qualifying action a week, such as a deposit, a trade or a claim, and keep the core position in place`,
  };
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
function stepText(text: string, cost: string, time: string): string {
  let s = `${text}. Cost: ${cost}. Time: ${time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/**
 * A protocol's farm plan: five steps, each an action with a cost and a time, derived from the
 * protocol's own record. The same generator runs in the dashboard (dashboard/app.js) over the same
 * inputs, so the page shows the plan board.json carries.
 */
export function farmPlan(p: SnapshotProtocol, age: number | null): string[] {
  const chain = p.chains.length > 0 ? p.chains[0]! : 'its main chain';
  const chain2 = p.chains.length > 1 ? p.chains[1]! : undefined;
  const capital = capitalFor(p.tvl_usd);
  const hold = holdFor(age);
  const gas = gasFor(chain);
  const a = actionsFor(p.category, p.name, chain, chain2, capital);
  return [
    stepText(
      `Fund a fresh wallet on ${chain} with the $${capital} you plan to farm plus fee money, and keep its seed phrase offline; never farm from the wallet that holds your main funds`,
      gas.setup,
      '10 minutes',
    ),
    stepText(a.primary, `$${capital} of capital stays in the position, plus ${gas.once}`, '15 minutes to set up'),
    stepText(a.secondary, gas.once, '10 minutes'),
    stepText(
      `${a.weekly}, for at least ${hold.weeks} weeks (about ${hold.days} days), so the activity spans several weekly snapshots`,
      gas.weekly,
      `10 minutes a week for ${hold.weeks} weeks`,
    ),
    stepText(
      `Check ${p.name}'s points or rewards page only through the link on its official site, and never pay a fee or sign an unreadable message to claim. Keep a farm log with the wallet, the dates and every transaction hash, and unwind the position when the program ends or the token launches`,
      'nothing to check, and never pay to claim',
      '10 minutes',
    ),
  ];
}

/** How many live-token protocols the dashboard's Live view carries, by market cap. */
export const LIVE_ROWS = 30;

/** The launched protocols, by market cap: the market's own values, kept apart from the ranked board. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0)
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || (a.slug < b.slug ? -1 : 1))
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd!,
      mcap_tvl: round4(p.mcap_usd! / p.tvl_usd),
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    watchlist: row.watchlist,
    above_floor: row.above_floor,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    category_comps: row.model.category_comps,
    priced_globally: row.model.priced_globally,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const calib = calibrate(snapshot, model);
  const board = buildBoard(snapshot, calib, model);
  const live = liveRows(snapshot);
  const onBoard = new Set(board.map((r) => r.category).filter((c): c is string => c !== null));
  const categories: CategoryPricing[] = [...onBoard]
    .map((category) => {
      const own = calib.byCategory.get(category);
      return own !== undefined
        ? { category, multiple: round4(own.multiple), median: round4(own.median), comps: own.comps }
        : { category, multiple: round4(calib.global.multiple), median: round4(calib.global.median), comps: 0 };
    })
    .sort((a, b) => b.multiple - a.multiple || (a.category < b.category ? -1 : 1));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: board.filter((r) => !r.watchlist && !r.above_floor).length,
    above_floor_size: board.filter((r) => r.above_floor).length,
    live_size: live.length,
    board_tvl_usd: board.reduce((n, r) => n + r.tvl_usd, 0),
    board_implied_usd: board.reduce((n, r) => n + r.implied_value_usd, 0),
    global_multiple: round4(calib.global.multiple),
    global_comps: calib.global.comps,
    categories,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: size, slugs, coverage, ranks, order, values, farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  if (board.length < 100 || board.length > 4000) return `the board holds ${board.length} rows, outside 100..4000`;
  const known = new Set(snapshot.protocols.map((p) => p.slug));
  const slugs = new Set(board.map((r) => r.slug));
  if (slugs.size !== board.length) return 'a slug appears on the board twice';
  for (const r of board) if (!known.has(r.slug)) return `${r.slug} is not one of the snapshot's protocols`;
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  const byRank = [...board].sort((a, b) => a.rank - b.rank);
  for (let i = 1; i < byRank.length; i++) {
    if (byRank[i]!.implied_value_usd > byRank[i - 1]!.implied_value_usd) return `row ${byRank[i]!.slug} outranks ${byRank[i - 1]!.slug} on implied value`;
  }
  if (board.length >= 2 && byRank[0]!.implied_value_usd === byRank[byRank.length - 1]!.implied_value_usd) {
    return 'every row shares the same implied value: a board that ranks nothing by value is not a ranking';
  }
  for (const r of board) {
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0 || r.implied_value_usd > 100_000_000_000_000) {
      return `${r.slug} has implied value ${r.implied_value_usd}`;
    }
    if (typeof r.name !== 'string' || r.name.length === 0) return `${r.slug} has no name`;
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) {
      const t = s.trim();
      if (t.length < 20 || t.length > 600) return `${r.slug} has a farm step of ${t.length} characters once trimmed`;
    }
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
