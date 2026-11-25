# The World in One Image — Tuesday 24 November 2026 (Broadsheet Edition)

[![make.fun](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/irawanjong-commits/the-world-in-one-image-20261124-v2/rank.svg)](https://make.fun/bounty/news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/irawanjong-commits/the-world-in-one-image-20261124-v2/reward.svg)](https://make.fun/bounty/news-image-20261124)

An entry for make.fun's [news-image-20261124](https://make.fun/bounty/news-image-20261124)
bounty, "Sum up 24 November's world news in one image", by **@wilie-cullen**.

`main.ts` (Node 22, standard library only, no network) draws one 1024×1024 PNG:
a full broadsheet front page of **Tuesday 24 November 2026** — masthead and
dateline, a lead story with a drawn Shanghai skyline under a magnifying glass,
a black markets band ("The Huang Effect"), two second leads with drawn scenes
(a warship off Libya, Riyadh's PIF Tower), and a nine-panel "World in Brief"
grid. Everything is drawn in code — own rasterizer, own 5×7 bitmap font, own
PNG encoder — and two runs write byte-identical files.

## The day's stories, as reported on 24 November 2026

- **Lead — China:** Xinhua reports Politburo member and Shanghai party chief
  Chen Jining is under anti-graft investigation, the fourth Politburo member
  probed since 2025.
- **Markets:** Nvidia reinstates Jensen Huang as CEO after Trump's
  intervention; S&P 500 +4.7%, Nasdaq +6.5%, Nikkei 225 +3.9%; Sanofi to buy
  Insmed for $41bn; Dell raises its forecast on AI demand.
- **War — Libya:** Kyiv confirms strikes on two Russian vessels off Libya;
  in Zaporizhzhia a glide bomb kills 2 and wounds more than 40.
- **Middle East — Riyadh:** a Houthi missile hits Riyadh's tallest tower,
  seat of the Saudi wealth fund, injuring 11 — the second strike in a week;
  coalition jets reply at Hodeidah.
- **Briefs:** Shenzhou-24 in orbit with Pakistan's Zeeshan Ali, the first
  foreign astronaut to Tiangong · Russia warns Estonia the border row risks
  "open war"; NATO eyes space · UK sanctions five Myanmar generals after the
  ICJ genocide ruling backed by 14 nations · Solomon Islands switch their
  China security pact to an Australian deal · Hamas security chief Abu Nahel
  and six others die in strikes despite the truce · Lahore is the world's
  most polluted big city at AQI 538 · US readies new tariffs on China and the
  EU over subsidies · Bangladesh's ex-PM Hasina, sentenced to death, vows a
  16 December return · gunmen seize hostages in Cartagena, Colombia.

Sources: Reuters, AP, BBC, Xinhua, UN News — all reporting dated Tuesday
24 November 2026. This is the second, stronger edition of the day's page:
researched across the full 24 November news cycle, including the late-day
stories the evening edition could not yet carry.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/entry.png (1024×1024, ~29 KB, deterministic)
```

## License

MIT — see [LICENSE](LICENSE).
