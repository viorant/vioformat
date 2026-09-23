# vioformat.org

Source of the website: one self-contained HTML file, no build step.

```
site/index.html    the whole site — routing, styles and the in-browser reader
```

Everything is inline except two CDN loads: IBM Plex from Google Fonts, and js-yaml for the reader. The router is
hash-based (`#/spec`, `#/reference`, …) so the file opens correctly from disk as well as from a host.

## Deploying

Serve `index.html` at the domain root with a catch-all to the same file. On GitHub Pages, copy it to the Pages
branch root; on any static host, point the root at the file.

## Keeping it in step with the spec

The site restates the specification. When [`spec/v1/index.md`](../spec/v1/index.md) changes, the corresponding
section of `index.html` changes in the same commit — the spec is authoritative, the site is a rendering of it.

The in-browser reader implements the same Level 1 checks as [`tools/vio-lint`](../tools/vio-lint). Both must move
together; the linter's conformance suite is the test of record.
