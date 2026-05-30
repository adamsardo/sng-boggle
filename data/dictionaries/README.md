# Dictionaries

`en-clean.json` is generated from the MIT-licensed `word-list` npm package with
the v1 modern-clean filter:

- minimum length 3
- lowercase alphabetic words only
- small explicit denylist seed

Regenerate it with:

```bash
npm run dictionary:build
```

The pure engine tests use small fixtures so they remain deterministic and fast.
