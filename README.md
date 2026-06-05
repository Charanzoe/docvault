# 🔐 Vaultora

**Secure, local-first vault for your important documents — Aadhaar, PAN, Passport, certificates and more.**

🌐 **Live demo:** [Deploy below](#-view-on-any-device)

![Vaultora](https://img.shields.io/badge/Vaultora-v2.0-6c8cff?style=for-the-badge)
![Privacy](https://img.shields.io/badge/Privacy-100%25_Local-3ddc97?style=for-the-badge)
![Mobile](https://img.shields.io/badge/Responsive-All_Devices-b56cff?style=for-the-badge)

---

## ✨ Features

- 🔐 **Master password** (SHA-256 hashed locally)
- 🔑 **Recovery key + Security question** for forgotten passwords
- 📂 **15+ document types** — Aadhaar, PAN, Passport, DL, Voter ID, Degree, Certificates, Medical, Financial, Legal & more
- 🎨 **6 beautiful themes** — Aurora, Midnight, Ember, Forest, Ocean, Rose
- 📱 **Fully responsive** — works on phones, tablets, laptops, 4K displays
- ⏰ **Expiry tracking** with smart reminders
- 🔒 **Auto-lock** after inactivity
- 📥 **Backup & restore** — export your vault as JSON
- 🚫 **Zero cloud, zero tracking** — everything stays on your device

---

## 📱 View on Any Device

### Option 1 — GitHub Pages (Free, 30 seconds)

1. Go to your repo → **Settings** → **Pages**
2. Source: `Deploy from a branch` → Branch: `main` → `/ (root)` → **Save**
3. Wait ~1 minute → site live at:
   ```
   https://charanzoe.github.io/docvault/
   ```
4. Open this URL on any phone, tablet, or laptop ✓

### Option 2 — Vercel (Free, custom domain)

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. **Import Project** → select `docvault` repo → **Deploy**
3. Get URL like `docvault.vercel.app`

### Option 3 — Netlify (Drag & drop)

1. Go to [netlify.com](https://netlify.com)
2. Drag the `docvault` folder onto the dashboard
3. Get instant URL

---

## 🚀 Run Locally

Just open `index.html` in any browser. No build, no install.

```bash
git clone https://github.com/Charanzoe/docvault.git
cd docvault
# Double-click index.html or:
start index.html      # Windows
open index.html       # Mac
xdg-open index.html   # Linux
```

---

## 📐 Device Support

| Device | Status |
|--------|--------|
| 📱 Mobile (≤640px) | ✅ Hamburger menu, bottom-sheet modals |
| 📱 Small phones (≤380px) | ✅ Optimized 2-col layout |
| 📲 Tablets (641–900px) | ✅ Sliding sidebar |
| 💻 Laptop (1024–1199px) | ✅ Full premium design |
| 🖥 Desktop (1200–1599px) | ✅ Original layout |
| 📺 4K / Ultra-wide (≥1600px) | ✅ Spacious version |
| 🖨 Print | ✅ Clean printout |

---

## 🔒 Privacy & Security

- Master password hashed with **SHA-256**
- Recovery key uses **`crypto.getRandomValues`** (cryptographically secure)
- All data stored in browser's `localStorage`
- **No server, no API calls, no tracking, no analytics**
- Files encoded as base64 and saved locally
- Works **completely offline** after first load

---

## 📞 Contact

- **Phone**: [+91 72070 68780](tel:+917207068780)
- **Email**: [charanzoe07@gmail.com](mailto:charanzoe07@gmail.com)
- **WhatsApp**: [Chat here](https://wa.me/917207068780)

---

Made with ❤ for your privacy.
