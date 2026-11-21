/* Token Launch Radar: the board, a detail view per protocol, the live calibration set and the
   method, rendered from ../data.js (window.RADAR) with no network and no framework.
   The farm plan generator below is the same one lib/model.ts runs for board.json, over the same
   inputs, so the plan on this page is the plan the board carries. */
'use strict';

const R = window.RADAR;
const $view = document.getElementById('view');

/* ------------------------------------------------------------------ formatting */

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
function money(v) {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
  return '$' + v;
}
function moneyFull(v) {
  return '$' + Math.round(v).toLocaleString('en-US');
}
function pct(v) {
  if (v === null || v === undefined) return '<span class="mult">n/a</span>';
  const cls = v > 0 ? 'up' : v < 0 ? 'down' : '';
  return '<span class="' + cls + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + '%</span>';
}
function mult(x) {
  return 'x' + x.toFixed(3);
}
function ageText(days) {
  if (days === null || days === undefined) return 'unknown';
  if (days >= 730) return (days / 365.25).toFixed(1) + ' years';
  if (days >= 60) return Math.round(days / 30.44) + ' months';
  return days + ' days';
}

/* ------------------------------------------------------------------ farm plans
   The same generator as lib/model.ts (gasFor, capitalFor, holdFor, actionsFor, farmPlanParts):
   same inputs, same strings. board.json's farm_steps are these parts joined by stepText. */

