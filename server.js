const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const BOT_TOKEN = "8809261549:AAGf7n36QqEj5zAHzhcopScUwhMChTlbR5I";
const PIXEL_ID = "2938421813211161";
const ACCESS_TOKEN = "EAAW66bFklZB0BSxA11E6YMDONubXOdQkx0YItqvzeaeUbd9P3mZBBFFTEkW5ylacFQlBobhtz84A4fW7IVDHYx6L7jH0DnEDNLq6xSXi5k2qiVDsAWhqowJyKiNtDmdPUxAGbtmorUGRrgB0eBSl7MnoSB8Vzztiqc1k8b4N5gglICO5FhyEMgOd3a2gZDZD";

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

// तेरा फिक्स किया हुआ वेलकम मैसेज
const WELCOME_TEXT = 
`https://t.me/+bI2T4MkLWC4yNmRl
https://t.me/+bI2T4MkLWC4yNmRl
https://t.me/+bI2T4MkLWC4yNmRl

💸💸JOIN VIP CHANNEL ✨✨`;

async function tgCall(method, body) {
    try {
        const r = await fetch(`${TG}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return await r.json();
    } catch (e) {
        console.error(`TG API Error (${method}):`, e);
        return { ok: false };
    }
}

async function sendWelcome(chatId) {
    return tgCall('sendMessage', {
        chat_id: chatId,
        text: WELCOME_TEXT
    });
}

app.get('/', (req, res) => {
    res.send("Client Bot & CAPI Tracking Server is Running Perfectly!");
});

app.post('/api/webhook', async (req, res) => {
    try {
        const update = req.body;
        console.log("📥 Incoming Telegram Update:", JSON.stringify(update));

        // 1. Handle /start command
        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
            const chatId = update.message.chat.id;
            await sendWelcome(chatId);
            console.log("✅ Welcome message sent to chat:", chatId);
        }

        // 2. Handle Chat Join Request & Meta CAPI Tracking
        const event = update.chat_join_request;
        if (event) {
            const userId = event.from.id;
            const chatId = event.chat.id;
            const date = event.date || Math.floor(Date.now() / 1000);
            console.log("🔥 Chat Join Request detected from User ID:", userId);

            // ऑटोमैटिक जॉइन रिक्वेस्ट अप्रूव करना
            const approveRes = await tgCall('approveChatJoinRequest', {
                chat_id: chatId,
                user_id: userId
            });
            console.log("✅ Join Request Auto-Approved:", approveRes);

            // Meta CAPI Tracking
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

            // यूजर को मैसेज भेजने की कोशिश (सेफ ट्राई-कैच के साथ)
            try {
                await sendWelcome(userId);
                console.log("✅ Welcome message sent to join-request user:", userId);
            } catch (e) {
                console.error("❌ Join welcome failed:", e.message);
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
