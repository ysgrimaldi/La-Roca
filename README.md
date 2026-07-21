# La Roca — Firebase + Admin

## Setup
1. Firebase Console > Project settings > Your apps > add a Web app. Paste the config into `js/config.js`.
2. Firebase Console > Firestore Database > Create database.
3. Firebase Console > Authentication > Sign-in method > enable Google.
4. Authentication > Settings > Authorized domains: add `YOUR-USERNAME.github.io`.
5. Replace `YOUR_ADMIN_EMAIL@example.com` in BOTH `js/config.js` and `firestore.rules`.
6. Firestore Database > Rules: paste the contents of `firestore.rules` and Publish.
7. Put your real WhatsApp and Google Maps URLs in `js/config.js`.
8. Push these files to GitHub. The admin page will be `/admin/`.

## How it works
- Open/Closed comes automatically from `js/schedule.js`.
- Cleaning overrides the schedule in real time through Firestore.
- Cleaning expires for visitors after `cleaningTimeoutMinutes` (default 120).
- Announcements are stored in Firestore and update live.
- Public visitors can read `/gym/status`; only the authorized Google account can write it.

## Initial Firestore document
You can let the admin page create it automatically. The path is `gym/status`.

## Test
Open the public site and `/admin/` on separate devices. Sign in, toggle cleaning, and verify the public status changes without refreshing.
