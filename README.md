# Bitra

A newspaper-styled technology blog platform. Readers can browse and search published stories, engage with likes, bookmarks and threaded comments, and follow their favorite authors — while a separate contributor workflow lets authors draft, submit and publish articles through editorial review.

## Overview

Bitra is a Django application that combines a server-rendered, SEO-friendly front end with a JSON API for interactivity. It solves two problems at once:

- **Publishing with editorial control** — articles move through a defined lifecycle (draft → submitted → reviewed/rejected) so nothing goes live without moderation.
- **Engagement without spam** — interactions (likes, bookmarks, comments) require authentication, comments are moderated before appearing, and auth endpoints are protected by a custom slider CAPTCHA, rate limiting, and JWT-based sessions.

The public pages are rendered server-side (visible without JavaScript) and progressively enhanced by a vanilla-JS front end that talks to the Django REST Framework API.

## Features

### Reading & discovery
- Home page with a lead story, latest articles, most-read rail, and category groupings
- Article index with client-side search, category filtering, and sorting (by date, views, likes)
- Public author profiles with bio, location, social links, and aggregated author stats
- SEO: meta descriptions, Open Graph / Twitter cards, JSON-LD structured data, `sitemap.xml`, `robots.txt`, custom 404 page

### Engagement
- Article likes and bookmarks (authenticated users, per-user toggles)
- Threaded comments with replies, moderation workflow, and comment likes
- View counting that is unique per user or per IP address to prevent inflation

### Accounts & authentication
- Custom user model with email-based login (username + email are unique)
- Session-based login/register pages and JWT-based API authentication (SimpleJWT)
- Access-token refresh with rotation and blacklisting on logout
- Slider CAPTCHA required for login, registration, and password reset
- Password reset via 6-digit email OTP (hashed, expiring, attempt-limited)

### Author workflow & dashboard
- Readers can request contributor (author) status; admins approve or decline
- Authors create drafts, edit only draft/rejected stories, and submit them for review
- Editors publish (`REVIEWED`) or reject stories from the admin
- Dashboard: profile editing, avatar upload, social links, likes, bookmarks, comments, author stats, and a writer's desk with a rich-text (CKEditor) article editor
- Admin interface enhanced with Jet (custom admin UI), including one-click approve/reject for articles and comments

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | Python 3.12+ (Python 3.13 in the Docker image) |
| Web framework | Django 6.0 |
| API framework | Django REST Framework 3.17 |
| Auth | `djangorestframework-simplejwt` (JWT, token rotation + blacklist) |
| API docs | `drf-spectacular` (OpenAPI schema, Swagger UI, ReDoc) |
| Rich text | `django-ckeditor` / `ckeditor_uploader` (CKEditor 4) |
| Admin UI | `django-jet-reboot` (Jet) |
| Database | SQLite (default) |
| Image processing | Pillow + `python-magic` (MIME sniffing, resizing, WebP compression) |
| HTML sanitization | `bleach` |
| Client IP detection | `django-ipware` |
| Countries | `django-countries` |
| Front end | Server-rendered Django templates + vanilla JavaScript (no framework) |
| Environment | `python-dotenv`, Docker / Docker Compose |

## Project Structure

```
Best_Project/          # Django project package (settings, root URLconf, WSGI/ASGI)
accounts/              # Custom User, Profile, SocialPlatform, AuthorRequest, Like,
                       # Bookmark, PasswordResetCode models + signals, forms,
                       # session-based auth views, OTP/email services
blog/                  # Article, Category, Tag, ArticleView, Comment, CommentLike
                       # models; server-rendered views (home, list, detail,
                       # public profile); sitemap; template tags
api/                   # DRF API
  accounts/            #   auth, CAPTCHA, profiles, social links, likes/bookmarks,
                       #   author requests, password reset, profile image
  blog/                #   articles, categories, tags, comments
Security/              # Reusable security helpers: HTML sanitizer, image
                       # validation/compression, throttles, CKEditor upload guard,
                       # safe JSON-LD serialization
templates/             # Server-rendered templates (home, blog, accounts, dashboard)
static/js/             # Vanilla-JS front end (API client, auth, CAPTCHA, dashboard)
media/                 # User-uploaded media (avatars, article covers) — dev only
manage.py
requirements.txt       # Python dependencies
Dockerfile             # Python 3.13 image; runs `runserver 0.0.0.0:8000`
docker-compose.yml     # Web service with .env file and :8000 port mapping
```

