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

client.once("ready", async () => {
  console.log("Client is ready!");
  await initializeWhitelist();
  client.sendPresenceAvailable();
});

// Generate QR Code untuk login
client.on("qr", (qr) => {
  console.log("QR Code");
  qrcode.generate(qr, { small: true });
});

// ✅ Fungsi untuk mengobrol dengan AI (Gemini) - Sudah Fix
async function chatWithAI(messages: { role: string; text: string }[]) {
  try {
    // ✅ Pastikan setiap message memiliki format yang benar
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      parts: msg.text ? [{ text: msg.text }] : [], // Hanya tambahkan `text` jika tidak kosong
    }));

    const response = await model.generateContent({
      contents: formattedMessages,
    });

    // ✅ Pastikan response yang diambil benar
    return response.response.text() ?? "Maaf, saya tidak dapat menjawab saat ini.";
  } catch (error) {
    console.error("Error saat memproses AI:", error);
    return "Terjadi kesalahan saat memproses permintaan Anda.";
  }
}


// Fungsi Placeholder untuk Transkripsi Audio
async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  console.log("Menerjemahkan audio...");
  return "Fitur transkripsi belum didukung oleh Gemini API.";
}

// Fungsi Placeholder untuk Analisis Gambar
async function vision(imageUrl: string): Promise<string> {
  console.log("Menganalisis gambar...");
  return "Fitur analisis gambar belum tersedia di Gemini API.";
}

// ✅ Penanganan Pesan WhatsApp - Sudah Fix
client.on("message", async (message) => {
  const senderNumber = message.from.split("@")[0];

  // Abaikan pesan dari grup kecuali jika AI disebut
  const mentions = await message.getMentions();
  const isGroup = message.from.includes("@g.us");
  const mentionsMe = mentions.some((mention) => mention.isMe);
  if (isGroup && !mentionsMe) {
    return;
  }

  try {
    let userInput = "";
    const countryCode = senderNumber.slice(0, 2);

    // Handle pesan dengan media
    if (message.hasMedia) {
      const media = await message.downloadMedia();

      if (message.type === "ptt" || message.type === "audio") {
        userInput = await transcribeAudio(Buffer.from(media.data, "base64"));
        updateStats(countryCode, "audio");
      } else if (message.type === "image") {
        userInput = "Gambar";
        updateStats(countryCode, "image");
      } else if (message.type === "sticker") {
        userInput = "Stiker";
        updateStats(countryCode, "sticker");
      } else if (message.type === "document") {
        if (media.mimetype === "application/pdf") {
          userInput = await extractTextFromPDF(
            Buffer.from(media.data, "base64")
          );
          updateStats(countryCode, "document");
        } else {
          userInput = "Dokumen";
        }
      }
    }

    // Handle pesan teks biasa
    if (message.type === "chat") {
      userInput = message.body;
      updateStats(countryCode, "message");
    }

    if (!userInput) {
      await message.reply("Silakan kirim pesan yang valid.");
      return;
    }

    // Ambil riwayat percakapan
    const wChat = await message.getChat();
    await wChat.sendSeen();
    if (userInput.startsWith("/clear")) {
      await wChat.clearMessages();
      await wChat.sendMessage("Riwayat percakapan telah dihapus.");
      return;
    }

    await wChat.sendStateTyping();
    const history = await wChat.fetchMessages({ limit: isGroup ? 25 : 5 });

    // ✅ Format pesan ke AI - Sudah Fix
// ✅ Format pesan ke AI - Sudah Fix
    let messages = history
      .map((msg) => ({
        role: msg.fromMe ? "assistant" : "user",
        text: msg.body?.trim() || "", // Gunakan `trim()` untuk menghapus spasi kosong
      }))
      .filter((msg) => msg.text.length > 0); // Hapus pesan yang kosong
    
    messages.push({ role: "user", text: userInput });
    
    // ✅ Kirim ke AI dan balas ke user
    const response = await chatWithAI(messages);
    await message.reply(response);

  } catch (error) {
    console.error("Error saat memproses pesan:", error);
    await message.reply(
      "Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi."
    );
  }
});

// Mendapatkan ID Grup saat diminta
client.on("message", async (message) => {
  if (message.from.includes("@g.us") && message.body === "/idd") {
    try {
      const chat = await message.getChat();
      console.log(`ID Grup: ${chat.id._serialized}`);
      await message.reply(`ID Grup: ${chat.id._serialized}`);
    } catch (error) {
      console.error("Error mendapatkan ID grup:", error);
    }
  }
});

// Fitur Tag Semua Anggota Grup
client.on("message", async (msg) => {
  if (msg.body === "tagall") {
    const chat = await msg.getChat();
    let text = "";
    let mentions = [];

    for (let participant of chat.participants) {
      mentions.push(`${participant.id.user}@c.us`);
      text += `@${participant.id.user} `;
    }

    await chat.sendMessage(text, { mentions });
  }
});

// Menolak Panggilan Masuk
client.on("incoming_call", async (call) => {
  try {
    await call.reject();
    await client.sendMessage(
      call.from,
      "Maaf, saya tidak dapat menerima panggilan. Silakan kirim pesan suara sebagai gantinya."
    );
  } catch (error) {
    console.error("Error menangani panggilan:", error);
  }
});

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Nomor WhatsApp tujuan (dalam format internasional tanpa tanda +)
const TARGET_WHATSAPP_NUMBER = process.env.ADMIN_NUMBER!;

