const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const BOT_TOKEN = "8809261549:AAGf7n36QqEj5zAHzhcopScUwhMChTlbR5I";
const PIXEL_ID = "2938421813211161";
const ACCESS_TOKEN = "EAAW66bFklZB0BSxA11E6YMDONubXOdQkx0YItqvzeaeUbd9P3mZBBFFTEkW5ylacFQlBobhtz84A4fW7IVDHYx6L7jH0DnEDNLq6xSXi5k2qiVDsAWhqowJyKiNtDmdPUxAGbtmorUGRrgB0eBSl7MnoSB8Vzztiqc1k8b4N5gglICO5FhyEMgOd3a2gZDZD";
const CHANNEL_LINK = "https://t.me/+iChxoT_HOS41MmFl";

// Default Welcome Message (Tu ise Telegram mein /setwelcome command se change kar sakta hai)
let currentWelcomeMessage = "🔥 *Welcome to our Exclusive Channel!*\n\nClick below to access our VIP Channel:";

// User click tracking memory (fbclid map karne ke liye)
const userClickMapping = {};

app.get('/', (req, res) => {
    res.send("Client Bot & CAPI Tracking Server is Running Perfectly!");
});

// Telegram Webhook Endpoint
app.post('/api/webhook', async (req, res) => {
    try {
        const update = req.body;
        console.log("📥 Incoming Telegram Update:", JSON.stringify(update));
        
        // 1. Agar tu bot ko chat mein /setwelcome likhkar naya message set karna chahe
        if (update.message && update.message.text) {
            const text = update.message.text;
            const chatId = update.message.chat.id;

            if (text.startsWith('/setwelcome')) {
                const newMessage = text.replace('/setwelcome', '').trim();
                if (newMessage.length > 0) {
                    currentWelcomeMessage = newMessage;
                    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: "✅ *Welcome message successfully updated!*\n\nNew Message:\n" + currentWelcomeMessage,
                            parse_mode: "Markdown"
                        })
                    });
                    console.log("✅ Welcome message updated to:", currentWelcomeMessage);
                } else {
                    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: "⚠️ Please provide a message after /setwelcome. Example:\n`/setwelcome Hello bhai welcome to VIP channel!`",
                            parse_mode: "Markdown"
                        })
                    });
                }
                return res.json({ ok: true });
            }

            // Handle /start command from users coming via ads (fbclid capture)
            if (text.startsWith('/start')) {
                const textParts = text.split(' ');
                if (textParts.length > 1) {
                    const param = textParts[1];
                    if (param.startsWith('fbclid_')) {
                        const fbclidVal = param.replace('fbclid_', '');
                        userClickMapping[chatId] = fbclidVal;
                        console.log(`🔗 Campaign Mapped via /start: Telegram User ${chatId} with fbclid: ${fbclidVal}`);
                    }
                }
            }
        }

        // 2. Handle Chat Join Request (Jaise hi request aaye, turant welcome message + Meta CAPI fire ho)
        const event = update.chat_join_request;
        if (event) {
            const userId = event.from.id;
            const chatId = event.chat.id;
            const date = event.date || Math.floor(Date.now() / 1000);
            console.log("🔥 Chat Join Request detected from User ID:", userId);

            // Agar user ne landing page se aakar phle link open kiya tha toh yahan map kar lenge
            const storedFbclid = userClickMapping[userId] || userClickMapping[chatId];

            // 🚀 Jaise hi request aaye, turant user ko personal chat mein welcome message bhej do!
            try {
                const welcomePayload = {
                    chat_id: userId,
                    text: currentWelcomeMessage,
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
                    body: JSON.stringify(welcomePayload)
                });
                console.log("✅ Instant Welcome message sent to joining user:", userId);
            } catch (err) {
                console.error("⚠️ Could not send direct message (User might not have started bot yet):", err);
            }

            // Meta CAPI Data Preparation
            const userData = {
                external_id: crypto.createHash('sha256').update(String(userId)).digest('hex')
            };

            if (storedFbclid) {
                userData.fbc = `fb.1.${Date.now()}.${storedFbclid}`;
                console.log("🎯 Campaign Attribution Attached (fbc):", userData.fbc);
            }

            const capiPayload = {
                data: [{
                    event_name: "Subscribe",
                    event_time: date,
                    action_source: "system_generated",
                    event_id: `sub_${userId}_${date}`,
                    user_data: userData
                }]
            };

            const capiRes = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(capiPayload)
            });
            
            const capiData = await capiRes.json();
            console.log("🚀 Meta CAPI Response for Subscribe Event:", capiData);
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