function gasFor(chain) {
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

function capitalFor(tvl) {
  if (tvl >= 1_000_000_000) return 250;
  if (tvl >= 250_000_000) return 200;
  if (tvl >= 100_000_000) return 150;
  if (tvl >= 25_000_000) return 100;
  return 50;
}

function holdFor(age) {
  const days = age === null ? 45 : age < 180 ? 60 : age < 365 ? 45 : 30;
  return { days, weeks: Math.ceil(days / 7) };
}

function actionsFor(category, name, chain, chain2, capital) {
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

function farmPlanParts(row) {
  const chain = row.chains.length > 0 ? row.chains[0] : 'its main chain';
  const chain2 = row.chains.length > 1 ? row.chains[1] : undefined;
  const capital = capitalFor(row.tvl_usd);
  const hold = holdFor(row.age_days);
  const gas = gasFor(chain);
  const a = actionsFor(row.category, row.name, chain, chain2, capital);
  return [
    {
      text: `Fund a fresh wallet on ${chain} with the $${capital} you plan to farm plus fee money, and keep its seed phrase offline; never farm from the wallet that holds your main funds`,
      cost: gas.setup,
      time: '10 minutes',
    },
    { text: a.primary, cost: `$${capital} of capital stays in the position, plus ${gas.once}`, time: '15 minutes to set up' },
    { text: a.secondary, cost: gas.once, time: '10 minutes' },
    {
      text: `${a.weekly}, for at least ${hold.weeks} weeks (about ${hold.days} days), so the activity spans several weekly snapshots`,
      cost: gas.weekly,
      time: `10 minutes a week for ${hold.weeks} weeks`,
    },
    {
      text: `Check ${row.name}'s points or rewards page only through the link on its official site, and never pay a fee or sign an unreadable message to claim. Keep a farm log with the wallet, the dates and every transaction hash, and unwind the position when the program ends or the token launches`,
      cost: 'nothing to check, and never pay to claim',
      time: '10 minutes',
    },
  ];
}

function stepText(step) {
  let s = `${step.text}. Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

function farmPlan(row) {
  return farmPlanParts(row).map(stepText);
}

/* ------------------------------------------------------------------ chrome */

const bySlug = new Map(R.rows.map((r) => [r.slug, r]));

function header(active) {
  const tab = (href, label, key) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
  <div class="wrap">
    <div class="topbar">
      <div class="brand"><span class="livedot" aria-hidden="true"></span><span class="mark">TOKEN<b>RADAR</b></span></div>
      <div class="meta">Snapshot ${esc(R.as_of)} &middot; frozen, never updated
        <span class="src">${esc(R.source)}</span></div>
    </div>
    <nav class="tabs" aria-label="Views">
      ${tab('#/', 'The board', 'board')}
      ${tab('#/live', 'Already trading', 'live')}
      ${tab('#/method', 'How it prices', 'method')}
    </nav>
    <div class="tabrule"></div>`;
}

function footer() {
  return `
    <footer>
      <p><b>Reading this radar.</b> An implied value is this entry's own claim about what a protocol's
      token would be worth if it launched with the record the snapshot shows; it is not a prediction
      that a token will be issued, or when. The snapshot records what DefiLlama carried on
      ${esc(R.as_of)}: a protocol shown as pre-token is one whose record carries no token, and a record
      can be incomplete.</p>
      <p>Model ${esc(R.model_version)} &middot; board of ${R.board_size} pre-token protocols
      (${R.watchlist_size} watchlist, ${R.early_size} early finds below the $${(R.floor_usd / 1e6).toFixed(0)}M floor,
      ${R.above_floor_size} above-floor finds) &middot;
      static page, no network, data frozen in the snapshot.</p>
    </footer>
  </div>`;
}

/* ------------------------------------------------------------------ board view */

function boardParams() {
  const hash = location.hash;
  const q = hash.includes('?') ? new URLSearchParams(hash.slice(hash.indexOf('?') + 1)) : new URLSearchParams();
  return {
    q: q.get('q') ?? '',
    cat: q.get('cat') ?? '',
    chain: q.get('chain') ?? '',
    seg: q.get('seg') ?? 'all',
    sort: q.get('sort') ?? 'rank',
  };
}

function setBoardParams(p) {
  const q = new URLSearchParams();
  if (p.q) q.set('q', p.q);
  if (p.cat) q.set('cat', p.cat);
  if (p.chain) q.set('chain', p.chain);
  if (p.seg && p.seg !== 'all') q.set('seg', p.seg);
  if (p.sort && p.sort !== 'rank') q.set('sort', p.sort);
  const s = q.toString();
  history.replaceState(null, '', '#/' + (s ? '?' + s : ''));
}

function filteredRows(p) {
  let rows = R.rows.slice();
  if (p.seg === 'watch') rows = rows.filter((r) => r.watchlist);
  if (p.seg === 'early') rows = rows.filter((r) => !r.watchlist);
  if (p.cat) rows = rows.filter((r) => (r.category ?? '') === p.cat);
  if (p.chain) rows = rows.filter((r) => r.chains.includes(p.chain));
  if (p.q) {
    const needle = p.q.toLowerCase();
    rows = rows.filter(
      (r) => r.name.toLowerCase().includes(needle) || r.slug.includes(needle) || (r.category ?? '').toLowerCase().includes(needle),
    );
  }
  const by = {
    rank: (a, b) => a.rank - b.rank,
    tvl: (a, b) => b.tvl_usd - a.tvl_usd,
    change: (a, b) => (b.change_7d ?? -Infinity) - (a.change_7d ?? -Infinity),
    age: (a, b) => (b.age_days ?? -1) - (a.age_days ?? -1),
    multiple: (a, b) => b.implied_value_usd / b.tvl_usd - a.implied_value_usd / a.tvl_usd,
  };
  rows.sort(by[p.sort] ?? by.rank);
  return rows;
}

function renderBoard() {
  const p = boardParams();
  const rows = filteredRows(p);
  const cats = [...new Set(R.rows.map((r) => r.category).filter(Boolean))].sort();
  const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
  const maxImplied = rows.reduce((m, r) => Math.max(m, r.implied_value_usd), 0);
  const chips = R.categories
    .slice(0, 10)
    .map((c) => `<span class="chip">${esc(c.category)} <b>${mult(c.multiple)}</b> &middot; ${c.comps} launched</span>`)
    .join('');
  const segBtn = (seg, label) => `<button type="button" data-seg="${seg}" aria-pressed="${p.seg === seg}">${label}</button>`;
  const body = rows
    .map((r) => {
      const w = maxImplied > 0 ? Math.max(2, Math.round((r.implied_value_usd / maxImplied) * 100)) : 0;
      return `<tr data-slug="${esc(r.slug)}" tabindex="0">
        <td class="rank${r.rank <= 3 ? ' top' : ''}">#${r.rank}</td>
        <td><span class="pname"><a href="#/p/${esc(r.slug)}">${esc(r.name)}</a></span>${
          r.watchlist
            ? '<span class="badge watch">WATCHLIST</span>'
            : r.above_floor
              ? '<span class="badge floor">ABOVE FLOOR</span>'
              : '<span class="badge early">EARLY</span>'
        }<span class="pname"><span class="cat">${esc(r.category ?? 'Uncategorised')}</span></span></td>
        <td class="chains hidem">${esc(r.chains.slice(0, 2).join(', '))}${r.chains.length > 2 ? ` +${r.chains.length - 2}` : ''}</td>
        <td class="num">${money(r.tvl_usd)}</td>
        <td class="num hidem">${pct(r.change_7d)}</td>
        <td class="num">${money(r.implied_value_usd)}<span class="bar"><i style="width:${w}%"></i></span><span class="mult">${mult(r.implied_value_usd / r.tvl_usd)} of TVL</span></td>
      </tr>`;
    })
    .join('');
  $view.innerHTML =
    header('board') +
    `<section class="hero">
       <h1>Protocols whose token does not exist yet, <span class="hl">priced like the ones that do.</span></h1>
       <p>Every protocol in the frozen DefiLlama snapshot that records no token, ranked by an implied
       launch value. The price of a category is read off the protocols in it that already trade, so a
       lending market is priced like launched lending markets, not like a DEX. Protocols that already
       trade are never ranked: they are the calibration set, under Already trading. Above the
       watchlist's floor the radar also ranks the large pre-token protocols the house list leaves out
       on a screen the snapshot does not carry, flagged ABOVE FLOOR.</p>
       <div class="stats">
         <div class="stat"><div class="v">${R.board_size}</div><div class="k">pre-token protocols ranked</div></div>
         <div class="stat"><div class="v">${R.watchlist_size}<span class="unit"> / ${R.watchlist_size}</span></div><div class="k">watchlist protocols covered</div></div>
         <div class="stat"><div class="v">${R.early_size}</div><div class="k">early finds below the $${(R.floor_usd / 1e6).toFixed(0)}M floor</div></div>
         <div class="stat"><div class="v">${money(R.board_implied_usd)}</div><div class="k">combined implied value of the board</div></div>
       </div>
     </section>
     <section class="modelstrip">
       <div class="formula">implied value = TVL &times; <b>category multiple</b> &times; growth &times; maturity &times; breadth</div>
       <p>The category multiple is the median market-cap-to-TVL of the category's launched protocols in
       this same snapshot, shrunk toward the market median (${mult(R.global_multiple)} over ${R.global_comps}
       launched protocols) when a category has few. Growth reads the 7-day TVL change, maturity the time
       tracked with no token, breadth the chain count. <a href="#/method">The full method</a>.</p>
       <div class="chips">${chips}</div>
     </section>
     <form class="controls" id="controls">
       <label for="q">Search</label>
       <input type="search" id="q" placeholder="Name, slug or category" value="${esc(p.q)}">
       <label for="cat">Category</label>
       <select id="cat"><option value="">All categories</option>${cats
         .map((c) => `<option value="${esc(c)}"${p.cat === c ? ' selected' : ''}>${esc(c)}</option>`)
         .join('')}</select>
       <label for="chain">Chain</label>
       <select id="chain"><option value="">All chains</option>${chains
         .map((c) => `<option value="${esc(c)}"${p.chain === c ? ' selected' : ''}>${esc(c)}</option>`)
         .join('')}</select>
       <span class="seg" role="group" aria-label="Segment">
         ${segBtn('all', 'All')}${segBtn('watch', 'Watchlist')}${segBtn('early', 'Radar finds')}
       </span>
       <label for="sort">Sort</label>
       <select id="sort">
         ${[
           ['rank', 'Implied value (rank)'],
           ['tvl', 'TVL'],
           ['change', '7-day change'],
           ['age', 'Time without a token'],
           ['multiple', 'Implied / TVL'],
         ]
           .map(([v, label]) => `<option value="${v}"${p.sort === v ? ' selected' : ''}>${label}</option>`)
           .join('')}
       </select>
       <span class="count">${rows.length} of ${R.board_size} shown</span>
     </form>
     ${
       rows.length === 0
         ? '<div class="empty">No protocol on the board matches those filters.</div>'
         : `<table class="board"><thead><tr>
             <th>Rank</th><th>Protocol</th><th class="hidem">Chains</th>
             <th class="num">TVL</th><th class="num hidem">7d</th><th class="num">Implied value</th>
           </tr></thead><tbody>${body}</tbody></table>`
     }` +
    footer();
  $view.setAttribute('aria-busy', 'false');

  const form = document.getElementById('controls');
  const update = () => {
    setBoardParams({
      q: document.getElementById('q').value.trim(),
      cat: document.getElementById('cat').value,
      chain: document.getElementById('chain').value,
      seg: form.dataset.seg ?? p.seg,
      sort: document.getElementById('sort').value,
    });
    renderBoard();
    const q = document.getElementById('q');
    q.focus();
    q.setSelectionRange(q.value.length, q.value.length);
  };
  form.dataset.seg = p.seg;
  form.addEventListener('submit', (e) => e.preventDefault());
  document.getElementById('q').addEventListener('input', update);
  document.getElementById('cat').addEventListener('change', update);
  document.getElementById('chain').addEventListener('change', update);
  document.getElementById('sort').addEventListener('change', update);
  form.querySelectorAll('[data-seg]').forEach((b) =>
    b.addEventListener('click', () => {
      form.dataset.seg = b.dataset.seg;
      update();
    }),
  );
  $view.querySelectorAll('tr[data-slug]').forEach((tr) => {
    tr.addEventListener('click', (e) => {
      if (e.target.tagName !== 'A') location.hash = '#/p/' + tr.dataset.slug;
    });
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') location.hash = '#/p/' + tr.dataset.slug;
    });
  });
}

