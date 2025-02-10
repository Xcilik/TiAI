import { Telegraf } from "telegraf";
import { client } from "./index.js";
import "dotenv/config";

// Inisialisasi bot Telegram
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Nomor WhatsApp tujuan (dalam format internasional tanpa tanda +)
const TARGET_WHATSAPP_NUMBER = process.env.ADMIN_NUMBER!;

// Event listener saat menerima pesan di Telegram
bot.on("text", async (ctx) => {
  const messageText = ctx.message.text;

  if (messageText.toLowerCase().startsWith("test")) {
    try {
      await client.sendMessage(`${TARGET_WHATSAPP_NUMBER}@c.us`, messageText);
      ctx.reply("✅ Pesan telah dikirim ke WhatsApp!");
    } catch (error) {
      console.error("❌ Gagal mengirim pesan ke WhatsApp:", error);
      ctx.reply("❌ Terjadi kesalahan saat mengirim pesan ke WhatsApp.");
    }
  }
});

// Jalankan bot Telegram
bot.launch().then(() => {
  console.log("🚀 Bot Telegram berjalan...");
});
