# Jairex 💰🐷

A Minecraft-themed savings app for couples. Save toward shared goals together, post milestones to your partner feed, chat in real time, and unlock achievements as you level up.

## Features

- 🔐 **Auth** — register / login with JWT, couple pairing via invite codes
- 🐷 **Piggy Bank** — shared savings goals with auto-calculated completion dates and transaction history
- 📱 **FYP Feed** — partner-only social feed with image/video uploads, reactions (❤️ 💎 🐷) and comments
- 💬 **Chat** — real-time partner chat (Socket.io) with persisted history, coin celebrations, AI savings coach, and savings challenges
- 🏆 **Gamification** — XP, levels, daily streaks, and 6 unlockable achievements (First Deposit, Goal Setter, 100 Club, Week Warrior, Piggy Master, Social Butterfly)
- 🔔 **Notifications** — in-app notification bell with realtime push
- 💱 **Currency** — USD, PHP (₱), EUR, GBP with formatting everywhere
- 🔊 **Sound effects** — Minecraft-style clicks, level-ups, and deposits (Web Audio)

## Tech Stack

- **Client:** React 19, Vite 8, React Router 7, Socket.io client
- **Server:** Node.js, Express 5, Mongoose 9, Socket.io, JWT, multer

## Local Development

Prerequisites: Node.js 20+, a running MongoDB instance (default `mongodb://localhost:27017/couplesave`).

```bash
# 1. Server (terminal 1)
cd server
npm install
copy .env.example .env   # or create from the values below
npm start                # runs on http://localhost:5000

# 2. Client (terminal 2)
cd client
npm install
npm run dev              # runs on http://localhost:5173
```

### Test on your phone / tablet (multiple devices)

The built app + API + chat all run on **one server**, so any device on your WiFi
can open it. Phone, tablet, second laptop — each logs into its own account and
pairs with an invite code.

```bash
# 1. Build the client once (after any code change)
cd client
npm run build

# 2. Start the production server (serves the app + API on port 5000)
cd ../server
npm run start:lan
```

Then find your computer's LAN IP and open it on every device:

```bash
ipconfig      # look for "IPv4 Address" under your active adapter, e.g. 192.168.1.20
```

Open `http://<YOUR-LAN-IP>:5000` on your phone/tablet/other computer.
(Devices must be on the same WiFi.)

Allow Windows Firewall so other devices can reach Node once (run PowerShell **as administrator**):

```powershell
netsh advfirewall firewall add rule name="Jairex LAN" dir=in action=allow protocol=TCP localport=5000
```

You can run two different accounts on two devices to test the couple flow
(invite → join → shared goals → chat → notifications) live.

### Server `.env`

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/couplesave
JWT_SECRET=change-me-to-a-long-random-string
CLIENT_URL=http://localhost:5173
PUBLIC_URL=
```

## Go live (public link — works even when your laptop is off)

The app + API + chat all run from a single server, so one free Render service
can host everything at a public URL like `https://jairex.onrender.com`.

**Step 1 — Push the code to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/jairex.git
git branch -M main
git push -u origin main
```

**Step 2 — MongoDB Atlas (cloud database, free)**

1. Go to https://www.mongodb.com/cloud/atlas → **Try Free** → sign up.
2. Create a free **M0** cluster (any cloud provider/region, e.g. AWS / us-east-1). Takes ~2 min.
3. **Database Access** → Add New Database User → create a username + password (use a strong one, not the same as your account).
4. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`) so Render can connect.
5. **Databases** → **Connect** → *Drivers* → copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Replace `<user>` and `<password>` with the database user you created.

**Step 3 — Deploy on Render**

1. Go to https://render.com → **Sign up** (GitHub login is easiest).
2. Dashboard → **New** → **Blueprint** → select your `jairex` repo.
3. It reads `render.yaml` automatically. Set the one required secret:
   - `MONGODB_URI` = your Atlas connection string from Step 2
4. **Apply**. Render builds and deploys (~3–5 min).
5. Open the URL it gives you (something like `https://jairex.onrender.com`) — that's your permanent link, online 24/7 even if your laptop is off.

> Free-tier notes: the service sleeps after ~15 min of no visits and wakes in
> ~30–60 s on the first request (a browser refresh fixes the blank moment).
> Upgrading to the $7/mo Hobby plan keeps it always-warm. Uploaded photos live
> in server memory/disk and reset on redeploy — for permanent uploads add a
> cloud storage bucket later.

### Scripts

- `cd client && npm run build` — production build to `client/dist`
- `cd client && npm run lint` — oxlint
- `cd server && npm start` — dev API on :5000
- `cd server && npm run start:lan` — production app + API on :5000 (for phone/tablet testing)
- `cd server && node test-e2e.js` — end-to-end API smoke test (starts a full user → couple → goal → deposit → post → chat flow)