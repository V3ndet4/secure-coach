# Secure Coach

A free local-first PWA for daily secure attachment practice.

## What it does

- Runs as a static website with no backend.
- Stores intake, progress, sessions, and journal entries in the user's browser using IndexedDB.
- Routes each user into a 180-day path: Stabilize, Understand, Practice, Strengthen, Maintain.
- Includes daily coaching steps, real-life examples, scripts, journaling, progress tracking, and JSON backup export/import.
- Includes dedicated exercise tracks for attachment practice, control/choice, self-relationship, body inquiry, secure communication, and self-improvement accountability.
- Includes a four-pattern attachment guide: secure, anxious/preoccupied, avoidant/dismissive, and disorganized/fearful-avoidant.
- Shows `Today for me` on every main page so each user logs one daily self-care commitment before making the relationship the center of the work.

## Run locally

From this folder:

```powershell
node server.mjs
```

Then open:

```text
http://localhost:4173
```

Opening `index.html` directly also works for most app features, but installable PWA behavior and the service worker require `http://localhost` or a hosted HTTPS URL.

## Check the app

Open `http://127.0.0.1:4173` or `http://localhost:4173`.

Test this flow:

1. Fill out the intake with a realistic story under 500 words.
2. Confirm the app places you into a stage and focus area while the visible program day starts at `Day 1`.
3. Complete one daily session.
4. Open `Exercises` and review the dedicated tracks.
5. Open `Attachment` and compare your pattern plus likely partner dynamics.
6. Save and complete the `Today for me` self-care commitment.
7. Open `Journal` and confirm the session note was saved.
8. Open `Progress` and confirm the day, session count, self-care count, and backup controls update.
9. Refresh the browser and confirm the progress is still there.
10. Export a backup from `Progress`.

If the browser shows an older version, hard refresh with `Ctrl+F5`.

## Free hosting

This can be hosted for free as a static site on GitHub Pages, Netlify, or Vercel. GitHub Pages is the simplest zero-backend option.

## Deploy to GitHub Pages

1. Create a GitHub repository for this folder.
2. Push the project to the `main` branch.
3. In GitHub, open `Settings > Pages`.
4. Set `Source` to `GitHub Actions`.
5. Push again or run the `Deploy static app to GitHub Pages` workflow manually.

The workflow in `.github/workflows/pages.yml` publishes the static files directly. No build step or paid service is needed.

## Privacy model

Data stays on the user's device unless they export a backup file. If the user clears browser data, uses private browsing, changes devices, or resets the app, local progress can be lost unless they exported a backup.

## Reference model

The app includes an in-app `References` view with influence notes from:

- `Attached` by Amir Levine and Rachel Heller
- `The Let Them Theory` by Mel Robbins and Sawyer Robbins
- `It Begins with You` by Jillian Turecki
- `Why Has Nobody Told Me This Before?` by Dr Julie Smith
- `The Courage to Be Disliked` by Ichiro Kishimi and Fumitake Koga
- `Design Your Good Life` by Charles T. Lee
- `How to Know a Person` by David Brooks
- `Quiet: The Power of Introverts in a World That Can't Stop Talking` by Susan Cain
- `The Six Pillars of Self-Esteem` by Nathaniel Branden
- `The Power of Less` by Leo Babauta
- `The Subtle Art of Not Giving a F*ck` by Mark Manson
- Gabor Mate references: `Scattered Minds`, `The Myth of Normal`, and `The Return to Ourselves`

The exercises are original and use high-level concepts only. The app does not copy book text.

The self-care priority is also informed by public guidance from NIMH, CDC, and WHO. The product rule is simple: relationship skills matter, but daily care for the user's own body, mind, environment, boundaries, and future comes first.

## Safety boundary

This app is self-guided coaching and journaling. It is not therapy, medical care, or crisis support. In the U.S., people in crisis can call or text 988 for the 988 Suicide & Crisis Lifeline.