## Installation & Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Create and activate a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root (the project loads it via `python-dotenv`):

```bash
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
```

> The project reads `SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS` directly from `.env`. `ALLOWED_HOSTS` is comma-separated. Never commit real secrets.

### 5. Run migrations

```bash
python manage.py migrate
```

### 6. Create a superuser (optional, for the admin)

```bash
python manage.py createsuperuser
```

### 7. Start the development server

```bash
python manage.py runserver
```

The site is then available at `http://127.0.0.1:8000/`. Log in with a staff account at `/admin/` (Jet-enhanced admin at `/jet/`).

### Docker (alternative)

```bash
# create .env as shown above, then:
docker compose up --build
docker compose exec web python manage.py migrate
```

The app runs at `http://localhost:8000/` inside the container (port `8000` mapped, project mounted as a volume).

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | Yes | Django secret key; also seeds the CAPTCHA signing key |
| `DEBUG` | Yes | `"True"` enables debug mode and serves media files; anything else disables it |
| `ALLOWED_HOSTS` | Yes | Comma-separated list of allowed hostnames |

**Email note:** `EMAIL_BACKEND` is set to the console backend, so password-reset OTPs are printed to the terminal in development. `DEFAULT_FROM_EMAIL` is referenced by the reset email service but is not defined in `settings.py`, so Django's default sender is used. For real email delivery, these settings would need to be configured — they are not currently.

## API Documentation

The API lives under `/api/`. An OpenAPI schema and interactive docs are available to staff users at:

- `/api/schema/` — OpenAPI JSON schema (admin only)
- `/api/schema/swagger-ui/` — Swagger UI (admin only)
- `/api/schema/redoc/` — ReDoc (admin only)

### Authentication & CAPTCHA (`/api/accounts/`)

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/accounts/captcha/challenge/` | Public | Create a slider-CAPTCHA challenge (rate-limited) |
| POST | `/api/accounts/captcha/verify/` | Public | Verify the slider; returns a signed, single-use `captcha_token` |
| POST | `/api/accounts/login/` | Public + CAPTCHA | Login with `email`, `password`; returns `access`, `refresh`, `user` |
| POST | `/api/accounts/register/` | Public + CAPTCHA | Register (`username`, `email`, `full_name`, `password`); returns tokens directly |
| POST | `/api/accounts/token/` | Public + CAPTCHA | SimpleJWT token-pair endpoint (rate-limited) |
| POST | `/api/accounts/token/refresh/` | Public | Refresh an access token (rotates the refresh token) |
| POST | `/api/accounts/logout/` | Authenticated | Blacklist the provided `refresh` token |
| POST | `/api/accounts/password-reset/request/` | Public + CAPTCHA | Request a reset code for `email` (rate-limited) |
| POST | `/api/accounts/password-reset/verify/` | Public | Verify `email` + 6-digit `code` |
| POST | `/api/accounts/password-reset/confirm/` | Public | Reset password with `email`, `code`, `new_password` |

### Profiles & social links (`/api/accounts/`)

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET/PATCH | `/api/accounts/profiles/me/` | Authenticated | Read/update the caller's own profile |
| GET | `/api/accounts/profiles/public/?slug=…` or `?username=…` | Public | Public profile lookup (email stripped, author stats attached) |
| GET | `/api/accounts/profiles/popular_authors/?limit=…` | Public | Top authors ranked by total article likes (max 20) |
| POST/GET | `/api/accounts/profile-image/` | Authenticated | Upload or list profile images (owner-only writes) |
| GET | `/api/accounts/social-platforms/` | Authenticated | List available social platforms (read-only) |
| CRUD | `/api/accounts/social-links/` | Authenticated | Manage the caller's social links (one link per platform) |

### Interactions & author requests (`/api/accounts/`)

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/accounts/likes/toggle/` | Authenticated | Like/unlike an article by `article_id` |
| GET | `/api/accounts/likes/` | Authenticated | List the caller's likes |
| POST | `/api/accounts/bookmarks/toggle/` | Authenticated | Bookmark/unbookmark an article by `article_id` |
| GET | `/api/accounts/bookmarks/` | Authenticated | List the caller's bookmarks |
| POST/GET | `/api/accounts/author-requests/` | Authenticated | Request contributor status / list requests |
| POST | `/api/accounts/author-requests/{id}/approve/` | Admin | Approve a contributor request |
| POST | `/api/accounts/author-requests/{id}/decline/` | Admin | Decline a contributor request |

