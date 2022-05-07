require("dotenv").config();
const { getBot, prettyMRequest, isNumeric, logger, healthFactorReq } = require("./src/common");
const express = require("express");
const expressApp = express();
const { markdownv2: tgFormat } = require("telegram-format");
const { MRequest } = require("./src/db");
const { getWeb3,getUserData } = require("./src/CRMonitor");

const bot = getBot();

const PORT = process.env.PORT || 3000;
const URL = process.env.URL || "https://moola-bot.herokuapp.com";
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;

const web3 = getWeb3().web3;

const msgs = {
  welcomeMsg: (userId, name) =>
    `Hey ${tgFormat.userMention(name, userId)} \\!\n\n` +
    `My name is ⚔️ ${tgFormat.bold(
      "Moola Notifier Bot"
    )} ⚔️,\nI track your Moola market Health Factor and will notify you if your Health Factor drops below a predetermined threshold\\. Your Health Factor is a numeric representation of the safety of your deposited assets relative to your borrowed assets\\. The higher your Health Factor is\\, the safer your deposited funds are against a liquidation scenario\\.\n\n` +
    `If your Health Factor reaches 1, the liquidation of your deposits will be triggered\\.\n\nThe process is extremely simple\\.\n\n${tgFormat.bold(
      "1\\. ADD"
    )}\nGet started by adding the wallet addresses and Health Factor thresholds you would like for me to monitor\\. I can watch as many addresses as you want\\.\nTo add monitor request, use\n\n ${tgFormat.monospace(
      "/add WALLET_ADDRESS HEALTH_FACTOR"
    )}\n\nFor Example: If you want to be notified when the Health Factor of wallet address ${tgFormat.bold(
      "0xe4c183d99b463cc2190b737b51ae26cc6f17ed62"
    )} drops below 1\\.25 then you would type\n\n ${tgFormat.monospace(
      "/add 0xe4c183d99b463cc2190b737b51ae26cc6f17ed62 1.25"
    )}\n\nYou can add multiple monitor requests using the same process shown above\\.\n\n${tgFormat.bold(
      "2\\. LIST"
    )}\nYou can see all of the addresses I'm monitoring for you by typing /list\\. Each address is assigned a SERIAL\\_NUMBER\\. 
  \n${tgFormat.bold(
    "3\\. REMOVE"
  )}\nIf you would like for me to stop monitoring a wallet address for you then first check its SERIAL\\_NUMBER by typing /list and then type /remove followed by the list SERIAL\\_NUMBER\\. 
\nFor Example\\:  If you want me to stop monitoring wallet address 0xe4c183d99b463cc2190b737b51ae26cc6f17ed62 then type\\\:\n\n${tgFormat.monospace(
      "/list (to obtain the SERIAL_NUMBER) then type, "
    )}\n
${tgFormat.monospace(
  "/remove 1 (because in this case I'm only monitoring one address for you) "
)}

${tgFormat.bold("4\\. UPDATE")}
If you would like for me to update the Health Factor percentage that I notify you about, then first check the serial number using /list and then type\\:\n ${tgFormat.monospace(
      "/update SERIAL_NUMBER HEALTH_FACTOR"
    )} \n\n${tgFormat.bold("5\\. HEALTH FACTOR")}
If you would like to know Health Factor of all your listed addresses, then type \n\n${tgFormat.monospace("/hf")}

If you want to know health factor of a specific address, type \n\n${tgFormat.monospace("/hf WALLET_ADDRESS")}
    \n${tgFormat.bold("6\\. HELP")}
For help, type /help to get a list of Frequently Asked Questions or reach out on Discord at chat\\.celo\\.org

`,

  helpMsg: () => `${tgFormat.bold("FAQs")}\n\n${tgFormat.bold(
    "1\\.How do I add a wallet address to monitor? "
  )}\nAdd the wallet address and Health Factor threshold you would like for me to monitor\\. I can watch as many addresses as you want\\. 
      \n${tgFormat.bold(
        "/add WALLET\\_ADDRESS HEALTH\\_FACTOR "
      )}\n\nFor example\\: If you want to be notified when the Health Factor of wallet address 0xe4c183d99b463cc2190b737b51ae26cc6f17ed62 drops below 1\\.25 then you would type\\:
/add 0xe4c183d99b463cc2190b737b51ae26cc6f17ed62 1\\.25\n\n${tgFormat.bold(
    "2\\.How can I add additional addresses to monitor?"
  )}\nSimply use \n/add WALLET\\_ADDRESS HEALTH\\_FACTOR \nfor as many addresses as you would like to notified about\\.\n\n${tgFormat.bold(
    "3\\.How can see all of the monitored addresses? "
  )}\nYou can see all of the addresses I'm monitoring for you by typing /list\\. Each address is assigned a SERIAL\\_NUMBER\\. \n\n${tgFormat.bold(
    "4\\.How can I remove an address from being monitored?  "
  )}\nIf you would like for me to stop monitoring a wallet address for you then first check its SERIAL\\_NUMBER by typing /list and then type /remove followed by the list SERIAL\\_NUMBER\\.\n\nFor example: If you want me to stop monitoring wallet address 0xe4c183d99b463cc2190b737b51ae26cc6f17ed62 then type\\:
/list \\(to obtain the SERIAL\\_NUMBER\\) then type, 
/remove 1 \\(because in this case I'm only monitoring one address for you\\) \n\n${tgFormat.bold(
    "5\\.How can I update the Health Factor threshold that I receive an alert for?  "
  )}\nFirst check the wallet address SERIAL\\_NUMBER by using /list and then update the threshold by typing /update SERIAL\\_NUMBER  NEW\\_HEALTH\\_FACTOR\\.\n\n${tgFormat.bold(
    "6\\.Does Moola have an official Telegram group?  "
  )}\nNo, Moola market does not have a Telegram group\\.\n\n ${tgFormat.bold(
    "7\\.I still have questions, what should I do?  "
  )}\nYou can check out the official Moola docs at https://docs\\.moola\\.market/, ping us on Twitter \\@Moola\\_Market, or come chat with us in the \\#moola channel of the Celo Discord server https://chat\\.celo\\.org/\\.
  \n`,

  privacyMsg: () => `${tgFormat.bold("Privacy Notice")}\\:\\-
  All the data this Bot displays is already available in Public domain\\.
  When a user adds a monitor request, bot queries on chain data to find the information about the address\\.
  All the data is removed from server after user use /remove\\.`,

  invalidInput: () =>
    "Please provide me with the wallet addresses and a Health Factor thresholds you would like for me to monitor\\. For example\\: If you want to be notified when the Health Factor of wallet address 0xe4c183d99b463cc2190b737b51ae26cc6f17ed62 drops below 1\\.25 then you would type:\n/add 0xe4c183d99b463cc2190b737b51ae26cc6f17ed62 1\\.25",

  addSuccess: (crAlert) =>
    `${tgFormat.bold(
      "Added Successfully"
    )}🤘 \nI will notify you when Health Factor is dropped below ${tgFormat.bold(
      tgFormat.escape(crAlert)
    )}`,

  healthFactorDisplay: (address,hf) => 
  `Health Factor for ${tgFormat.bold(address)} is\n${tgFormat.bold(tgFormat.escape(hf))}`,

  invalidCrAlertValue: () =>
    "Please provide a valid integer for Please provide me with the SERIAL\\_NUMBER and new Health Factor\\. The SERIAL\\_NUMBER can be found by typing /list\\. Then type /update SERIAL\\_NUMBER HEALTH\\_FACTOR to update\\. For example: If you want me to update the Health Factor alert for SERIAL\\_NUMBER 1 to 1\\.25 then you would type:\n/update 1 1\\.25",

  invalidSponsorAddress: () => "Given address is not a valid Celo address 👀",

  noMRequestsFound: () => "No Monitor Requests Found \\🧐",

  removeHelp: () =>
    "Please provide a valid SERIAL\\_NUMBER to remove which can be found by typing /list\\, then try again with /remove \\<SERIAL\\_NUMBER\\>",

  removeFailed: () =>
    "If you would like for me to stop monitoring a wallet address for you then first check its SERIAL\\_NUMBER by typing /list and then type /remove followed by the list SERIAL\\_NUMBER\\. For example: If you want me to stop monitoring wallet address 0xe4c183d99b463cc2190b737b51ae26cc6f17ed62 then type: /list \\(to find the SERIAL\\_NUMBER\\) then type\\,  /remove \\<SERIAL\\_NUMBER\\>",

  removeSuccess: () => tgFormat.bold("Successfully removed 👍"),

  updateHelp: () =>
    tgFormat.bold(
      "Please provide me with the SERIAL\\_NUMBER and new Health Factor\\.  The SERIAL\\_NUMBER can be found by typing /list\\. Then type /update SERIAL\\_NUMBER HEALTH\\_FACTOR to update\\.\nFor example\\: If you want me to update the Health Factor alert for SERIAL\\_NUMBER 1 to 1\\.25 then you would type: "
    ) +
    "\n" +
    tgFormat.monospace("/update 1 1.25"),

  updateFailed: () =>
    "Please provide me with the SERIAL\\_NUMBER and new Health Factor\\.  The SERIAL\\_NUMBER can be found by typing /list\\. Then type /update SERIAL\\_NUMBER HEALTH\\_FACTOR to update\\.\n For example: If you want me to update the Health Factor alert for SERIAL\\_NUMBER 1 to 1\\.25then you would type:\n/update 1\\.25",

  updateSuccess: () => tgFormat.bold("Successfully updated 👍"),
};

