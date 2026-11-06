const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN || "8809261549:AAGf7n36QqEj5zAHzhcopScUwhMChTlbR5I";
const PIXEL_ID = process.env.PIXEL_ID || "2938421813211161";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "EAAW66bFklZB0BSxA11E6YMDONubXOdQkx0YItqvzeaeUbd9P3mZBBFFTEkW5ylacFQlBobhtz84A4fW7IVDHYx6L7jH0DnEDNLq6xSXi5k2qiVDsAWhqowJyKiNtDmdPUxAGbtmorUGRrgB0eBSl7MnoSB8Vzztiqc1k8b4N5gglICO5FhyEMgOd3a2gZDZD";
const ADMIN_ID = 8343576029;
const CHANNEL_ID = process.env.CHANNEL_ID || "-1002292581257";

const WELCOME_FILE = path.join(__dirname, 'welcome_msg.json');
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
let BOT_ID = null;

const DEFAULT_WELCOME_TEXT =
`https://t.me/+bI2T4MkLWC4yNmRl
https://t.me/+bI2T4MkLWC4yNmRl
https://t.me/+bI2T4MkLWC4yNmRl

💸💸JOIN VIP CHANNEL ✨✨`;

function loadWelcome() {
    try {
        if (fs.existsSync(WELCOME_FILE)) {
            return JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf8'));
        }
    } catch (e) {
        console.error("Load welcome error:", e);
    }
    return null;
}

function saveWelcome(data) {
    try {
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Save welcome error:", e);
    }
}

function extractMessage(msg) {
    if (msg.photo && msg.photo.length) {
        return {
            type: 'photo',
            file_id: msg.photo[msg.photo.length - 1].file_id,
            caption: msg.caption || "",
            caption_entities: msg.caption_entities || []
        };
    }
    if (msg.document) {
        return {
            type: 'document',
            file_id: msg.document.file_id,
            caption: msg.caption || "",
            caption_entities: msg.caption_entities || []
        };
    }
    if (msg.video) {
        return {
            type: 'video',
            file_id: msg.video.file_id,
            caption: msg.caption || "",
            caption_entities: msg.caption_entities || []
        };
    }
    if (msg.text) {
        return {
            type: 'text',
            text: msg.text,
            entities: msg.entities || []
        };
    }
    return null;
}

