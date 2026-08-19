# nikunj-io.github.io

Personal portfolio site of Nikunj Prajapati - Lead iOS Software Engineer & iOS Architect.

**Live:** https://nikunj-io.github.io/

## About this repository

This repository contains the published website only: static HTML, CSS, one
progressive-enhancement script, and image assets. There is no build step, no
package manager, and no server-side component - GitHub Pages serves these files
directly.

## Structure

```
index.html        Home
evolution.html    Career progression, in detail
stories/          One page per problem domain (five)
404.html          Not-found page
css/site.css      Design tokens, layout, motion
js/site.js        Progressive enhancement (nav, reveal, canvas fields)
assets/img/       Images
robots.txt        Crawler directives
sitemap.xml       Sitemap
```

## Notes

- No third-party scripts, no analytics, no cookies, no trackers.
- All resources are same-origin and locked down by a Content Security Policy
  with `connect-src 'none'` - the site makes no network requests of its own.
- The site is fully readable and navigable with JavaScript disabled.
- `prefers-reduced-motion` and `prefers-contrast` are respected.
- Text colours are held at WCAG 2.2 AA (4.5:1) against every background they
  are used on.

## Maintenance

Each page carries its own CSP, and the `script-src` hash covers that page's
JSON-LD block. **Editing a JSON-LD block invalidates its hash**, and a stale
hash is silent - nothing visibly breaks, so it is easy to leave wrong. Verify
every page after touching structured data:

```sh
for f in index.html evolution.html stories/*.html; do
  a=$(perl -0777 -ne 'print $1 if m{<script type="application/ld\+json">(.*?)</script>}s' "$f" \
      | openssl dgst -sha256 -binary | openssl base64 -A)
  d=$(grep -o "sha256-[A-Za-z0-9+/=]*" "$f" | head -1 | sed 's/sha256-//')
  [ "$a" = "$d" ] && echo "ok    $f" || echo "STALE $f  -> sha256-$a"
done
```

Asset URLs carry a `?v=N` query string. Bump it on **both** the stylesheet and
the script together whenever either changes; a cached script against fresh CSS
renders a broken page.

## Content

Project work is described at a high level only, to respect client
confidentiality and proprietary systems.

## Licence

Site content and imagery © Nikunj Prajapati. All rights reserved.