bot.start(async (ctx) => {
  const msg = await ctx.replyWithMarkdownV2(
    msgs.welcomeMsg(ctx.chat.id, ctx.chat.first_name),
    {
      disable_web_page_preview: true,
    }
  );
  await ctx.unpinAllChatMessages();
  await ctx.pinChatMessage(msg.message_id, { disable_notification: true });
});

bot.help((ctx) => ctx.replyWithMarkdownV2(msgs.helpMsg()), {
  disable_web_page_preview: true,
});

bot.command("privacy", (ctx) => ctx.replyWithMarkdownV2(msgs.privacyMsg()), {
  disable_web_page_preview: true,
});

bot.command("add", async (ctx) => {
  const data = ctx.message.text.split(" ").slice(1, 3);
  if (data.length < 2) {
    ctx.replyWithMarkdownV2(msgs.invalidInput());
    return;
  }
  const [sponsorAddress, crAlert] = data;

  if (!isNumeric(crAlert)) {
    ctx.replyWithMarkdownV2(msgs.invalidCrAlertValue());
    return;
  }

  const mReq = new MRequest({
    tg_chat_id: ctx.chat.id,
    sponsor_address: sponsorAddress,
    cr_trigger: crAlert,
  });

  logger.info(`Adding New Request - ${mReq}`);

  try {
    web3.utils.toChecksumAddress(sponsorAddress);
  } catch (error) {
    logger.error(error);
    ctx.replyWithMarkdownV2(
      `Are you sure ${tgFormat.bold(
        sponsorAddress
      )} is a valid celo address🤔 ?`
    );
    return;
  }

  try {
    await mReq.save();
    ctx.replyWithMarkdownV2(
      prettyMRequest(mReq) + "\n\n" + msgs.addSuccess(crAlert),
      {
        disable_web_page_preview: true,
      }
    );
  } catch (error) {
    logger.error(error);
    ctx.replyWithMarkdownV2(
      `Failed to add new monitor request in database. Please try again 😐`
    );
    return;
  }
});

