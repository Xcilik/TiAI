import json
from asyncio import get_event_loop_policy
from pyrogram import Client, filters, idle


# 🔥 GANTI DENGAN PUNYA KAMU 🔥
API_ID = 15730670  # Ganti dengan API ID kamu
API_HASH = "6382c4c37e016870f7b9cc57a5ae73af"  # Ganti dengan API HASH kamu
STRING_SESSION = "BQDwB-4AqYuGw2xgng6aUAgEP2eA23Dm0zdPXSztbcsXq0wKu5evfAj64Kgy7u8SO4yrOJNtFPgNPSIlf4o58Xu0mqAh8zExOuI8VJiL4kB6eybgu3u1y1ij1Stl2rLXbnyGYgfExnLPkbHWil3zhnipzhZ_HmJKsx25i9jMeRJHH3zYrpa3TZAHP6ZkHyboCX0NzANEFV4RtJiy1kf0eZvVOtS9MIdwpjTpnUFg0Rvr4h-x-nb-gg4zQkUM1ert9A1E69Is0eJ8y2R9fbGrbx3CyYxohQEVPih7PCBJCVQ5Kc1V7bdVMeyhdm-LBnfy8QN4iWEpYnX-vfmkoF-oUmF110Km0wAAAABxlDWOAA"  # Ganti dengan STRING SESSION kamu
BOT_ID = 6562504159  # ID bot yang akan dipantau

# Inisialisasi Pyrogram Userbot dengan String Session
app = Client("userbot", api_id=API_ID, api_hash=API_HASH, session_string=STRING_SESSION)

@app.on_message(~filters.me & filters.private & filters.bot & filters.incoming, group=69)
async def handle_message(client, message):
    try:
        # Cek apakah pesan berbentuk JSON
        data = json.loads(message.text)
        
        # Jika ada kunci "amount", kirim ulang pesan ke bot pengirim
        if "amount" in data:
            await client.send_message("MediailmuJoinBot", message.text)
            print("✅ Pesan dikirim ulang ke bot.")
    
    except json.JSONDecodeError:
        print("⛔ Pesan bukan JSON, diabaikan.")
    except Exception as e:
        print(f"❌ Error: {e}")

async def anjay():
    print("🚀 Userbot sedang berjalan...")
    await app.start()
    await app.send_message("me", "Duar")
    await idle()
    

if __name__ == "__main__":
    get_event_loop_policy().get_event_loop().run_until_complete(anjay())