### Blog (`/api/blog/`)

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/blog/articles/` | Public | Paginated list of published articles (10/page, `page_size` up to 50); filter by `author_name` |
| GET | `/api/blog/articles/{id}/` | Public/owner | Article detail; increments view count on published articles (unique per user/IP) |
| POST | `/api/blog/articles/` | Author | Create a draft |
| PATCH/DELETE | `/api/blog/articles/{id}/` | Author-owner | Edit/delete own draft or rejected story only |
| POST | `/api/blog/articles/{id}/submit/` | Author-owner | Submit a story for review (DRAFT/REJECTED → SUBMITTED) |
| POST | `/api/blog/articles/{id}/withdraw/` | Author-owner | Withdraw a submitted story back to draft |
| POST | `/api/blog/articles/{id}/like/` | Authenticated | Like/unlike a published story |
| GET | `/api/blog/articles/mine/` | Authenticated | The caller's own articles across all statuses (writers' desk) |
| GET | `/api/blog/articles/author_stats/` | Authenticated | Aggregated stats for the caller's articles |
| GET | `/api/blog/categories/` | Admin | List/create categories (lookup by `slug`) |
| GET | `/api/blog/tags/` | Public | List tags (lookup by `slug`) |
| POST/PATCH/DELETE | `/api/blog/tags/` | Author/owner | Create/edit/delete tags |
| GET/POST | `/api/blog/comments/` | Authenticated | List approved comments / post a comment |
| GET | `/api/blog/comments/mine/` | Authenticated | The caller's own comments across all statuses |
| POST | `/api/blog/comments/{id}/likes/` | Authenticated | Like/unlike a comment |

## Authentication & Permissions

Authentication uses **JWT bearer tokens** (SimpleJWT) for the API and standard Django **sessions** for the server-rendered auth pages. The JS API client stores tokens in `localStorage`, transparently refreshes an expired access token once, and sends requests with `credentials: "omit"` so the browser never falls back to session auth.

Permission rules enforced by the API:

- **Anonymous** — may read published articles, tags, and public profiles only. Everything interactive requires authentication.
- **Authenticated readers** — may like, bookmark, and comment; manage their own profile, avatar, social links, and author requests; comments are created as `PENDING` and only visible publicly after admin approval.
- **Authors** (`is_author`) — may create articles and tags, edit only their own `DRAFT`/`REJECTED` stories, and submit/withdraw them. CKEditor image uploads are restricted to authors.
- **Staff/Admin** — approve or decline author requests, review submitted articles (`SUBMITTED` → `REVIEWED`/`REJECTED`), moderate comments, and manage categories. The API schema docs are admin-only.
- **Visibility** — the article API queryset only ever exposes `REVIEWED` (published) stories to the public; drafts and submissions are never leaked.

## Database

The default database is **SQLite** (`db.sqlite3`). Key models and relationships:

- `User` (custom, email is the username field) — one-to-one with `Profile`
- `Profile` — avatar, city, country, bio, slug; social links via `ProfileSocialLink` → `SocialPlatform`
- `Article` — author (`User`), category (`PROTECT`), tags (many-to-many), status lifecycle (`DRAFT`/`SUBMITTED`/`REVIEWED`/`REJECTED`), denormalized `likes`/`views` counters
- `ArticleView` — deduplicated views, unique per user or per IP for anonymous visitors
- `Comment` — threaded via self-referential `parent`, moderation status (`PENDING`/`APPROVED`/`REJECTED`), `CommentLike`
- `Like` / `Bookmark` — per-user unique constraints on articles
- `AuthorRequest` — one-to-one with user; `PENDING`/`APPROVED`/`REJECTED`, reviewed by staff
- `PasswordResetCode` — hashed 6-digit OTP, expiry, attempt counter, one-time use

`User` and `Profile` are created together via signals; profile slugs are auto-generated from the username with a random suffix on collision.

## Security

Mechanisms actually implemented in the codebase:

- **JWT authentication** with refresh-token rotation and blacklisting on logout
- **Slider CAPTCHA** on login, registration, password reset, and the raw token endpoint — server-measured drag time, HMAC-SHA256 signed tokens, single-use nonces in the Django cache, per-IP rate limiting
- **Rate limiting** (DRF throttles): anonymous 100/hour, users 1000/hour, login 5/minute, password reset 3/hour, CAPTCHA 10/minute
- **HTML sanitization** — article content is cleaned with `bleach` against an explicit allow-list of tags, attributes, and protocols
- **Upload validation** — images are MIME-sniffed with `python-magic` (JPEG/PNG/WebP only), size-limited to 3 MB, and recompressed to WebP; CKEditor uploads additionally require author status
- **Password reset hardening** — OTPs are stored hashed with Django's password hashers, expire after 10 minutes, lock after 5 failed attempts, and are single-use; endpoints respond identically whether or not an account exists (no user enumeration)
- **Django security defaults** — password validators, CSRF middleware, clickjacking protection (`X-Frame-Options`), secure session/CSRF cookies, `SecurityMiddleware`, and `DEBUG` controlled by the environment
- **Data hygiene** — view counters are deduplicated per user/IP; only published articles are exposed by queries and the sitemap; public profile responses strip email addresses; JSON-LD output is HTML-escaped before embedding

## Development Notes

- **Front end is vanilla JS.** There is no front-end framework or build step. `static/js/api.js` is the single API client; page-specific scripts (`front.js`, `index.js`, `search.js`, `article.js`, `dashboard.js`, etc.) progressively enhance server-rendered pages.
- **Dashboard pages are JWT-gated client-side.** The template views render a shell; `dashboard.js` redirects to login if no valid access token exists and populates content via the API.
- **Article status workflow is authoritative.** Status transitions happen only via `submit`/`withdraw` actions (author) and the admin (editor). Authors cannot publish directly; the write serializer treats `status` as read-only.
- **CKEditor 4 is end-of-life.** Django emits a `ckeditor.W001` warning that the bundled CKEditor 4.22.1 has unfixed security issues; migrating to a maintained editor (e.g., CKEditor 5) is recommended before production use.
- **Email is development-only.** The console email backend prints reset codes to the terminal; production needs a real email backend configuration (and a defined `DEFAULT_FROM_EMAIL`).
- **Media is served by Django only in debug mode.** In production, `MEDIA_ROOT` (`media/`) and `STATIC_ROOT` (`staticfiles/`) need to be served by the web server, and `manage.py runserver` should be replaced with a WSGI/ASGI deployment.


## License

[MIT](LICENSE) — Copyright (c) 2026 Amir Mohammad Adhami.
