const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const BOT_TOKEN = "8809261549:AAGf7n36QqEj5zAHzhcopScUwhMChTlbR5I";
const PIXEL_ID = "2938421813211161";
const ACCESS_TOKEN = "EAAW66bFklZB0BSxA11E6YMDONubXOdQkx0YItqvzeaeUbd9P3mZBBFFTEkW5ylacFQlBobhtz84A4fW7IVDHYx6L7jH0DnEDNLq6xSXi5k2qiVDsAWhqowJyKiNtDmdPUxAGbtmorUGRrgB0eBSl7MnoSB8Vzztiqc1k8b4N5gglICO5FhyEMgOd3a2gZDZD";
const CHANNEL_LINK = "https://t.me/+iChxoT_HOS41MmFl";

app.get('/', (req, res) => {
    res.send("Client Bot & CAPI Tracking Server is Running Perfectly!");
});

// Telegram Webhook Endpoint
app.post('/api/webhook', async (req, res) => {
    try {
        const update = req.body;
        
        // Handle /start command from user
        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
            const chatId = update.message.chat.id;
            const payload = {
                chat_id: chatId,
                text: "🔥 *Welcome!*\n\nClick below to access our VIP Channel:",
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🚀 Join VIP Channel", url: CHANNEL_LINK }]
                    ]
                }
            };
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }

        // Handle Chat Join Request (Jab user request bhejega, tab Subscribe event fire hoga)
        const event = update.chat_join_request;
        if (event) {
            const userId = event.from.id;
            const date = event.date || Math.floor(Date.now() / 1000);

            const cataPayload = {
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

            await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cataPayload)
            });
        }

        res.json({ ok: true });
    } catch (err) {
        console.error("Webhook Error:", err);
        res.status(500).json({ ok: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Auto set webhook on Railway deployment
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
