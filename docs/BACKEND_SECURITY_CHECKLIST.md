# Backend security checklist (from the mobile app review)

For the developer who owns the Scrap Trove API (`api.scraptrove.com`,
staging `api.stage.scraptrove.com`).

We reviewed the Android app (Expo / React Native) for its Google Play
release. We did not have the backend code, so the points below are things
the app relies on but cannot enforce itself. The app hides screens by role,
but anyone with a valid session token can call any endpoint directly, so
**every check below has to happen on the server**.

For each item, please reply with: **OK** (already true, ideally with how
you tested it), **Fixed**, or **Not planned** (and why).

Endpoints are written as the app calls them, relative to `/api`.

---

## A. Access control (highest priority)

### A1. Ownership of every ID in a URL
A user must only reach their own records. Requests for another user's ID
should return 403 or 404, never the record.

| Endpoint | Who may access |
|---|---|
| `GET /orders/:id` | The seller who created it, the dealer assigned to it |
| `PATCH /orders/:id/status` | See A5 |
| `POST /orders/:id/decline` | A dealer the order was offered to |
| `POST /orders/:id/rate-dealer` | The seller of that order, once completed |
| `POST /orders/:id/rate-seller` | The assigned dealer, once completed |
| `GET /tickets/:id`, `POST /tickets/:id/message` | The user who raised the ticket |
| `POST /tickets` (`order_id` in body) | Only against the caller's own order (the app's comments say this is already enforced; please confirm) |
| `PATCH /addresses/:id/default`, `DELETE /addresses/:id` | The address owner |

Why it matters here: tapping a push notification opens the order ID that
the push carries, and the app then fetches it and offers to cancel it.

### A2. Role checks
- Dealer-only endpoints reject seller tokens: `GET /orders/dealer`,
  `GET /orders/broadcast`, `POST /dealer/status`, `PATCH /dealer/*`,
  `GET /stats/dealer`, and the dealer status changes in A5.
- Seller-only endpoints reject dealer tokens: `POST /orders`,
  `GET /orders/seller`, `POST /seller/*`, `PATCH /seller/*`,
  `GET /stats/seller`, `POST /products/custom`.

### A3. Dealer approval and suspension
Pending, rejected or suspended dealers must not receive, see or accept
orders. The app does not reliably enforce this (a returning dealer is shown
the full dealer screens whatever their approval status), so the server
must.

### A4. Suspended sellers
A suspended seller should only be able to use `GET /auth/me`,
`POST /seller/edit-request`, `GET /seller/edit-request/latest` and the
ticket endpoints. In particular they must not be able to create or cancel
orders.

### A5. Order status changes (`PATCH /orders/:id/status`)
- `assigned`: only an approved, online dealer the order was offered to;
  only once (no two dealers accepting the same order).
- `completed`: only the assigned dealer. `amount_paid` and
  `completion_photo` are validated (type, range, the URL is one of ours).
- `cancelled`: only the order's seller, and only while the order is in a
  cancellable state.
- Any other transition from a client is rejected.

### A6. Values the client chooses
- `role` in `POST /auth/send-otp` and `POST /auth/verify-otp` accepts only
  `seller` or `dealer`.
- `seller_type` in `POST /seller/setup` cannot change an existing seller's
  type.
- The server never trusts client-sent IDs for the acting user (always take
  the user from the token).

---

## B. Sessions and login

### B1. Expired or revoked tokens return HTTP 401
The app now logs the user out when a request made with their session token
gets **401**. Please confirm:
- an expired or revoked token gets 401 (not 403 or 200 with an error body);
- 401 is **not** used for anything else, in particular not for suspended
  accounts (the app keeps suspended sellers logged in so they can see the
  suspension screen and contact support).

