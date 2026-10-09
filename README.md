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
- `js/`: the game code (`main.js` starts it, `data.js` loads content, `ui.js` draws the page)
- `data/`: all game content (`cases.json` for transactions, `patterns.json` for fraud patterns)
