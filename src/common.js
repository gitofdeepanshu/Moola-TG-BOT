"use strict";

const winston = require("winston");
const { markdownv2: tgFormat } = require("telegram-format");
const { format } = require("logform");
const { Telegram, Telegraf } = require("telegraf");
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;

if (TG_BOT_TOKEN === undefined) {
  throw new Error("Please set TG_BOT_TOKEN env.");
}

const alignedWithColorsAndTime = format.combine(
  format.colorize(),
  format.timestamp(),
  format.align(),
  format.printf((info) => `${info.level}: ${info.message}`)
);

const logger = winston.createLogger({
  level: "debug",
  // format: alignedWithColorsAndTime,
  transports: [new winston.transports.Console()],
});

const getRawTg = () => new Telegram(TG_BOT_TOKEN);

const getBot = () => new Telegraf(TG_BOT_TOKEN);

const prettyMRequest = (mReq) => {
  const sponsor_line = `${tgFormat.bold("Your Address")}: ${tgFormat.url(
    mReq.sponsor_address,
    "https://explorer.celo.org/address/" + mReq.sponsor_address
  )}`;
  const cr_line = `${tgFormat.bold(
    "Alert if Health Factor drops below:"
  )}${tgFormat.bold(tgFormat.escape(mReq.cr_trigger))}`;

  return sponsor_line + "\n" + cr_line;
};

const healthFactorReq = (mReq,hf) => {
  const sponsor_line = `${tgFormat.bold("Your Address")}: ${tgFormat.url(
    mReq.sponsor_address,
    "https://explorer.celo.org/address/" + mReq.sponsor_address
  )}`;
  const cr_line = `${tgFormat.bold(
    "Your Health Factor is "
  )}${tgFormat.escape(hf)}`;

  return sponsor_line + "\n" + cr_line;
};

function isNumeric(str) {
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str) && !isNaN(parseFloat(str)) // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
  ); // ...and ensure strings of whitespace fail
}

function delay(s) {
  return new Promise((r) => setTimeout(r, s * 1000));
}

async function sendMessageWithMarkdownV2(chat_id, markdown) {
  getRawTg().sendMessage(chat_id, markdown, { parse_mode: "MarkdownV2" });
}

const isUserDataEmpty = (d) =>
  d.totalLiquidity === "0" &&
  d.totalCollateral === "0" &&
  d.totalBorrow === "0" &&
  d.totalFees === "0" &&
  d.availableBorrow === "0";

module.exports = {
  getBot,
  getRawTg,
  sendMessageWithMarkdownV2,
  prettyMRequest,
  healthFactorReq,
  isNumeric,
  logger,
  isUserDataEmpty,
  delay,
};
