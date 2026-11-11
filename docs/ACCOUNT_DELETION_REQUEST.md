# Account deletion: request to the backend owner and the client

Google Play requires every app that lets users create an account to let
them delete it, both **inside the app** and through a **public web page**,
and to delete the data linked to the account. The Scrap Trove app has no
way to do this today: the API has no endpoint for it (checked in
`src/services/api.js`; the only delete call removes a single saved
address). Without this, the app cannot be published.

Policy (checked 2026-11-11):
https://support.google.com/googleplay/android-developer/answer/13327111

What the policy asks, in short:

- An in-app path to delete the account and its data (a link from the app
  to the deletion web page is acceptable, a full in-app flow is
  recommended).
- A web link, entered in the Play Console Data safety form, that works
  without the app, names the app or developer as on the store listing,
  and lets users request deletion directly.
- Data linked to the account is deleted. Data kept for security, fraud
  prevention or legal reasons is allowed, but users must be told what is
  kept and why (privacy policy). Third parties holding the data must be
  asked to delete it too.
- Requests are completed "within a reasonably quick period of time"; no
  fixed number of days.

This document has two parts: **A** for the backend developer, **B** for
the client (business and legal decisions, and the web page).

---

## Part A: backend

### A1. Proposed endpoints (proposal; names and shapes are yours to decide)

The app is ready to adapt to whatever you choose; please send the final
contract back.

We propose confirming deletion with a fresh OTP. It stops someone with a
stolen or left-logged-in phone from deleting the account silently, and
reuses the SMS flow you already have.

**1. Send a deletion OTP to the logged-in user's own number**

```
POST /api/auth/me/delete-otp
Authorization: Bearer <session token>
(no body: the number is taken from the token, never from the client)

200 { "success": true }
401 token invalid/expired
429 { "error": "Too many requests. Try again in N minutes." }
```

**2. Delete the account**

```
DELETE /api/auth/me
Authorization: Bearer <session token>
Content-Type: application/json
{ "otp": "123456", "reason": "optional free text, max 500 chars" }

200 { "success": true }          account deleted (or deletion scheduled, see A3)
400 { "error": "Invalid or expired OTP" }
401 token invalid/expired
409 { "error": "<user-facing explanation>", "code": "ACTIVE_ORDER" }   see A4
429 too many wrong OTP attempts
```

If you prefer no OTP (confirmation only inside the app), `DELETE
/api/auth/me` without a body is acceptable to us; please say so.

Error texts in `error` are shown to the user as sent, so please keep
them short and user-friendly (English is fine; the app shows them as is).

### A2. What a successful deletion must do

Please confirm each line, or tell us what you do instead:

| Data (as the app sends it) | Action |
|---|---|
| User record: mobile number, role | Delete (or replace the number with an irreversible placeholder if the row must stay for references) |
| Seller profile: name, email, state/district/city, home address (door, street, landmark, pincode), seller type | Delete |
| Bulk seller company data: company name, designation, sector, PAN/GST, company address, company GPS | Delete, unless Part B says it must be kept |
| Dealer profile: owner and business name, address, GST, PAN, email, vehicles, scrap types | Delete, unless Part B says it must be kept |
| Saved addresses (address book), including GPS | Delete |
| Orders: pickup address, GPS, photos, notes, weights, amounts, ratings and reviews | Delete the personal parts; keep only what Part B lists as legally required, detached from the person |
| Support tickets and messages | Delete |
| Seller edit requests, custom products, Yard Finds enquiries, pincode waitlist entries for that number | Delete |
| Photos in Cloudinary (order, completion, shop, vehicle photos) | Delete from Cloudinary |
| Sessions and session tracking (device model, app opens) | Revoke all sessions immediately; delete tracking data |
| Push tokens | Unlink/delete, so no further notifications reach the phone |
| MSG91 (OTP SMS logs with the phone number) | Ask MSG91 to delete, or document their retention in the privacy policy |

Also:

- **All sessions are revoked immediately**, even if data removal runs
  later.
- **Idempotent**: calling it again for an already-deleted account returns
  401 (token revoked), not an error page.
- **The same phone number can register again** afterwards as a new
  account with no old data.
- Keep a minimal deletion record only if Part B requires it (for example
  date and a hashed number for fraud prevention), and tell us so it goes
  into the privacy policy.

### A3. Timing

- Sessions: revoked at once.
- Data: either at once, or within a fixed number of days set in Part B
  (for example a grace period). If deletion is scheduled, return
  `{ "success": true, "scheduled_for": "<ISO date>" }` so the app can tell
  the user.

### A4. Open orders

Deleting an account in the middle of a pickup leaves the other side
stranded. Proposal:

- Seller with orders not yet assigned: cancel them automatically.
- Seller with an order assigned to a dealer, or a dealer with an assigned
  order in progress: refuse with `409` and a message such as "You have a
  pickup in progress. Complete or cancel it before deleting your
  account."

Please confirm or tell us your rule.

### A5. Abuse limits

- Rate-limit `delete-otp` per account (SMS cost).
- Cap wrong OTP attempts on `DELETE /auth/me`, as for login.

### A6. Web deletion (needed for Part B)

The public web page cannot use the app's session token. If the page is to
work self-service (recommended), it needs a token-free variant, for
example:

```
POST /api/account-deletion/request   { "mobile": "9876543210" }   sends OTP
POST /api/account-deletion/confirm   { "mobile": "...", "otp": "..." }
```

with the same behaviour as A2 to A5, and responses that do not reveal
whether a number has an account (always "If this number has an account,
we sent a code").

If the web page is a manual request form instead, it needs an internal
process (Part B4).

---

## Part B: client decisions

### B1. Public deletion web page (required by Play)

Please provide the URL, for example `https://scraptrove.com/delete-account`.
The page must:

- name "Scrap Trove" as on the Play listing;
- explain how to request deletion without the app (self-service with
  phone + OTP per A6, or a request form);
- say what is deleted, what is kept and for how long (B2), and how long
  the request takes (B3).

The same URL goes into the Play Console Data safety form and will be
linked from inside the app.

### B2. What must be kept, and for how long

Only the client (with legal advice) can decide this; we will not write
it. Things to decide, for example:

- invoices or payment records (`amount_paid`) for tax/GST purposes;
- records needed for fraud prevention or disputes;
- dealer GST/PAN records;
- how long each is kept and whether it is detached from the person.

The answer goes into the privacy policy and the web page. Indian data
protection law (the Digital Personal Data Protection Act, 2023) may also
apply; please confirm obligations with a lawyer.

### B3. Timing promise to users

For example "Your account is closed immediately and your data is removed
within 30 days." This number must match what the backend does (A3).

### B4. If the web page is a manual form

Who receives the requests, how identity is checked (the phone number
should be verified, for example by OTP or a call from the registered
number), and how quickly they are processed.

---

## What the app will do (once A1 exists)

So both sides know what to expect; no app code exists for this yet.

- "Delete my account" in: seller Profile (Settings), dealer Profile, the
  suspended-seller screen and the dealer-pending screen (users on those
  screens have no access to Profile but must still be able to delete).
- Screen explaining what is deleted and what is kept (text from B2),
  with a link to the web page (B1).
- Confirmation by OTP (A1) or, if you choose no OTP, a typed confirmation.
- On success: the full logout cleanup the app already does (tokens,
  stored data, push token, notifications), then a confirmation message.
  On `409`: show the message and stay logged in.
- Until A1 exists: if the B1 page is ready first, the app can link to it
  from the same places, which Play accepts as the in-app path.
