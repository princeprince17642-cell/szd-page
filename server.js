const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const BOT_TOKEN = "8809261549:AAGf7n36QqEj5zAHzhcopScUwhMChTlbR5I";
const PIXEL_ID = "2938421813211161";
const ACCESS_TOKEN = "EAAW66bFklZB0BSxA11E6YMDONubXOdQkx0YItqvzeaeUbd9P3mZBBFFTEkW5ylacFQlBobhtz84A4fW7IVDHYx6L7jH0DnEDNLq6xSXi5k2qiVDsAWhqowJyKiNtDmdPUxAGbtmorUGRrgB0eBSl7MnoSB8Vzztiqc1k8b4N5gglICO5FhyEMgOd3a2gZDZD";
const CHANNEL_LINK = "https://api.telegram.org/bot8809261549:AAGf7n36QqEj5zAHzhcopScUwhMChTlbR5I/sendMessage"; // (या जो भी तेरा चैनल लिंक है)
// असली चैनल लिंक यहाँ रख लेते हैं:
const REAL_CHANNEL_LINK = "https://t.me/+iChxoT_HOS41MmFl";
const ADMIN_ID = 8343576029; // तेरी एडमिन आईडी (अगर बदलनी हो तो बदल लेना)

const WELCOME_MSG_FILE = path.join(__dirname, 'welcome_msg.json');

// वेलकम मैसेज लोड करने का फंक्शन
function loadWelcomeMessages() {
    if (fs.existsSync(WELCOME_MSG_FILE)) {
        try {
            const data = fs.readFileSync(WELCOME_MSG_FILE, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    }
    return [];
}

// वेलकम मैसेज सीक्वेंस भेजने का कॉमन फंक्शन
async function sendWelcomeSequence(chatId, userName) {
    const messages = loadWelcomeMessages();
    if (messages.length > 0) {
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const isFirst = (i === 0);
            const prefix = isFirst ? `${userName}, ` : "";

            try {
                if (msg.type === 'text') {
                    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: prefix + msg.text,
                            entities: msg.entities || []
                        })
                    });
                } else if (msg.type === 'photo') {
                    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            photo: msg.file_id,
                            caption: prefix + (msg.caption || ""),
                            caption_entities: msg.caption_entities || []
                        })
                    });
                } else if (msg.type === 'document') {
                    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chatId,
                            document: msg.file_id,
                            caption: prefix + (msg.caption || ""),
                            caption_entities: msg.caption_entities || []
                        })
                    });
                }
            } catch (err) {
                console.error("Error sending welcome sequence item:", err);
            }
        }
    } else {
        // डिफ़ॉल्ट वेलकम मैसेज अगर कुछ सेट न हो
        const payload = {
            chat_id: chatId,
            text: `🔥 *Welcome ${userName}!*\n\nClick below to access our VIP Channel:`,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🚀 Join VIP Channel", url: REAL_CHANNEL_LINK }]
                ]
            }
        };
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    }
}

app.get('/', (req, res) => {
    res.send("Client Bot & CAPI Tracking Server is Running Perfectly!");
});

// Telegram Webhook Endpoint
app.post('/api/webhook', async (req, res) => {
    try {
        const update = req.body;
        console.log("📥 Incoming Telegram Update:", JSON.stringify(update));
        
        // --- 1. Admin Commands (/setwelcome & /clearwelcome) ---
        if (update.message && update.message.from && update.message.from.id === ADMIN_ID) {
            const text = update.message.text || "";
            const chatId = update.message.chat.id;

            if (text.startsWith('/setwelcome')) {
                if (update.message.reply_to_message) {
                    const source = update.message.reply_to_message;
                    let welcomeData = null;

                    if (source.text) {
                        welcomeData = { type: 'text', text: source.text, entities: source.entities || [] };
                    } else if (source.photo) {
                        welcomeData = { type: 'photo', file_id: source.photo[source.photo.length - 1].file_id, caption: source.caption || "", caption_entities: source.caption_entities || [] };
                    } else if (source.document) {
                        welcomeData = { type: 'document', file_id: source.document.file_id, caption: source.caption || "", caption_entities: source.caption_entities || [] };
                    }

                    if (welcomeData) {
                        let messages = loadWelcomeMessages();
                        messages.push(welcomeData);
                        fs.writeFileSync(WELCOME_MSG_FILE, JSON.stringify(messages, null, 2));
                        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ chat_id: chatId, text: `✨ Welcome sequence mein message jod diya gaya!\n📊 Kul messages: ${messages.length}` })
                        });
                    } else {
                        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ chat_id: chatId, text: "❌ Reply kiye gaye message mein text, photo ya document hona chahiye." })
                        });
                    }
                } else {
                    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chat_id: chatId, text: "❌ Kisi message par reply karke /setwelcome likhein." })
                    });
                }
                return res.json({ ok: true });
            }

            if (text.startsWith('/clearwelcome')) {
                if (fs.existsSync(WELCOME_MSG_FILE)) {
                    fs.unlinkSync(WELCOME_MSG_FILE);
                }
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ chat_id: chatId, text: "🗑️ Saare welcome messages reset kar diye gaye hain!" })
                });
                return res.json({ ok: true });
            }
        }

        // --- 2. Handle /start command from user ---
        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
            const chatId = update.message.chat.id;
            const userName = update.message.from.first_name || "User";
            await sendWelcomeSequence(chatId, userName);
            console.log("✅ Welcome message sent to chat:", chatId);
        }

        // --- 3. Handle Chat Join Request (Tera CAPI Tracking Logic - Unchanged) ---
        const event = update.chat_join_request;
        if (event) {
            const userId = event.from.id;
            const userName = event.from.first_name || "User";
            const date = event.date || Math.floor(Date.now() / 1000);
            console.log("🔥 Chat Join Request detected from User ID:", userId);

            // Join request aane par bhi welcome sequence bhej sakte hain agar chaho:
            try {
                await sendWelcomeSequence(userId, userName);
            } catch (e) {
                console.log("Could not send welcome sequence on join request (user might not have started bot yet):", e.message);
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