### B2. Logout endpoint (new)
There is no way for the app to end a session on the server. Please add
`POST /auth/logout` that revokes the bearer token it is called with (and
unlinks the device's push token, see C1). The app will call it as the
first step of logout.

### B3. Token lifetime
- How long does a session token stay valid? (Our notes say 90 days;
  please confirm.)
- Does logging in on another phone revoke older tokens?
- How long does the token from `verify-otp` last for a new user who never
  completes sign-up (`/seller/setup`, `/dealer/register`)?

### B4. OTP abuse
- Rate limit `POST /auth/send-otp` per phone number and per IP (SMS cost
  and harassment). The app's 30-second resend timer is client-side only.
- Cap wrong attempts on `POST /auth/verify-otp` for a given number (a
  6-digit code can otherwise be brute-forced), then lock or require a new
  code.

---

## C. Push notifications

### C1. Push token ownership
The app registers its Expo push token with
`POST /notifications/register`. That token belongs to the **app
installation, not the user**, so the same token comes back when a
different person logs in on the same phone. When a token that is already
linked to another account is registered, please **move** it to the caller
instead of adding a second link. Otherwise the new user also receives the
previous user's order notifications.

### C2. Expo push security
Is Expo's push security setting (an access token is required to send
pushes) enabled for this project? Without it, anyone who learns a device's
Expo push token can send it notifications, and a notification can open an
order screen.

---

## D. Errors and exposure

### D1. Error responses
5xx responses should not contain internal details (stack traces, SQL,
upstream service errors). The app now hides 5xx text in release builds,
but other clients (the web dashboard) may not.

### D2. Direct `workers.dev` addresses
Earlier versions of the app used
`scraptrove-api-staging.workers.dev` and a personal `*.workers.dev`
address directly. If those routes still work, they bypass any protection
set up on the custom domains (WAF, rate limits). Please disable the
`workers.dev` routes if they are not needed.

### D3. Public endpoints
Please confirm rate limits on endpoints that need no login, especially the
ones that take a phone number:
`POST /service-pincodes/waitlist`, `POST /service-pincodes/check`,
`POST /yard/enquiries`, `GET /yard/products`, `GET /states`,
`GET /districts`, `GET /cities`, `GET /market-prices`.

---

## E. Behaviour questions

### E1. Ratings without an order
The rating screen currently calls `POST /ratings` with only
`{ stars, feedback }`: no order ID. What does the server do with that?
Can a seller rate any dealer, or rate the same dealer many times? (We plan
to switch the app to `POST /orders/:id/rate-dealer`; please confirm that
route is live.)

### E2. `is_suspended` format
The app treats a seller as suspended only when `is_suspended` is exactly
the number `1`. Please confirm `/auth/me` and `verify-otp` always return
the number `0` or `1` (not `true` or `"1"`).

---

## F. Photo uploads (`POST /upload`)

The app sends each photo as `{ data: <base64>, type: 'image/jpeg' }` and
gets back a Cloudinary URL that it later puts into orders, dealer
registration and order completion. The app does not shrink photos today,
so one request can carry a full-resolution camera image (several MB, about
a third more as base64).

### F1. Size and type
- Reject bodies over a fixed limit with **413** and a clear `error` text
  (please tell us the limit so the app can match it).
- Check the decoded bytes are really an image (JPEG/PNG/WebP magic bytes),
  not just the `type` field the client sends.

### F2. Who may upload
- Only logged-in users (session or sign-up token). Rate limit per user so
  the endpoint cannot be used as free image hosting.
- Upload into a fixed Cloudinary folder with a restricted upload preset;
  the client must not be able to choose the folder, public ID or
  transformations.

### F3. Photo metadata and visibility
- Strip EXIF metadata on upload (camera photos can carry the GPS position
  of the seller's home and the phone model).
- Cloudinary URLs are public to anyone who has them. Confirm that is
  acceptable for order and dealer-registration photos, or switch those to
  authenticated/private delivery.

### F4. URLs coming back from the client
`photo_urls` (orders), `shop_photo` / `vehicle_photos` (dealer
registration) and `completion_photo` (order completion) should only be
accepted if they point to our own Cloudinary account and folder.

---

## Coming next (not yet reviewed)

Google Play requires in-app account deletion. The app has no delete
endpoint today; a separate request for it will follow (for example
`DELETE /auth/me`), together with what data it must remove.
