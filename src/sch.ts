import { client } from './index';  // Pastikan path-nya benar

// ID grup yang ingin dikirim pesan terjadwal
const targetGroupId = "120363296106393125@g.us"; // Ganti dengan ID grup yang benar

// Pesan yang ingin dikirim untuk setiap waktu
const messages = [
  '👋 Selamat Pagi Kawan-kawan, yang masih bobo ayo bangun-bangun sudah pagi ini, Jangan lupa Sarapan pagi 🥰 🥰 🥰\n\n👥 All Member:\n',  // Pagi
  '😴 Selamat Malam Kawan-kawan, ini udah malem loh bobo yu nanti kalian sakit kalo bergadang terus, Have a good night sleep 🌝🌛💫\n\n👥 All Member:\n', 
  '🥁 Dug dug dug, Bangun kawan-kawan, waktu sudah menunjukan jam 04:30 sebentar lagi azan subuh, mari kita menunaikan sholat subuh dulu yuks 🥰 🥰 🥰\n\n👥 All Member:\n',  
  '⏰ Waktu sudah menunjukan Jam 12.03, Jangan lupa solat Zuhur ya Kawan-kawan 🥰 🥰 🥰\n\n👥 All Member:\n',
  '⏰ Waktu sudah menunjukan Jam 15.19, Jangan lupa solat Ashar ya Kawan-kawan 🥰 🥰 🥰\n\n👥 All Member:\n',
  '🥁 Dug dug dug, ⏰ Waktu sudah menunjukan Jam 18.14, Jangan lupa solat Magrib ya Kawan-kawan 🥰 🥰 🥰\n\n👥 All Member:\n',
  '⏰ Waktu sudah menunjukan Jam 19.26, Jangan lupa solat Isya ya Kawan-kawan 🥰 🥰 🥰\n\n👥 All Member:\n'
];

// Fungsi untuk mengirim pesan terjadwal
async function sendScheduledMessage(messageIndex) {
  try {
    // Mendapatkan chat grup berdasarkan ID grup
    const chat = await client.getChatById(targetGroupId);

    // Mendapatkan daftar anggota grup
    let mentions = [];

    // Menambahkan mention untuk semua anggota grup
    for (let participant of chat.participants) {
      mentions.push(`${participant.id.user}@c.us`);  // Format ID peserta
    }

    // Membuat teks pesan sesuai dengan waktu
    const text = `${messages[messageIndex]}`;

    // Menambahkan mention setiap peserta pada pesan
    let textWithMention = `${text} `;
    for (let participant of chat.participants) {
      textWithMention += `@${participant.id.user} `;
    }

    // Kirim pesan dengan mention
    await chat.sendMessage(textWithMention, { mentions });

    console.log(`Pesan "${text}" berhasil dikirim ke grup.`);
  } catch (error) {
    console.error("Error sending scheduled message:", error);
  }
}

// Fungsi untuk menghitung waktu target dan mengirim pesan pada waktu tertentu
export function scheduleMessages() {
  console.log("Sch is ready!");

  // Jadwal untuk setiap waktu (pagi, siang, sore)
  const times = [
    { hours: 6, minutes: 0, messageIndex: 0 },  // Pagi
    { hours: 20, minutes: 0, messageIndex: 1 }, // Malam
    { hours: 4, minutes: 30, messageIndex: 2 },  // Sore
    { hours: 12, minutes: 3, messageIndex: 3 },  // Pagi
    { hours: 15, minutes: 19, messageIndex: 4 }, // Siang
    { hours: 18, minutes: 20, messageIndex: 5 },  // Sore   
    { hours: 19, minutes: 26, messageIndex: 6 }  // Sore    
 
  ];

  // Menghitung waktu target untuk masing-masing waktu
  const now = new Date();
  
  times.forEach((time) => {
    const targetTime = new Date();
    targetTime.setHours(time.hours, time.minutes, 0, 0);

    // Jika waktu target sudah lewat hari ini, jadwalkan untuk besok
    if (now.getTime() > targetTime.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1); // Pindah ke hari berikutnya
    }

    // Menghitung waktu tunggu hingga waktu target
    const waitTime = targetTime.getTime() - now.getTime();

    console.log(`Pesan terjadwal berikutnya akan dikirim pada: ${targetTime.toLocaleString()}`);

    // Jadwalkan pesan untuk waktu tertentu
    setTimeout(() => {
      sendScheduledMessage(time.messageIndex);

      // Kemudian atur interval untuk mengirim pesan setiap 24 jam
      setInterval(() => {
        sendScheduledMessage(time.messageIndex);
      }, 24 * 60 * 60 * 1000); // 24 jam dalam milidetik
    }, waitTime); // Pesan pertama akan dikirim setelah waitTime
  });
}
