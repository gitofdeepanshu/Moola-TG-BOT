#!/usr/bin/env node
require("dotenv").config();
const retry = require("async-retry");
const BigNumber = require("bignumber.js");
const { markdownv2: tgFormat } = require("telegram-format");
const { MRequest } = require("./src/db");
const {
  isUserDataEmpty,
  sendMessageWithMarkdownV2,
  logger,
  delay,
} = require("./src/common");
const { getUserData } = require("./src/CRMonitor");

/**
 * @notice Continuously attempts to monitor contract positions and reports based on monitor modules.
 * @param {Object} logger Module responsible for sending logs.
 * @param {Number} pollingDelay The amount of seconds to wait between iterations. If set to 0 then running in serverless
 *     mode which will exit after the loop.
 * @param {Number} errorRetries The number of times the execution loop will re-try before throwing if an error occurs.
 * @param {Number} errorRetriesTimeout The amount of milliseconds to wait between re-try iterations on failed loops.
 * @return None or throws an Error.
 */
async function run({
  logger,
  pollingDelay,
  errorRetries,
  errorRetriesTimeout,
  dryRun,
}) {
  try {
    const checkAll = async () => {
      // cursor are subjected to timeouts, typically 10 mins
      for await (const mReq of MRequest.find()) {
        const sponsorAddress = mReq.sponsor_address;
        const chatId = mReq.tg_chat_id;
        const crTrigger = new BigNumber(mReq.cr_trigger);
        try {
          const userData = await getUserData(sponsorAddress);
          const userCr = new BigNumber(userData.healthFactor);
          if (isUserDataEmpty(userData)) {
            logger.error({
              at: "CRBot#server",
              message: "User Position is Empty. Removing MRequest",
              mReq: mReq,
              userData: userData,
            });
            await mReq.remove();
            await sendMessageWithMarkdownV2(
              chatId,
              "POSITION Not Found\\! Make sure you are using the correct address\\."
            );
          } else if (crTrigger.isGreaterThanOrEqualTo(userCr)) {
            logger.error({
              at: "CRBot#server",
              message: "User Position is undercollateralized ",
              mReq: mReq,
              userData: userData,
            });
            await sendMessageWithMarkdownV2(
              chatId,
              [
                tgFormat.bold("Alert ❗️"),
                `Health Factor for Wallet Address ${tgFormat.bold(
                  sponsorAddress
                )} has fallen below the ${tgFormat.bold(
                  tgFormat.escape(crTrigger.toString())
                )} threshold\\!`,
                `Current Health Factor : ${tgFormat.bold(
                  tgFormat.escape(userCr.toString())
                )}`,
              ].join("\n")
            );
          } else {
            logger.debug({
              at: "CRBot#server",
              message: "User Position is safe.",
              mReq: mReq,
              userData: userData,
            });
          }
        } catch (error) {
          logger.error({
            at: "CRBot#server",
            message: "Error while processing Monitor Request",
            mReq: mReq,
            error: error,
            stack: error.stack,
          });
        }
      }
    };

    // Create a execution loop that will run indefinitely (or yield early if in serverless mode)
    for (;;) {
      await retry(checkAll, {
        retries: errorRetries,
        minTimeout: errorRetriesTimeout * 1000, // delay between retries in ms
        onRetry: (error) => {
          logger.debug({
            at: "CRBot#server",
            message: "An error was thrown in the execution loop - retrying",
            error: typeof error === "string" ? new Error(error) : error,
          });
        },
      });
      // If the polling delay is set to 0 then the script will terminate the bot after one full run.
      if (pollingDelay === 0) {
        logger.debug({
          at: "CRBot#server",
          message: "End of serverless execution loop - terminating process",
        });
        await delay(2); // waitForLogger does not always work 100% correctly in serverless. add a delay to ensure logs are captured upstream.
        break;
      }
      logger.debug({
        at: "CRBot#server",
        message: "End of execution loop - waiting polling delay",
      });
      await delay(Number(pollingDelay));
    }
  } catch (error) {
    // If any error is thrown, catch it and bubble up to the main try-catch for error processing in the Poll function.
    throw typeof error === "string" ? new Error(error) : error;
  }
}
async function Poll(callback) {
  try {
    // This object is spread when calling the `run` function below. It relies on the object enumeration order and must
    // match the order of parameters defined in the`run` function.
    const executionParameters = {
      // Default to 1 minute delay. If set to 0 in env variables then the script will exit after full execution.
      pollingDelay: process.env.POLLING_DELAY
        ? Number(process.env.POLLING_DELAY)
        : 60,
      // Default to 3 re-tries on error within the execution loop.
      errorRetries: process.env.ERROR_RETRIES
        ? Number(process.env.ERROR_RETRIES)
        : 3,
      // Default to 1 seconds in between error re-tries.
      errorRetriesTimeout: process.env.ERROR_RETRIES_TIMEOUT
        ? Number(process.env.ERROR_RETRIES_TIMEOUT)
        : 1,
      dryRun: process.env.DRY_RUN === "true" ? true : false,
    };

    await run({ logger: logger, ...executionParameters });
  } catch (error) {
    logger.error({
      at: "CRBot#server",
      message: "Monitor execution error🚨",
      error: typeof error === "string" ? new Error(error) : error,
    });
    callback(error);
  }
  callback();
}

function nodeCallback(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  } else process.exit(0);
}

// If called directly by node, execute the Poll Function. This lets the script be run as a node process.
if (require.main === module) {
  Poll(nodeCallback)
    .then(() => {})
    .catch(nodeCallback);
}

// Attach this function to the exported function in order to allow the script to be executed through both truffle and a test runner.
Poll.run = run;
module.exports = Poll;