bot.command("list", async (ctx) => {
  mReqs = await (
    await MRequest.find({ tg_chat_id: ctx.chat.id }).exec()
  ).flat();
  if (mReqs.length == 0) {
    ctx.replyWithMarkdownV2(tgFormat.bold(msgs.noMRequestsFound()));
  } else {
    let tgStr = `Found ${tgFormat.bold(
      mReqs.length
    )} monitor requests from you\n\n`;
    mReqs.forEach((item, index) => {
      tgStr +=
        `${tgFormat.bold((index + 1).toString())}\\) ` +
        prettyMRequest(item) +
        "\n\n";
    });
    ctx.replyWithMarkdownV2(tgStr, {
      disable_web_page_preview: true,
    });
  }
});

bot.command("remove", async (ctx) => {
  const data = ctx.message.text.split(" ").slice(1, 2);
  if (data.length < 1) {
    ctx.replyWithMarkdownV2(msgs.removeHelp());
    return;
  }
  const idx = Number(data[0]) - 1;
  mReqs = await (
    await MRequest.find({ tg_chat_id: ctx.chat.id }).exec()
  ).flat();

  if (0 <= idx && idx <= Number(mReqs.length - 1)) {
    const mReq = mReqs[idx];
    MRequest.deleteOne(mReq, function (err) {
      if (err) {
        console.log(err);
        ctx.replyWithMarkdownV2(msgs.removeFailed());
      } else {
        ctx.replyWithMarkdownV2(
          prettyMRequest(mReq) + "\n\n" + msgs.removeSuccess(),
          {
            disable_web_page_preview: true,
          }
        );
      }
      // deleted at most one tank document
    });
  } else {
    ctx.replyWithMarkdownV2(msgs.removeHelp());
  }
});
bot.command("hf", async (ctx) => {
  const data = ctx.message.text.split(" ").slice(1, 2);
  if (data.length < 1) {
    // this means we have to show all the hfs of registered addresses
    
    mReqs = await (
      await MRequest.find({ tg_chat_id: ctx.chat.id }).exec()
    ).flat();
    
    if (mReqs.length == 0) {
      console.log("length less than 1")
      ctx.replyWithMarkdownV2(tgFormat.bold(msgs.noMRequestsFound()));
      
  }
  else {
    //handle displaying the health factor of all the items from the list
      let tgStr = `Found ${tgFormat.bold(
        mReqs.length
      )} monitor requests from you\n\n`;
      // await Promise.all(mReqs.map(async (item, index) => {
      //   const hf = (await getUserData(item.sponsor_address)).healthFactor
      //   tgStr +=
      //     `${tgFormat.bold((index + 1).toString())}\\) ` +
      //     healthFactorReq(item,hf) +
      //     "\n\n";
      // }));
      let index = 0;
      for (const mReq of mReqs) {
        const hf = (await getUserData(mReq.sponsor_address)).healthFactor
        tgStr +=
          `${tgFormat.bold((index + 1).toString())}\\) ` +
          healthFactorReq(mReq,hf) +
          "\n\n";
        index++;
      }
      ctx.replyWithMarkdownV2(tgStr, {
        disable_web_page_preview: true,
      });
  }
  
  } 
else {
  // display the hf of addresses
  
  if (web3.utils.isAddress(data[0])){
    const hf = await (await getUserData(data[0])).healthFactor
    ctx.replyWithMarkdownV2(tgFormat.bold(msgs.healthFactorDisplay(data[0],hf)));
  }
  else{
    ctx.replyWithMarkdownV2(msgs.invalidSponsorAddress())
  }
}
}
);

