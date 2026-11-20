# GVW Web Studio app catalog

`apps.json` lists every GVW Web Studio app that is live on Google Play. A GitHub Action rebuilds it every day from the developer page, so a newly published app appears in the "Our apps" screen of every app automatically (no app update needed).

- Apps read: https://raw.githubusercontent.com/Munayem/gvw-app-catalog/main/apps.json
- Optional Bangla names, topics etc.: `overrides.json`
- Run by hand: Actions → "Update app catalog" → Run workflow