async function tgCall(method, body) {
    try {
        const r = await fetch(`${TG}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body || {})
        });
        return await r.json();
    } catch (e) {
        console.error(`TG API Error (${method}):`, e);
        return { ok: false, error_code: 0, description: String(e) };
    }
}

async function sendSavedWelcome(chatId, w) {
    if (w.type === 'text') {
        return tgCall('sendMessage', {
            chat_id: chatId,
            text: w.text,
            entities: w.entities,
            disable_web_page_preview: true
        });
    }
    const methodMap = { photo: 'sendPhoto', document: 'sendDocument', video: 'sendVideo' };
    return tgCall(methodMap[w.type], {
        chat_id: chatId,
        [w.type]: w.file_id,
        caption: w.caption,
        caption_entities: w.caption_entities
    });
}

async function sendDefaultWelcome(chatId) {
    return tgCall('sendMessage', {
        chat_id: chatId,
        text: DEFAULT_WELCOME_TEXT,
        disable_web_page_preview: true
    });
}

async function sendWelcome(chatId) {
    const w = loadWelcome();
    return w ? sendSavedWelcome(chatId, w) : sendDefaultWelcome(chatId);
}

function explainError(res) {
    const code = res && res.error_code;
    const d = ((res && res.description) || "").toLowerCase();
    if (d.includes("can't initiate")) return "Telegram ने इस यूजर को पहला मैसेज भेजने की अनुमति नहीं दी (join-request की 5 मिनट वाली अनुमति नहीं मिली या खत्म हो चुकी)";
    if (d.includes("blocked by the user")) return "यूजर ने इस बोट को ब्लॉक किया हुआ है";
    if (d.includes("user is deactivated")) return "यूजर का अकाउंट डिलीट/डिएक्टिवेट है";
    if (d.includes("chat not found")) return "chat_id गलत है या यूजर तक पहुँच नहीं";
    if (code === 401) return "BOT_TOKEN गलत है (Railway Variables में BOT_TOKEN चेक करें)";
    if (code === 429) return "Telegram rate limit: बहुत ज़्यादा मैसेज एक साथ भेजे गए";
    return "अज्ञात कारण, ऊपर का description देखें";
}

async function diagnose(channelId, userId) {
    try {
        if (!BOT_ID) {
            const me = await tgCall('getMe');
            if (me.ok) BOT_ID = me.result.id;
        }
        const botMember = await tgCall('getChatMember', { chat_id: channelId, user_id: BOT_ID });
        if (botMember.ok) {
            const b = botMember.result;
            console.log(`🔎 DIAG: चैनल में बोट का स्टेटस = ${b.status}` +
                (b.status === 'administrator' ? ` | can_invite_users = ${b.can_invite_users}` : ""));
        } else {
            console.log("🔎 DIAG: चैनल में बोट का स्टेटस नहीं मिला:", botMember.description);
        }

        const userMember = await tgCall('getChatMember', { chat_id: channelId, user_id: userId });
        if (userMember.ok) {
            const st = userMember.result.status;
            console.log(`🔎 DIAG: चैनल में यूजर का स्टेटस = ${st}`);
            if (st === 'member') {
                console.log("🔎 DIAG: ⚠️ यूजर पहले से member है। किसी ने रिक्वेस्ट पहले approve कर दी।");
            } else if (st === 'left') {
                console.log("🔎 DIAG: यूजर की रिक्वेस्ट अभी पेंडिंग है, किसी ने approve नहीं की।");
            }
        }

        const admins = await tgCall('getChatAdministrators', { chat_id: channelId });
        if (admins.ok) {
            console.log(`🔎 DIAG: चैनल में कुल ${admins.result.length} एडमिन हैं:`);
            for (const a of admins.result) {
                const u = a.user;
                console.log(`🔎 ADMIN: ${u.is_bot ? "🤖 BOT" : "👤 USER"} | id=${u.id} | @${u.username || "-"} | नाम=${u.first_name || ""} | ${a.status}`);
            }
            console.log("🔎 DIAG: अगर इनमें कोई दूसरा बोट/अकाउंट है जो रिक्वेस्ट आते ही यूजर को मैसेज करता है, तो Telegram हमारे बोट को अनुमति नहीं देता।");
        } else {
            console.log("🔎 DIAG: एडमिन लिस्ट नहीं मिली:", admins.description);
        }
    } catch (e) {
        console.error("DIAG error:", e);
    }
}

app.get('/', (req, res) => {
    res.send("Client Bot & CAPI Tracking Server is Running Perfectly!");
});

async function handleJoinRequest(event) {
    const userId = event.from.id;
    const channelId = event.chat.id;
    const targetChat = event.user_chat_id || userId;
    const date = event.date || Math.floor(Date.now() / 1000);
    const ageSec = Math.floor(Date.now() / 1000) - date;
    const linkCreator = event.invite_link && event.invite_link.creator ? event.invite_link.creator.id : "unknown";

    console.log(`🔥 JOIN REQUEST | user=${userId} | user_chat_id=${event.user_chat_id} | channel=${channelId} | age=${ageSec}s | link_creator=${linkCreator}`);

    const wRes = await sendWelcome(targetChat);
    if (wRes && wRes.ok) {
        console.log(`✅ WELCOME SENT to ${targetChat}`);
    } else {
        console.error(`❌ WELCOME BLOCKED | user=${userId} | error_code=${wRes && wRes.error_code} | description="${wRes && wRes.description}"`);
        console.error(`❌ कारण: ${explainError(wRes)}`);
        await diagnose(channelId, userId);
    }

    const capiPayload = {
        data: [{
            event_name: "Subscribe",
            event_time: date,
            action_source: "system_generated",
            event_id: `sub_${userId}_${date}`,
            user_data: {
                external_id: crypto.createHash('sha256').update(String(userId)).digest('hex')
            }
        }]
    };

    try {
        const capiRes = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(capiPayload)
        });
        const capiData = await capiRes.json();
        console.log("🚀 Meta CAPI Response for Subscribe Event:", capiData);
    } catch (e) {
        console.error("❌ CAPI failed:", e);
    }
}

app.post('/api/webhook', async (req, res) => {
    res.json({ ok: true });

    try {
        const update = req.body;
        console.log("📥 Incoming Telegram Update:", JSON.stringify(update));

        const msg = update.message;
        const isAdmin = msg && msg.from && msg.from.id === ADMIN_ID;

        if (msg && msg.text && msg.text.startsWith('/setwelcome') && isAdmin) {
            const chatId = msg.chat.id;
            const replied = msg.reply_to_message;
            let reply;

            if (!replied) {
                reply = "⚠️ किसी मैसेज/फोटो/डॉक्यूमेंट पर रिप्लाई करके /setwelcome लिखें।";
            } else {
                const data = extractMessage(replied);
                if (!data) {
                    reply = "⚠️ यह मैसेज टाइप सपोर्टेड नहीं है। टेक्स्ट, फोटो, वीडियो या डॉक्यूमेंट इस्तेमाल करें।";
                } else {
                    saveWelcome(data);
                    reply = "✅ वेलकम मैसेज सेव हो गया!";
                }
            }
            await tgCall('sendMessage', { chat_id: chatId, text: reply });
        } else if (msg && msg.text && msg.text.startsWith('/newlink') && isAdmin) {
            const r = await tgCall('createChatInviteLink', {
                chat_id: CHANNEL_ID,
                name: "BotLink " + new Date().toISOString().slice(0, 16),
                creates_join_request: true
            });
            const text = r.ok
                ? `✅ बोट का बनाया नया लिंक (Request Admin Approval):\n${r.result.invite_link}`
                : `❌ लिंक नहीं बना: ${r.description}`;
            console.log("🔗 /newlink result:", JSON.stringify(r));
            await tgCall('sendMessage', { chat_id: msg.chat.id, text });
        } else if (msg && msg.text && msg.text.startsWith('/start')) {
            const chatId = msg.chat.id;
            const r = await sendWelcome(chatId);
            console.log(r && r.ok ? `✅ /start welcome sent to ${chatId}` : `❌ /start welcome failed: ${JSON.stringify(r)}`);
        }

        if (update.chat_join_request) {
            await handleJoinRequest(update.chat_join_request);
        }
    } catch (err) {
        console.error("❌ Webhook Error:", err);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    const me = await tgCall('getMe');
    if (me.ok) {
        BOT_ID = me.result.id;
        console.log(`🤖 Bot: @${me.result.username} (id ${BOT_ID})`);
    } else {
        console.error("❌ getMe फेल: BOT_TOKEN गलत हो सकता है:", me);
    }

    const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
    if (domain) {
        const webhookUrl = `https://${domain}/api/webhook`;
        const r = await tgCall('setWebhook', {
            url: webhookUrl,
            allowed_updates: ["message", "chat_join_request"]
        });
        console.log("Webhook set:", webhookUrl, r);
    } else {
        console.log("⚠️ Railway domain नहीं मिला, webhook सेट नहीं हुआ।");
    }
});