bot.command("update", async (ctx) => {
  const data = ctx.message.text.split(" ").slice(1, 3);
  if (data.length < 1) {
    ctx.replyWithMarkdownV2(msgs.updateHelp());
    return;
  }
  let [idx, crAlert] = data;

  if (!isNumeric(crAlert) || !isNumeric(idx)) {
    ctx.replyWithMarkdownV2(msgs.invalidCrAlertValue());
    return;
  }
  idx = Number(idx) - 1;
  crAlert = Number(crAlert);

  mReqs = await (
    await MRequest.find({ tg_chat_id: ctx.chat.id }).exec()
  ).flat();

  if (0 <= idx && idx <= Number(mReqs.length - 1)) {
    const mReq = mReqs[idx];
    mReq.cr_trigger = crAlert;
    try {
      await mReq.save();
      ctx.replyWithMarkdownV2(
        prettyMRequest(mReq) + "\n\n" + msgs.updateSuccess(),
        {
          disable_web_page_preview: true,
        }
      );
    } catch (err) {
      console.log(err);
      ctx.replyWithMarkdownV2(msgs.updateFailed());
    }
  } else {
    ctx.replyWithMarkdownV2(msgs.removeHelp());
  }
});

// bot.launch();

bot.telegram.setWebhook(`${URL}/bot${TG_BOT_TOKEN}`);
expressApp.use(bot.webhookCallback(`/bot${TG_BOT_TOKEN}`));

expressApp.get("/", (req, res) => {
  res.send("Yay!");
});
expressApp.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
