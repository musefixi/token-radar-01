# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/musefixi/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/musefixi/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: every protocol in the frozen DefiLlama snapshot that records no token, ranked by what its token would be worth if it launched with the record it has today.

The model prices a launch the way the market already prices launched ones. For each category it takes the protocols in the snapshot whose token already trades and reads the median market-cap-to-TVL, shrunk toward the market-wide median by the number of comparables, so a lending market is priced like launched lending markets and not like a DEX. Three guards keep the calibration honest: a comparable must carry at least $10M of TVL of its own, every ratio is winsorised to [0.005, 2] before medians are taken, and a category with fewer than three launched comparables is priced at the market median outright. Each pre-token protocol's implied value is then `TVL × category multiple × growth × maturity × breadth`, where growth reads its 7-day TVL change, maturity how long it has been tracked with no token, and breadth how many chains it runs on. Every input is a field of the snapshot itself; no protocol is ever scored by name. Protocols whose token already trades are never ranked — they are the calibration set.

The board covers all 40 watchlist protocols, adds every other rankable pre-token protocol below the $50M floor — the early finds a radar exists for — and above the floor ranks the large pre-token protocols that pass every screen the snapshot carries, which the watchlist leaves out on its parent-protocol screen alone. The dashboard (static, no network) shows the ranked board with search, category / chain / segment filters and five sort orders; a detail view per protocol with its full pricing arithmetic and a generated farm plan (five concrete steps, each with a cost and a time, derived from the protocol's category, chains, TVL and age); the live calibration set; and a method page that states the model in full.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

Node 22.18 or later, standard library only, nothing to install. `--input` takes the snapshot file or the directory holding it; without `MAKEFUN_OUTPUT_DIR` the program writes to `/output`, and in the grader it reads `/input/snapshot.json`. It writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` to the output directory, deterministically: two runs over the same snapshot write the same bytes.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4yp70nzv&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
