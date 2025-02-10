import { client } from './index';  // Pastikan path sudah benar

const targetGroupId = "120363394864692345@g.us"; // Ganti dengan ID grup yang benar

// Daftar pesan dan jadwalnya
const schedule = [
  { hour: 6, minute: 0, message: '👋 Selamat Pagi Kawan-kawan, yang masih bobo ayo bangun-bangun sudah pagi ini, Jangan lupa Sarapan pagi 🥰 🥰 🥰\n\n👥 All Member:\n' },
  { hour: 20, minute: 0, message: '😴 Selamat Malam Kawan-kawan, ini udah malem loh bobo yu nanti kalian sakit kalo bergadang terus, Have a good night sleep 🌝🌛💫\n\n👥 All Member:\n' },
  { hour: 4, minute: 30, message: '🥁 Dug dug dug, Bangun kawan-kawan, waktu sudah menunjukan jam 04:30 sebentar lagi azan subuh, mari kita menunaikan sholat subuh dulu yuks 🥰 🥰 🥰\n\n👥 All Member:\n' },
  { hour: 12, minute: 3, message: '⏰ Waktu sudah menunjukan Jam 12.03, Jangan lupa solat Zuhur ya Kawan-kawan 🥰 🥰 🥰\n\n👥 All Member:\n' },
  { hour: 15, minute: 19, message: '⏰ Waktu sudah menunjukan Jam 15.19, Jangan lupa solat Ashar ya Kawan-kawan 🥰 🥰 🥰\n\n👥 All Member:\n' },
  { hour: 18, minute: 33, message: '🥁 Dug dug dug, ⏰ Waktu sudah menunjukan Jam 18.15, Jangan lupa solat Magrib ya Kawan-kawan 🥰 🥰 🥰\n\n👥 All Member:\n' },
  { hour: 18, minute: 34, message: '⏰ Waktu sudah menunjukan Jam 19.26, Jangan lupa solat Isya ya Kawan-kawan 🥰 🥰 🥰\n\n👥 All Member:\n' }
];

// Fungsi untuk mengirim pesan ke grup
async function sendScheduledMessage(message) {
  try {
    const chat = await client.getChatById(targetGroupId);
    let mentions = [];

    for (let participant of chat.participants) {
      mentions.push(`${participant.id.user}@c.us`);
    }

    let textWithMention = `${message} `;
    for (let participant of chat.participants) {
      textWithMention += `@${participant.id.user} `;
    }

    await chat.sendMessage(textWithMention, { mentions });

    console.log(`Pesan berhasil dikirim: ${message}`);
  } catch (error) {
    console.error("Gagal mengirim pesan:", error);
  }
}

// Fungsi untuk menjadwalkan pesan
export function scheduleMessages() {
  console.log("Scheduler aktif!");

  schedule.forEach(({ hour, minute, message }) => {
    function scheduleNextRun() {
      const now = new Date();
      let targetTime = new Date();

      targetTime.setHours(hour, minute, 0, 0);

      if (now.getTime() > targetTime.getTime()) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const delay = targetTime.getTime() - now.getTime();
      console.log(`Pesan terjadwal pada ${targetTime.toLocaleString()}`);

      setTimeout(() => {
        sendScheduledMessage(message);
        setInterval(() => sendScheduledMessage(message), 24 * 60 * 60 * 1000);
      }, delay);
    }

    scheduleNextRun();
  });
}
