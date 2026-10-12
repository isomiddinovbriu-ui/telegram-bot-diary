# Emoji kundalik Telegram boti

Node.js + TypeScript + Telegraf + MongoDB bilan yozilgan shaxsiy kundalik boti. Hozircha AI API ishlatilmaydi: emoji tanlash uchun koddagi qoidalar va foydalanuvchi o‘rgatgan iboralar ishlatiladi.

## Ishlash tartibi

1. Botga **shaxsiy chatda** matn yuboring. Bot so‘zlarni tahrirlamaydi, faqat emoji qo‘shadi.
2. Kayfiyat noaniq yoki bir-biriga zid bo‘lgan bo‘lakda bot sizdan emoji so‘raydi. Tugmadan tanlash, o‘zingiz bitta emoji yuborish yoki emoji qo‘ymaslik mumkin. Qo‘lda eng ko‘p kiritgan 4 ta emojingiz ham tezkor tugma sifatida ko‘rinadi.
3. Tayyor matnni tasdiqlang yoki to‘liq tahrirlab qayta yuboring. Tahrirdan keyin bot matnni yana ko‘rsatadi; sizning tahriringiz ustuvor bo‘ladi.
4. **Tasdiqlash va guruhga yuborish** bosilganda bot yakuniy matnni `.env`dagi guruhga o‘z nomidan yuboradi. `/tarix` oxirgi 5 ta yakuniy yozuvni ko‘rsatadi; `/qidir so‘z` yakuniy matndan so‘z yoki iborani qidiradi; `/bekor` joriy yozuvni to‘xtatadi.

Javob bergan iborangiz va emojingiz `users`da saqlanadi va keyingi mos yozuvlarda umumiy qoidadan ustun turadi. Tahrirlangan yakuniy matn `entries`da saqlanadi; aynan shu asl matn yana yuborilsa, tahrirlangan ko‘rinish taklif qilinadi. Tahrirda so‘zlar o‘zgarmay, faqat bitta emoji aniq qo‘shilgan bo‘lsa, o‘rgatilgan emoji ham yangilanadi. Murakkab erkin tahrirdan avtomatik qoida chiqarilmaydi, chunki qaysi so‘zga qaysi emoji tegishli ekani noaniq bo‘lishi mumkin.

## Ishga tushirish

Node.js 22 yoki yangiroq versiya va MongoDB kerak.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

`.env` faylida BotFather bergan `BOT_TOKEN`, `MONGODB_URI` va o‘zingizning Telegram ID raqamingizni `OWNER_TELEGRAM_ID` sifatida kiriting. Tokenni kodga yoki Git’ga qo‘ymang. `MONGODB_DB` ni xohlagan baza nomiga almashtirishingiz mumkin.

Guruhni ulash uchun botni guruhga qo‘shing. Guruh ichida `/chatid` yuboring (agar bot ko‘rmasa, `/chatid@BotUsername`); bot qaytargan IDni `.env`dagi `GROUP_CHAT_ID` ga yozib botni qayta ishga tushiring. Bot guruhga xabar yozish huquqiga ega bo‘lishi kerak. `GROUP_CHAT_ID` bo‘sh turganda tasdiqlangan matn yuborilmaydi; sozlangach o‘sha tasdiqlash tugmasini qayta bosishingiz mumkin.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd start
```

`start` buyrug‘i `prestart` orqali avval TypeScript kodini `dist/index.js`ga kompilyatsiya qiladi. Linux serverda `npm install`, `.env` sozlash va `npm run start` yetarli; agar faqat production dependency o‘rnatilsa, avval dev dependency bilan `npm run build` bajarish kerak. Windows PowerShell’da `npm` skripti bloklansa, yuqoridagi kabi `npm.cmd` ishlating. Lokal ishlab chiqishda `npm.cmd run dev` botni fayllar o‘zgarganda qayta ishga tushiradi. Bot polling bilan ishlaydi; bir token uchun bir vaqtning o‘zida faqat bitta nusxasini ishga tushiring.

Bot ishga tushganda Telegram’dagi `/` menyusiga egasining shaxsiy chati uchun `/start`, `/tarix`, `/qidir` va `/bekor` buyruqlarini qo‘shadi. `/qidir` tanlangach, bo‘sh joydan keyin qidiriladigan so‘z yoki iborani yozing (masalan, `/qidir xursand`).

## Ma’lumotlar bazasi

- `entiries_entered`: “Boshqa emoji kiritaman” orqali yuborilgan tanlovlar tarixi. Har bir hujjatda foydalanuvchi IDsi, yozuv IDsi, parcha raqami va matni, emoji hamda kiritilgan vaqt bor. Bot shu collectiondan tezkor tugmalarni hisoblaydi; tugmadan tanlangan emojilar bu yerga yozilmaydi. Matnga avtomatik emoji taklif qilish uchun `users.learnedPhrases` ishlatiladi.
- `users`: Telegram ID (`_id`), faol yozuv IDsi, o‘rgatilgan ibora→emoji tanlovlari, aynan takrorlangan matnlar uchun foydalanuvchi tahrirlari.
- `entries`: asl matn, bo‘laklar va ularning emoji manbasi, bot taklifi, yakuniy matn, holat va guruhga yuborilgan xabarning IDsi.

Uchala collectionda ham TTL index yo‘q. Yozuvlar avtomatik o‘chmaydi. `entries`da foydalanuvchi va vaqt bo‘yicha index bor; bot tarixni shu orqali oladi. `users`dagi tezkor afzalliklar soni cheklangan, lekin yozuvlar tarixi `entries`da qoladi. MongoDB backupini muntazam olish tavsiya etiladi.

`/qidir xursand` shaxsiy chatda ishlaydi: faqat o‘zingizning guruhga yuborilgan yakuniy matnlaringiz ichidan, katta-kichik harflarni farqlamasdan, oxirgi 5 ta mos yozuvni ko‘rsatadi. Qidiruv so‘zi oddiy matn sifatida olinadi; kamida 2, ko‘pi bilan 80 belgi bo‘lishi kerak.

## Chegaralar

- Qoidalar o‘zbekcha lotin yozuvidagi ayrim iboralarni taniydi. Qolgan joylarda bot savol beradi.
- Bot guruhdagi kundalik xabarlarini o‘qimaydi. Guruhga yuborilgan xabar **bot nomidan** ko‘rinadi; Telegram Bot API foydalanuvchi nomidan yubormaydi.
- Xabar 2000 belgidan, tahrirlangan matn 2500 belgidan oshmasligi kerak.
