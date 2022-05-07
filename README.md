# Moola_BOT
Moola Liquidator Bot tracks the HF (Health Factor) and alerts when it drops below a certain threshold.


## Componenets
- **Polling Server** (server.js): Monitors the user's HF and send alert on Telegram. 
- **Telegram Bot** (bot.js): Handle user's input for tracking thier HF.

## Config
Enviornment Variables:-

**Server**
- `MONGODB_URI` - MongoDB URI
- `POLLING_DELAY` - (in seconds) Default to 1 minute delay. If set to 0 in env variables then the script will exit after full execution.

**Tg Bot**
- `TG_BOT_TOKEN` - Telegram bot token
- `URL` - Url of application. The telegram bot will attach itself to this URL as callback. Make sure this is correctly set.
For Example, if deploying to heroku it will be `https://<YOUR_APP_NAME>.herokuapp.com`
- `PORT` - Port to run bot on. (Deafult: 3000)






