# Nikunj Prajapati

**Lead Software Engineer / iOS Architect**

> I build software for the moments when ordinary software breaks.

I architect and ship iOS systems that hold up in the real world: offline, in bad
conditions, wired into sensors, and increasingly with AI that has to do more
than talk.

**[nikunj-io.github.io](https://nikunj-io.github.io/)** · [LinkedIn](https://www.linkedin.com/in/nikunjprajapati) · [GitHub](https://github.com/prajapati-nikunj) · India

---

## What I work on

| | |
|---|---|
| **Offline-first** | Field work that carries on with no coverage, then reconciles cleanly |
| **Spatial computing** | Camera and depth data turned into numbers you can act on |
| **On-device AI** | Assistants that finish the job instead of describing it |
| **Sensors & BLE** | Messy live signals turned into behaviour you can trust |
| **Sync & scale** | Long-lived systems moved forward without stopping the work |

The problems I like are rarely clean:

- No signal. Work must continue offline.
- Bad lighting. The real world isn't perfect.
- Legacy code. Systems older than the team.
- Millions of records. Data at scale, every day.
- Real-world sensors. Unreliable. Noisy. Unpredictable.
- AI that has to act. Not just chat, but take action.

## At a glance

| Apps shipped | Years engineering | Engineers mentored | Problem domains |
|:---:|:---:|:---:|:---:|
| 52+ | 10+ | 7 | 5 |

## How I got here

I didn't collect technologies. I kept moving toward harder problems.

| | Era | Period |
|---|---|---|
| 01 | **BUILD** — consumer mobile, product engineering | 2016–2019 |
| 02 | **SCALE** — field and offline systems, full-system thinking | 2020–2021 |
| 03 | **INTELLIGENCE** — spatial computing, on-device intelligence | 2022–2023 |
| 04 | **ACT** — real-time systems, agentic AI, AI-native engineering | 2024–today |

## How I think about systems

Different problems, same philosophy:

- **Offline by default** — software should carry on working when the connection doesn't
- **Measure the real world** — sensors, cameras and spatial data should produce something usable
- **Evolve, don't destroy** — modernise in steps rather than rewriting for the sake of it
- **Make intelligence useful** — AI earns its place by taking part in real workflows
- **Measure reality** — what a real device does beats what the diagram promised

The question used to be *"does this feature work?"* These days it is closer to:

- Behaves with no connection?
- Holds up under load?
- Works on a three-year-old device?
- Can the architecture still change?

Writing better code is a small part of it. Most of the value is in helping a
team make better calls.

## Work with me

**What's the difficult thing you're trying to make work?**

If it involves mobile, awkward data, unreliable networks, sensors, spatial
computing, or AI that has to hold up outside a demo, I'd probably enjoy working
on it.

→ **[LinkedIn](https://www.linkedin.com/in/nikunjprajapati)**

Project work on the site is described at a high level only, to respect client
confidentiality and proprietary systems.

---

<details>
<summary>About this repository</summary>

The published site: static HTML, CSS, one progressive-enhancement script and
image assets. No build step, no package manager, no server-side component — 
GitHub Pages serves these files directly. No third-party scripts, no analytics,
no cookies. `connect-src 'none'`, so the site makes no network requests of its
own. Fully readable with JavaScript disabled; `prefers-reduced-motion` and
`prefers-contrast` are respected; text holds WCAG 2.2 AA against every
background it sits on.

**Maintenance.** Each page carries its own CSP, and the `script-src` hash covers
that page's JSON-LD block. Editing a JSON-LD block invalidates its hash, and a
stale hash is silent — nothing visibly breaks, so it is easy to leave wrong.
Verify after touching structured data:

```sh
for f in index.html evolution.html stories/*.html; do
  a=$(perl -0777 -ne 'print $1 if m{<script type="application/ld\+json">(.*?)</script>}s' "$f" \
      | openssl dgst -sha256 -binary | openssl base64 -A)
  d=$(grep -o "sha256-[A-Za-z0-9+/=]*" "$f" | head -1 | sed 's/sha256-//')
  [ "$a" = "$d" ] && echo "ok    $f" || echo "STALE $f  -> sha256-$a"
done
```

Asset URLs carry a `?v=N` query string. Bump it on **both** the stylesheet and
the script together; a cached script against fresh CSS renders a broken page.

</details>

---

Site content and imagery © Nikunj Prajapati. All rights reserved.
