# Nidaa Mobile

Application mobile des fidèles (Android, puis iPhone) : horaires réels de la mosquée, compte à rebours,
notifications d'adhan et rappels d'iqama, événements, recherche de mosquées, Qibla, calendrier hégirien, tasbih, dons.

- Code : `src/` (app.js écrans, engine.js horaires — identique au site et à l'écran, api.js données, native.js notifications/position)
- Configuration : `www/config.js` (adresse Supabase et clé publique « anon »)
- Fabrication : GitHub Actions (`.github/workflows/android.yml`) → onglet Releases
  - `nidaa-mobile-test.apk` : installation directe pour tester
  - `nidaa-mobile-playstore.aab` : pour Google Play, quand les 4 secrets de signature sont ajoutés
    (NIDAA_KEYSTORE_BASE64, NIDAA_KEYSTORE_PASSWORD, NIDAA_KEY_ALIAS, NIDAA_KEY_PASSWORD)