// Event listener saat menerima pesan di Telegram
bot.on("text", async (ctx) => {
  try {
    const messageText = ctx.message?.text;

    if (!messageText) return; // Abaikan jika tidak ada teks

    // Cek apakah pesan dikirim oleh bot
    const isBotMessage = ctx.message.from?.is_bot;

    // Coba parse pesan sebagai JSON
    let parsedData;
    try {
      parsedData = JSON.parse(messageText);
    } catch (error) {
      return; // Abaikan jika bukan JSON
    }

    // Pastikan JSON memiliki field "amount"
    if (parsedData.amount) {
      const amount = parsedData.amount;
      const source = parsedData.payment_details?.source || "Tidak diketahui";

      const whatsappMessage = `📥 Uang masuk: Rp${amount.toLocaleString()} via ${source}`;

      // Kirim ke WhatsApp
      await client.sendMessage(`${TARGET_WHATSAPP_NUMBER}@c.us`, whatsappMessage);

      // Jika pesan berasal dari bot, kirim ulang ke dirinya sendiri agar diproses
      if (isBotMessage) {
        await bot.telegram.sendMessage(ctx.chat.id, `🔁 Bot memproses ulang pesan:\n${whatsappMessage}`);
      } else {
        await ctx.reply(`✅ Pesan terkirim ke WhatsApp: ${whatsappMessage}`);
      }

      console.log("✅ Pesan terkirim ke WhatsApp:", whatsappMessage);
    }
  } catch (error) {
    console.error("❌ Error saat memproses pesan:", error);
  }
});







// Fungsi untuk mengirim pengingat salat ke grup WhatsApp

// Fungsi untuk mengirim pengingat salat ke grup WhatsApp dengan mention semua anggota
async function schedulePrayerReminders(groupId: string) {
  const prayerTimes = [
    { name: "Pagi", time: "06:00", message: "👋 Selamat Pagi Kawan-kawan, yang masih bobo ayo bangun-bangun sudah pagi ini, Jangan lupa Sarapan pagi 🥰 🥰 🥰." },
    { name: "Malam", time: "21:00", message: "😴 Selamat Malam Kawan-kawan, ini udah malem loh bobo yu nanti kalian sakit kalo bergadang terus, Have a good night sleep 🌝🌛💫." },    
    { name: "Subuh", time: "04:30", message: "📢 *Pengingat Salat*\n\n🌅 Waktunya Salat Subuh! Jangan lupa berdoa dan memulai hari dengan berkah." },
    { name: "Dzuhur", time: "12:15", message: "📢 *Pengingat Salat*\n\n☀️ Waktunya Salat Dzuhur! Luangkan waktu sejenak untuk beribadah." },
    { name: "Ashar", time: "15:20", message: "📢 *Pengingat Salat*\n\n🌤️ Waktunya Salat Ashar! Tetap semangat dan jangan tinggalkan salat ya." },
    { name: "Maghrib", time: "18:15", message: "📢 *Pengingat Salat*\n\n🌇 Waktunya Salat Maghrib! Semoga ibadah kita diterima." },
    { name: "Isya", time: "19:28", message: "📢 *Pengingat Salat*\n\n🌙 Waktunya Salat Isya! Istirahatkan tubuh dan jangan lupa salat." },
  ];

  for (const { name, time, message } of prayerTimes) {
    scheduleDailyTask(time, async () => {
      try {
        const chat = await client.getChatById(groupId);
        const participants = chat.participants.map((p) => `${p.id.user}@c.us`);
        
        let mentionText = "";
        for (const participant of participants) {
          mentionText += `@${participant.split("@")[0]} `;
        }

        await chat.sendMessage(`${message}\n\n${mentionText}`, {
          mentions: participants,
        });

        console.log(`✅ Pengingat ${name} terkirim ke grup ${groupId}`);
      } catch (error) {
        console.error(`❌ Gagal mengirim pengingat Salat ${name}:`, error);
      }
    });
  }

  console.log(`📅 Pengingat salat dengan mention semua anggota dijadwalkan untuk grup: ${groupId}`);
}

// Fungsi untuk menjadwalkan tugas setiap hari pada jam tertentu (Zona Waktu Jakarta)
function scheduleDailyTask(time: string, task: () => void) {
  const now = moment().tz("Asia/Jakarta");
  const [hours, minutes] = time.split(":").map(Number);
  let targetTime = moment().tz("Asia/Jakarta").set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

  if (targetTime.isBefore(now)) {
    targetTime.add(1, "day"); // Jika waktu sudah lewat, jadwalkan untuk besok
  }

  const delay = targetTime.diff(now);

  setTimeout(() => {
    task();
    setInterval(task, 24 * 60 * 60 * 1000); // Ulangi setiap 24 jam
  }, delay);
}


// ID grup WhatsApp yang akan menerima pengingat (ganti dengan ID grup yang sesuai)
const PRAYER_GROUP_ID = "120363296106393125@g.us";


// Inisialisasi Client
client.initialize();

schedulePrayerReminders(PRAYER_GROUP_ID);

bot.launch().then(() => {
  console.log("🚀 Bot Telegram berjalan...");
});
