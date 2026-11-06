const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const BOT_TOKEN = "8809261549:AAGf7n36QqEj5zAHzhcopScUwhMChTlbR5I";
const PIXEL_ID = "2938421813211161";
const ACCESS_TOKEN = "EAAW66bFklZB0BSxA11E6YMDONubXOdQkx0YItqvzeaeUbd9P3mZBBFFTEkW5ylacFQlBobhtz84A4fW7IVDHYx6L7jH0DnEDNLq6xSXi5k2qiVDsAWhqowJyKiNtDmdPUxAGbtmorUGRrgB0eBSl7MnoSB8Vzztiqc1k8b4N5gglICO5FhyEMgOd3a2gZDZD";
const CHANNEL_LINK = "https://t.me/+iChxoT_HOS41MmFl";
const ADMIN_ID = 8343576029;

const WELCOME_FILE = path.join(__dirname, 'welcome_msg.json');
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

function loadWelcome() {
    try {
        if (fs.existsSync(WELCOME_FILE)) {
            return JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf8'));
        }
    } catch (e) {
        console.error("Error loading welcome file:", e);
    }
    return null;
}

function serverSaveWelcome(data) {
    try {
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2));
        console.log("✅ Welcome message saved successfully to file.");
    } catch (e) {
        console.error("❌ Error saving welcome file:", e);
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
    const r = await fetch(`${TG}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return r.json();
}

async function sendSavedWelcome(chatId, w) {
    if (w.type === 'text') {
        return tgCall('sendMessage', { chat_id: chatId, text: w.text, entities: w.entities });
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
        text: "🔥 *Welcome!*\n\nClick below to access our VIP Channel:",
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: "🚀 Join VIP Channel", url: CHANNEL_LINK }]
            ]
        }
    });
}

async function sendWelcome(chatId) {
    const w = loadWelcome();
    if (w) {
        const res = await sendSavedWelcome(chatId, w);
        if (!res.ok) console.error("❌ Saved welcome send failed:", res);
    } else {
        await sendDefaultWelcome(chatId);
    }
}

app.get('/', (req, res) => {
    res.send("Client Bot & CAPI Tracking Server is Running Perfectly!");
});

app.post('/api/webhook', async (req, res) => {
    try {
        const update = req.body;
        console.log("📥 Incoming Telegram Update:", JSON.stringify(update));

        if (update.message && update.message.text && update.message.from && update.message.from.id === ADMIN_ID) {
            const text = update.message.text;
            const chatId = update.message.chat.id;

            if (text.startsWith('/setwelcome')) {
                const replied = update.message.reply_to_message;
                let reply;

                if (!replied) {
                    reply = "⚠️ किसी मैसेज/फोटो/डॉक्यूमेंट पर रिप्लाई करके /setwelcome लिखें।";
                } else {
                    const data = extractMessage(replied);
                    if (!data) {
                        reply = "⚠️ यह मैसेज टाइप सपोर्टेड नहीं है। टेक्स्ट, फोटो, वीडियो या डॉक्यूमेंट इस्तेमाल करें।";
                    } else {
                        serverSaveWelcome(data);
                        reply = "✅ वेलकम मैसेज सफलतापूर्वक सेव हो गया!";
                    }
                }
                await tgCall('sendMessage', { chat_id: chatId, text: reply });
                return res.json({ ok: true });
            }

            if (text.startsWith('/clearwelcome')) {
                if (fs.existsSync(WELCOME_FILE)) {
                    fs.unlinkSync(WELCOME_FILE);
                }
                await tgCall('sendMessage', { chat_id: chatId, text: "🗑️ सारे वेलकम मैसेज रीसेट कर दिए गए हैं!" });
                return res.json({ ok: true });
            }
        }

        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
            const chatId = update.message.chat.id;
            await sendWelcome(chatId);
            console.log("✅ Welcome message sent to chat:", chatId);
        }

        const event = update.chat_join_request;
        if (event) {
            const userId = event.from.id;
            const date = event.date || Math.floor(Date.now() / 1000);
            console.log("🔥 Chat Join Request detected from User ID:", userId);

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

            const capiRes = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(capiPayload)
            });

            const capiData = await capiRes.json();
            console.log("🚀 Meta CAPI Response for Subscribe Event:", capiData);

            try {
                await sendWelcome(userId);
                console.log("✅ Welcome sent to join-request user:", userId);
            } catch (e) {
                console.error("❌ Join welcome failed:", e);
            }
        }

        res.json({ ok: true });
    } catch (err) {
        console.error("❌ Webhook Error:", err);
        res.status(500).json({ ok: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    if (process.env.RAILWAY_STATIC_URL) {
        try {
            const webhookUrl = `https://${process.env.RAILWAY_STATIC_URL}/api/webhook`;
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
            console.log("Telegram Webhook Automatically Set Successfully!");
        } catch (e) {
            console.error("Webhook setup failed:", e);
        }
    }
});
