# NEXORA

A full-stack AI workspace starter built for GitHub + Render.

## Features
- Responsive React interface with animated visual elements
- Email/password registration and login
- Password hashing with bcrypt
- Signed JWT authentication
- Personal notes stored in PostgreSQL
- AI chat through OpenRouter (API key stays on the server)
- Admin overview with user, notes and AI conversation counts
- Render Blueprint provisions a Node web service and PostgreSQL database

## Deploy with GitHub and Render (iPad-friendly)

1. Create a new **public or private** GitHub repository named `nexora`.
2. Upload the contents of this project ZIP to the repository root. Upload the files and folders inside `nexora`, not the outer folder itself.
3. On Render, open **New + → Blueprint** and connect the `nexora` GitHub repository.
4. Render reads `render.yaml`. Review the web service and database, then choose **Apply**.
5. In the new `nexora` web service, open **Environment** and set:
   - `ADMIN_EMAIL` = the email address you will use for your administrator account.
   - `OPENROUTER_API_KEY` = your OpenRouter key (optional initially; required for AI chat).
6. Save changes. Render will redeploy. Open the service URL and register using the exact `ADMIN_EMAIL` address. That first matching account receives the admin role.
7. Test registration, login, notes and `/api/health`. AI chat works after the OpenRouter key is configured.

## Render settings
The included Blueprint uses:
- Build: `npm install && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- PostgreSQL in Singapore region
- Generated `JWT_SECRET`

If you change the database or service region, keep them in the same Render region for private database networking.

## Local development (optional)
Requires Node.js 20+ and PostgreSQL. Copy `.env.example` to `.env`, set values, then run `npm install` and `npm run dev`.

## Security notes
- Never commit `.env` or real API keys.
- Use a unique `ADMIN_EMAIL`.
- JWT_SECRET must remain private.
- Use HTTPS in production (Render provides it).
- This is a starter platform. Before a large public launch, add email verification, password reset, account deletion/export, audit logs, stricter content policies, and a privacy policy/terms page.
