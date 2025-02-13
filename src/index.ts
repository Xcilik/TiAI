import { GoogleGenerativeAI } from "@google/generative-ai";
import moment from "moment-timezone";
import whatsapp from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import puppeteer from "puppeteer";
import "dotenv/config";
import { updateStats } from "./stats.js";
import { extractTextFromPDF } from "./utils.js";
import {
  initializeWhitelist,
  addToWhitelist,
  isAuthorized,
  ADMIN_NUMBER,
} from "./whitelist.js";
import { Telegraf } from "telegraf";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const client = new whatsapp.Client({
  authStrategy: new whatsapp.LocalAuth(),
  puppeteer: {
    executablePath: puppeteer.executablePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
  },
});

// Gracefully handle uncaught errors and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

client.once("ready", async () => {
  console.log("Client is ready!");
  await initializeWhitelist();
  client.sendPresenceAvailable();
});

client.on("qr", (qr) => {
  console.log("QR Code");
  qrcode.generate(qr, { small: true });
});

async function chatWithAI(messages: { role: string; text: string }[]) {
  try {
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      parts: msg.text ? [{ text: msg.text }] : [],
    }));

    const response = await model.generateContent({ contents: formattedMessages });
    return response.response.text() ?? "Maaf, saya tidak dapat menjawab saat ini.";
  } catch (error) {
    console.error("Error saat memproses AI:", error);
    return "Terjadi kesalahan saat memproses permintaan Anda.";
  }
}



client.on("message", async (message) => {
  const senderNumber = message.from.split("@")[0];

  const mentions = await message.getMentions();
  const isGroup = message.from.includes("@g.us");
  const mentionsMe = mentions.some((mention) => mention.isMe);
  if (isGroup && !mentionsMe) return;

  try {
    let userInput = "";
    const countryCode = senderNumber.slice(0, 2);

    if (message.type === "chat") {
      userInput = message.body;
      updateStats(countryCode, "message");
    }

    if (!userInput) {
      await message.reply("Silakan kirim pesan yang valid.");
      return;
    }

    const wChat = await message.getChat();
    await wChat.sendSeen();

    await wChat.sendStateTyping();
    const history = await wChat.fetchMessages({ limit: isGroup ? 25 : 5 });

    let messages = history
      .map((msg) => ({
        role: msg.fromMe ? "assistant" : "user",
        text: msg.body?.trim() || "",
      }))
      .filter((msg) => msg.text.length > 0);

    messages.push({ role: "user", text: userInput });
    const response = await chatWithAI(messages);
    await message.reply(response);

  } catch (error) {
    console.error("Error saat memproses pesan:", error);
    await message.reply("Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.");
  }
});

// Error handling for Telegram
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.on("text", async (ctx) => {
  try {
    const messageText = ctx.message.text;
    let parsedData;
    try {
      parsedData = JSON.parse(messageText);
    } catch (error) {
      return;
    }

    if (parsedData.amount) {
      const amount = parsedData.amount;
      const source = parsedData.payment_details?.source || "Tidak diketahui";
      const whatsappMessage = `📥 Uang masuk: Rp${amount.toLocaleString()} via ${source}`;
      await client.sendMessage(`${process.env.ADMIN_NUMBER}@c.us`, whatsappMessage);
      await ctx.reply(`✅ Pesan terkirim ke WhatsApp: ${whatsappMessage}`);
    }
  } catch (error) {
    console.error("❌ Error saat memproses pesan:", error);
  }
});

async function schedulePrayerReminders(groupId: string) {
  const prayerTimes = [
    { name: "Pagi", time: "06:00", message: "👋 Selamat Pagi..." },
    { name: "Malam", time: "21:00", message: "😴 Selamat Malam..." },
    { name: "Subuh", time: "04:30", message: "📢 *Pengingat Salat*\n\n🌅 Waktunya Salat Subuh!" },
    { name: "Dzuhur", time: "12:15", message: "📢 *Pengingat Salat*\n\n☀️ Waktunya Salat Dzuhur!" },
    { name: "Ashar", time: "15:20", message: "📢 *Pengingat Salat*\n\n🌤️ Waktunya Salat Ashar!" },
    { name: "Maghrib", time: "18:15", message: "📢 *Pengingat Salat*\n\n🌇 Waktunya Salat Maghrib!" },
    { name: "Isya", time: "19:28", message: "📢 *Pengingat Salat*\n\n🌙 Waktunya Salat Isya!" },
  ];

  for (const { name, time, message } of prayerTimes) {
    scheduleDailyTask(time, async () => {
      try {
        const chat = await client.getChatById(groupId);
        const participants = chat.participants.map((p) => `${p.id.user}@c.us`);
        let mentionText = participants.map((p) => `@${p.split("@")[0]} `).join('');
        await chat.sendMessage(`${message}\n\n${mentionText}`, { mentions: participants });
      } catch (error) {
        console.error(`❌ Gagal mengirim pengingat Salat ${name}:`, error);
      }
    });
  }
}

function scheduleDailyTask(time: string, task: () => void) {
  const now = moment().tz("Asia/Jakarta");
  const [hours, minutes] = time.split(":").map(Number);
  let targetTime = moment().tz("Asia/Jakarta").set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

  if (targetTime.isBefore(now)) targetTime.add(1, "day");

  const delay = targetTime.diff(now);

  setTimeout(() => {
    task();
    setInterval(task, 24 * 60 * 60 * 1000); // Repeat every 24 hours
  }, delay);
}

const PRAYER_GROUP_ID = "120363296106393125@g.us";
client.initialize().catch(err => {
  console.error("❌ Gagal menginisialisasi client:", err);
});
schedulePrayerReminders(PRAYER_GROUP_ID);
bot.launch();