/* ------------------------------------------------------------------ detail view */

function renderDetail(slug) {
  const r = bySlug.get(slug);
  if (r === undefined) {
    renderBoard();
    return;
  }
  const steps = farmPlanParts(r);
  const prev = R.rows.find((x) => x.rank === r.rank - 1);
  const next = R.rows.find((x) => x.rank === r.rank + 1);
  const growthNote =
    r.change_7d === null
      ? 'no 7-day change in the record: scored neutral'
      : `${r.change_7d > 0 ? '+' : ''}${r.change_7d.toFixed(1)}% TVL in 7 days, clamped and weighted at 0.30`;
  $view.innerHTML =
    header('board') +
    `<a class="back" href="#/">&larr; Back to the board</a>
     <div class="detail-head">
       <h1>${esc(r.name)}</h1>
       ${r.watchlist ? '<span class="badge watch">WATCHLIST</span>' : r.above_floor ? '<span class="badge floor">ABOVE-FLOOR FIND</span>' : '<span class="badge early">EARLY FIND</span>'}
       <span class="sub">Rank #${r.rank} of ${R.board_size} &middot; ${esc(r.category ?? 'Uncategorised')} &middot; records no token</span>
     </div>
     <div class="bigvalue">${moneyFull(r.implied_value_usd)} <small>implied launch value</small></div>
     <div class="panels">
       <section class="panel">
         <h2>Why this value</h2>
         <table class="factors">
           <tr><td>TVL in the snapshot<span class="why">the protocol's own figure, frozen ${esc(R.as_of)}</span></td><td class="v">${moneyFull(r.tvl_usd)}</td></tr>
           <tr><td>Category multiple<span class="why">${
             r.priced_globally
               ? `priced at the market median: ${r.category_comps === 0 ? 'no' : `only ${r.category_comps}`} launched ${esc(r.category ?? 'protocol')} comparable${r.category_comps === 1 ? '' : 's'} in the snapshot, too few to price a category`
               : `${esc(r.category ?? 'All categories')}: median of ${r.category_comps} launched protocols, shrunk toward the market median`
           }</span></td><td class="v">&times; ${r.category_multiple.toFixed(3)}</td></tr>
           <tr><td>Growth<span class="why">${esc(growthNote)}</span></td><td class="v">&times; ${r.growth_multiplier.toFixed(3)}</td></tr>
           <tr><td>Maturity<span class="why">tracked ${ageText(r.age_days)} with no token${r.listed_at ? ` (since ${esc(r.listed_at)})` : ''}</span></td><td class="v">&times; ${r.maturity_multiplier.toFixed(3)}</td></tr>
           <tr><td>Breadth<span class="why">${r.chains.length} chain${r.chains.length === 1 ? '' : 's'} in the record</span></td><td class="v">&times; ${r.breadth_multiplier.toFixed(3)}</td></tr>
           <tr class="total"><td>Implied value</td><td class="v">${moneyFull(r.implied_value_usd)}</td></tr>
         </table>
       </section>
       <section class="panel">
         <h2>The record</h2>
         <dl class="facts">
           <dt>Slug</dt><dd>${esc(r.slug)}</dd>
           <dt>Category</dt><dd>${esc(r.category ?? 'none recorded')}</dd>
           <dt>Chains</dt><dd>${esc(r.chains.join(', ') || 'none recorded')}</dd>
           <dt>TVL</dt><dd>${moneyFull(r.tvl_usd)}</dd>
           <dt>7-day change</dt><dd>${r.change_7d === null ? 'not reported' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(2) + '%'}</dd>
           <dt>Tracked since</dt><dd>${r.listed_at ? esc(r.listed_at) : 'not recorded'} (${ageText(r.age_days)})</dd>
           <dt>Token</dt><dd>none in the record</dd>
         </dl>
       </section>
     </div>
     <section class="panel" style="margin-top:14px">
       <h2>How to farm it</h2>
       <ol class="steps">
         ${steps
           .map(
             (s) => `<li>${esc(s.text)}.<span class="ct">Cost: ${esc(s.cost)} &middot; Time: ${esc(s.time)}</span></li>`,
           )
           .join('')}
       </ol>
     </section>
     <div class="prevnext">
       <span>${prev ? `<a href="#/p/${esc(prev.slug)}">&larr; #${prev.rank} ${esc(prev.name)}</a>` : ''}</span>
       <span>${next ? `<a href="#/p/${esc(next.slug)}">#${next.rank} ${esc(next.name)} &rarr;</a>` : ''}</span>
     </div>` +
    footer();
  $view.setAttribute('aria-busy', 'false');
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------------ live view */

function renderLive() {
  const body = R.live
    .map(
      (p) => `<tr>
        <td><span class="pname">${esc(p.name)}</span><span class="pname"><span class="cat">${esc(p.category ?? 'Uncategorised')}</span></span></td>
        <td class="chains">${esc(p.chains.slice(0, 2).join(', '))}${p.chains.length > 2 ? ` +${p.chains.length - 2}` : ''}</td>
        <td class="num">${money(p.tvl_usd)}</td>
        <td class="num">${money(p.mcap_usd)}</td>
        <td class="num">${mult(p.mcap_tvl)}</td>
      </tr>`,
    )
    .join('');
  $view.innerHTML =
    header('live') +
    `<div class="prose">
       <h2>Already trading: the calibration set</h2>
       <p>These protocols' tokens exist, so the radar never ranks them and never guesses their value:
       it shows the market's own. They are here because they set the board's prices. Each category's
       multiple is the <b>median market-cap-to-TVL</b> of its launched protocols in this snapshot,
       shrunk toward the market median (${mult(R.global_multiple)}, ${R.global_comps} launched protocols)
       by how many comparables the category has. The ${R.live_size} largest by market cap are shown;
       the calibration uses every launched protocol in the snapshot, exchanges excluded.</p>
     </div>
     <table class="plain"><thead><tr><th>Protocol</th><th>Chains</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Cap / TVL</th></tr></thead>
     <tbody>${body}</tbody></table>` +
    footer();
  $view.setAttribute('aria-busy', 'false');
}

/* ------------------------------------------------------------------ method view */

function renderMethod() {
  const catRows = R.categories
    .map(
      (c) => `<tr><td>${esc(c.category)}</td><td class="num">${c.comps}</td><td class="num">${mult(c.median)}</td><td class="num">${mult(c.multiple)}</td></tr>`,
    )
    .join('');
  $view.innerHTML =
    header('method') +
    `<div class="prose">
       <h2>How the radar prices a launch</h2>
       <p>The board asks one question of every protocol that records no token: <b>if it issued its token
       with the record it has today, what would the market pay for it?</b> The answer is built only from
       the snapshot's own figures, the same figures for every protocol, with no name ever scored by
       hand.</p>
       <p class="formula">implied value = TVL &times; category multiple &times; growth &times; maturity &times; breadth</p>
       <h2>The category multiple: priced by its own kind</h2>
       <p>A lending market and a DEX with the same TVL do not launch at the same price, and the snapshot
       itself says by how much: for each category, take every protocol in it whose token already trades
       and read the <b>median of market cap over TVL</b>. Three guards keep that reading honest, each
       answering a failure this snapshot exhibits. A comparable must carry at least $10M of TVL of its
       own: below that, a ratio prices the token's whole business off a sliver of attributed TVL (one
       prediction protocol in this snapshot reads x400 on $6.6M of TVL). Every ratio is winsorised to
       x0.005..x2.000 before any median is taken. And a category with fewer than three launched
       comparables is priced at the market median outright: one or two launches are an anecdote, not a
       market. With three or more, the median is shrunk toward the market-wide median
       (${mult(R.global_multiple)} across ${R.global_comps} launched comparables) with a weight of four
       phantom comparables, and every multiple is held between x0.020 and x2.500. Exchange records are
       excluded from the calibration entirely: an exchange's TVL is customer balances, not protocol
       value.</p>
       <table class="plain"><thead><tr><th>Category</th><th class="num">Launched comps</th><th class="num">Median cap / TVL</th><th class="num">Multiple applied</th></tr></thead>
       <tbody>${catRows}</tbody></table>
       <p>Categories whose launched comps number fewer than three show the market median as their
       applied multiple, whatever their own median reads; the median column is their comparables' own
       figure, kept visible so the substitution is never hidden.</p>
       <h2>The other three factors</h2>
       <p><b>Growth</b> reads the protocol's 7-day TVL change, clamped to -40%..+60% and weighted at
       0.30, so one hot week moves a price by at most about a fifth: a week is weather, not climate. A
       protocol whose record carries no 7-day change is scored neutral.</p>
       <p><b>Maturity</b> reads how long DefiLlama has tracked the protocol with no token, from
       x${R.model.maturity_floor.toFixed(2)} for a brand-new listing to x${(R.model.maturity_floor + R.model.maturity_range).toFixed(2)}
       at four years: a protocol that has run for years without a token has a product the market can
       price, and a launch on that record is worth more than the same TVL at a month old. An unknown
       listing date is scored at one year.</p>
       <p><b>Breadth</b> adds x${R.model.breadth_per_chain.toFixed(2)} for each chain beyond the first, up to
       six: distribution across chains is part of what a launch sells.</p>
       <h2>Who is on the board</h2>
       <p>Every protocol on the snapshot's watchlist is ranked, all ${R.watchlist_size} of them: that is
       the floor. Below the $${(R.floor_usd / 1e6).toFixed(0)}M floor the radar adds every other protocol
       that records no token and passes the house's own screens: not an exchange, not a versioned pool
       of another protocol, and not a wrapped or staked product of a token that already trades
       (${R.early_size} early finds). Above the floor it applies the same screens plus the watchlist's
       category exclusions (no bridges, no staking products), and ranks what remains
       (${R.above_floor_size} protocols): large pre-token protocols the house list leaves out on its
       one further screen, a parent-protocol record that the snapshot does not carry, so this radar
       cannot apply it and says so. Protocols whose token already trades are never ranked; they
       calibrate, under Already trading.</p>
       <h2>The farm plans</h2>
       <p>Each row's plan is generated from its own record: the category picks the playbook (a lending
       market is farmed by supplying and borrowing, a DEX by volume and liquidity), the protocol's first
       chains name where to act and what gas costs there, its TVL sizes the suggested position, and its
       age sets how many weeks the position must be held to span several snapshots. Every step states
       its cost and its time.</p>
       <h2>What this is not</h2>
       <p>An implied value is a claim, not a forecast: it says nothing about whether a token will be
       issued, when, or on what terms, and a protocol's DefiLlama record can omit a token it in fact
       has. The snapshot is frozen at ${esc(R.as_of)} and never updated, so the board ages with it.
       Farm plans are starting points for your own research, not financial advice; never farm with
       funds you cannot afford to lose, and never pay anyone to "claim" an airdrop.</p>
     </div>` +
    footer();
  $view.setAttribute('aria-busy', 'false');
}

/* ------------------------------------------------------------------ routing */

function route() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#/p/')) {
    renderDetail(decodeURIComponent(hash.slice(4).split('?')[0]));
  } else if (hash.startsWith('#/live')) {
    renderLive();
  } else if (hash.startsWith('#/method')) {
    renderMethod();
  } else {
    renderBoard();
  }
}

window.addEventListener('hashchange', route);
route();
