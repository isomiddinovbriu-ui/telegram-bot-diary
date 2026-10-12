# Emoji kundalik Telegram boti

Node.js + TypeScript + Telegraf + MongoDB bilan yozilgan shaxsiy kundalik boti. Hozircha AI API ishlatilmaydi: emoji tanlash uchun koddagi qoidalar va foydalanuvchi o‘rgatgan iboralar ishlatiladi.

## Ishlash tartibi

1. Botga **shaxsiy chatda** matn yuboring. Bot so‘zlarni tahrirlamaydi, faqat emoji qo‘shadi.
2. Kayfiyat noaniq yoki bir-biriga zid bo‘lgan bo‘lakda bot sizdan emoji so‘raydi. Tugmadan tanlash, o‘zingiz bitta emoji yuborish yoki emoji qo‘ymaslik mumkin.
3. Tayyor matnni tasdiqlang yoki to‘liq tahrirlab qayta yuboring. Sizning tahriringiz shu yozuv uchun yakuniy natija hisoblanadi.
4. Yakuniy matnni nusxalab Telegram guruhiga **o‘z nomingizdan** yuboring. `/tarix` oxirgi 5 ta yakuniy yozuvni ko‘rsatadi; `/bekor` joriy yozuvni to‘xtatadi.

Javob bergan iborangiz va emojingiz `users`da saqlanadi va keyingi mos yozuvlarda umumiy qoidadan ustun turadi. Tahrirlangan yakuniy matn `entries`da saqlanadi; aynan shu asl matn yana yuborilsa, tahrirlangan ko‘rinish taklif qilinadi. Erkin tahrirdan boshqa iboralar uchun avtomatik qoida chiqarilmaydi, chunki qaysi so‘zga qaysi emoji tegishli ekani noaniq bo‘lishi mumkin.

## Ishga tushirish

Node.js 22 yoki yangiroq versiya va MongoDB kerak.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

`.env` faylida BotFather bergan `BOT_TOKEN` va `MONGODB_URI` ni kiriting. Tokenni kodga yoki Git’ga qo‘ymang. `MONGODB_DB` ni xohlagan baza nomiga almashtirishingiz mumkin.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd start
```

`start` buyrug‘i `prestart` orqali avval TypeScript kodini `dist`ga kompilyatsiya qiladi. Linux serverda `npm install`, `.env` sozlash va `npm run start` yetarli; agar faqat production dependency o‘rnatilsa, avval dev dependency bilan `npm run build` bajarish kerak. Windows PowerShell’da `npm` skripti bloklansa, yuqoridagi kabi `npm.cmd` ishlating. Lokal ishlab chiqishda `npm.cmd run dev` botni fayllar o‘zgarganda qayta ishga tushiradi. Bot polling bilan ishlaydi; bir token uchun bir vaqtning o‘zida faqat bitta nusxasini ishga tushiring.

## Ma’lumotlar bazasi

- `users`: Telegram ID (`_id`), faol yozuv IDsi, o‘rgatilgan ibora→emoji tanlovlari, aynan takrorlangan matnlar uchun foydalanuvchi tahrirlari.
- `entries`: asl matn, bo‘laklar va ularning emoji manbasi, bot taklifi, yakuniy matn va holat.

Ikkala collectionda ham TTL index yo‘q. Yozuvlar avtomatik o‘chmaydi. `entries`da foydalanuvchi va vaqt bo‘yicha index bor; bot tarixni shu orqali oladi. `users`dagi tezkor afzalliklar soni cheklangan, lekin yozuvlar tarixi `entries`da qoladi. MongoDB backupini muntazam olish tavsiya etiladi.

## Chegaralar

- Qoidalar o‘zbekcha lotin yozuvidagi ayrim iboralarni taniydi. Qolgan joylarda bot savol beradi.
- Bot guruhdagi xabarlarni o‘zi o‘qimaydi yoki sizning nomingizdan yubormaydi.
- Xabar 2000 belgidan, tahrirlangan matn 2500 belgidan oshmasligi kerak.
