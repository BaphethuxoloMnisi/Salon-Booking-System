# Salon Booking System (Firebase Realtime Database)

## Setup
1. Firebase console: create a project, then **Build > Realtime Database > Create database**.
2. **Project settings > Your apps > Web app**: copy the config into `js/firebase-config.js`.
3. Realtime Database > **Rules**: paste `database.rules.json` and publish.
4. Deploy the folder to any static host (Firebase Hosting, Netlify, Vercel, GitHub Pages).

## Security setup (required)
1. Firebase console > **Authentication > Get started > Sign-in method**: enable **Email/Password**.
2. **Authentication > Users > Add user**: email `admin@salonbooking.local`, and a strong password. This is the admin login (username `admin`). It is not stored in the code.
3. **Realtime Database > Rules**: paste `database.rules.json` and **Publish**.
4. **Realtime Database > Data**: delete old test data (`users`, `bookings`, `slots`).

Customers register on `login.html`; passwords are handled by Firebase Authentication.

## Structure
index.html, login.html, account.html, admin.html
css/style.css
js/firebase-config.js, common.js (data layer, auth, nav), index.js, login.js, account.js, admin.js
