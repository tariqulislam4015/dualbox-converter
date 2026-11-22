<p align="center">
  <img src="assets/logo.svg" width="96" alt="DualBox logo">
</p>

<h1 align="center">DualBox — BV + EV Box Converter</h1>

<p align="center">
  বাংলা ও English Solve Sheet (.docx) থেকে এক ক্লিকে <b>Box Format (BV + EV)</b> Word ফাইল তৈরি করুন।<br>
  Bijoy (SutonnyMJ) → Unicode রূপান্তর · সঠিক উত্তর যাচাই · ১০০% অফলাইন
</p>

<p align="center">
  <a href="https://tariqulislam4015.github.io/dualbox-converter/"><b>🚀 Live App</b></a> ·
  <a href="https://www.youtube.com/@tis.academy24">YouTube</a> ·
  <a href="https://www.facebook.com/tariqul.islam.422531/">Facebook</a> ·
  <a href="https://www.linkedin.com/in/tariqul3315/">LinkedIn</a> ·
  <a href="https://wa.me/8801755489719">WhatsApp</a>
</p>

![DualBox screenshot](docs/screenshot-home.png)

## ✨ যা যা করে

| ফিচার | বিবরণ |
|---|---|
| 📥 দুই পাশে আপলোড | বাম পাশে বাংলা ভার্সন, ডান পাশে English ভার্সন (.docx) — drag & drop বা ক্লিক করে |
| 🔤 Bijoy → Unicode | SutonnyMJ/ANSI ফন্টের লেখা নিজে থেকেই Unicode (SolaimanLipi)-এ রূপান্তর — যুক্তবর্ণ, রেফ, কার-চিহ্ন সহ |
| 🧩 Box Format | নম্বর \| Subject → প্রশ্ন → ৪টি অপশন → ব্যাখ্যা → উত্তর \| মার্ক; উদ্দীপক আলাদা বক্সে |
| ✅ উত্তর যাচাই | `√` চিহ্ন দেখে সঠিক উত্তর বের করে, দুই ভার্সনে মিলিয়ে দেখে; না মিললে লাল বক্সে সতর্ক করে |
| ✏️ প্রিভিউ ও সংশোধন | ডাউনলোডের আগে সব বক্স দেখা যায়, দরকার হলে উত্তর বদলানো যায় |
| ∑ Equation ও ছবি | Word equation (O₂, H₂SO₄…) ও ছবি অক্ষত থাকে; চাইলে equation সাধারণ টেক্সটে রূপান্তর |
| 🔁 স্মার্ট | ফাইল উল্টো ঘরে দিলে নিজেই ঠিক করে; header থেকে শিরোনাম, Code ও Subject code বসিয়ে দেয় |
| 🔒 প্রাইভেসি | সব কাজ browser-এই হয় — কোনো ফাইল কোনো সার্ভারে যায় না |

## 🚀 ব্যবহার

1. `index.html` যেকোনো আধুনিক browser-এ (Chrome / Edge / Firefox) খুলুন — অথবা Live App লিংকে যান।
2. বাম ঘরে **বাংলা** ও ডান ঘরে **English** Solve Sheet দিন।
3. **Convert করুন** → প্রিভিউ যাচাই করুন → **Box .docx ডাউনলোড**।

### Solve Sheet যেভাবে লেখা থাকলে সবচেয়ে ভালো কাজ করে

```
01. প্রশ্ন ...
(a) অপশন
(b) অপশন
√ (c) সঠিক অপশন
(d) অপশন
Solve: ব্যাখ্যা ...

নিচের উদ্দীপকের আলোকে পরবর্তী দুইটি প্রশ্নের উত্তর দাও:
উদ্দীপকের লেখা ...
```

- অপশন `(a)`–`(d)` বা `(ক)`–`(ঘ)` দুটোই চলে; সঠিক উত্তরে `√` / `✓` (না থাকলে হাইলাইট দেখে ধরে)।
- ব্যাখ্যার শুরুতে `Solve:` / `Solution:` / `ব্যাখ্যা:` / `সমাধান:`।

## 🛠️ ডেভেলপমেন্ট

```
dualbox-converter/
├── index.html          ← বিল্ড করা single-file অ্যাপ (GitHub Pages এটাই দেখায়)
├── build.py            ← src/ থেকে index.html তৈরি করে
├── src/
│   ├── template.html   ← UI (HTML + CSS + UI script)
│   ├── core.js         ← engine: docx পড়া, Bijoy→Unicode, পার্সিং, Box docx লেখা
│   └── assets/         ← প্রোফাইল ছবি ও চ্যানেল লোগো
├── tests/bijoy.test.cjs
├── assets/logo.svg
└── docs/               ← স্ক্রিনশট
```

```bash
# কোড বদলানোর পর
python3 build.py              # index.html আবার তৈরি
node tests/bijoy.test.cjs     # Bijoy রূপান্তর টেস্ট
```

কোনো বাইরের লাইব্রেরি লাগে না — ZIP পড়া/লেখা browser-এর নিজস্ব `DecompressionStream` / `CompressionStream` দিয়ে করা।

## 🌐 GitHub Pages-এ চালু করা

Repo-র **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`** → Save।
কিছুক্ষণ পর অ্যাপ পাওয়া যাবে: `https://tariqulislam4015.github.io/dualbox-converter/`

## 👤 নির্মাতা

**তারিকুল ইসলাম (সুমন)** — MSc Mathematics · [TIS Academy](https://www.youtube.com/@tis.academy24) (Teach Idea For Success)

[YouTube](https://www.youtube.com/@tis.academy24) · [Facebook](https://www.facebook.com/tariqul.islam.422531/) · [LinkedIn](https://www.linkedin.com/in/tariqul3315/) · [WhatsApp](https://wa.me/8801755489719) · [GitHub](https://github.com/tariqulislam4015)

## 📄 License

[MIT](LICENSE) © 2026 Tariqul Islam (Sumon)
