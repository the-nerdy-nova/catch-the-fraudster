# Catch the Fraudster

A browser game where you play a fraud investigator at the fictional payments company NovaPay. Review each transaction, decide whether to approve or decline it, and learn the warning signs of real fraud patterns.

All people, companies and transactions are fictional.

## Run it locally

The game loads its content from JSON files, which browsers only allow through a web server. In Terminal:

```
cd my-second-project
python3 -m http.server 8000
```

Then open http://localhost:8000. Press `Ctrl+C` in Terminal to stop the server.

## Where things live

- `index.html`: the single page
- `css/`: the look of the game
- `js/`: the game code
  - `main.js` starts the game and connects the buttons
  - `data.js` loads and checks the content
  - `game.js` runs a shift (clock, queue, decisions)
  - `scoring.js` turns decisions into points and a rank
  - `ui.js`, `encyclopedia.js` and `leaderboard.js` draw the page
  - `storage.js` saves progress and the leaderboard in the browser
  - `sfx.js` makes the sound effects
  - `share.js` builds the "copy my score" text
- `data/`: all game content
  - `cases.json`: every transaction
  - `patterns.json`: fraud patterns and genuine look-alikes
  - `levels.json`: shift length, pace and pass mark (`unlockPercent`) for each level
  - `config.json`: points, speed bonus, ranks and clue cost

## Put it online with GitHub Pages

GitHub Pages hosts the files as they are, for free. On a free GitHub account the repository has to be public.

1. Create an empty repository on GitHub, for example `catch-the-fraudster`.
2. Connect this folder to it and upload the code (replace `YOUR-USERNAME`):

   ```
   git remote add origin https://github.com/YOUR-USERNAME/catch-the-fraudster.git
   git push -u origin main
   ```

3. On GitHub, open the repository's **Settings**, then **Pages**. Under "Build and deployment", choose **Deploy from a branch**, pick the `main` branch and the `/ (root)` folder, and save.
4. After a minute or two the game is live at `https://YOUR-USERNAME.github.io/catch-the-fraudster/`.

To publish a later change, commit it and run `git push`.

## Changing the game

No code is needed for most changes: edit the files in `data/`. Open the browser console after a change; the game prints a warning there for any case that is missing a field or points at a pattern that does not exist.
