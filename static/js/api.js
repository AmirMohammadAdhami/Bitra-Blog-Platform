/* ============================================================================
   Bitra API client
   - Talks to the Django REST Framework backend (JWT / SimpleJWT).
   - Stores access/refresh tokens + the current user in localStorage.
   - Transparently refreshes an expired access token once, then retries.
   - Uses `credentials: "omit"` so the browser never falls back to Django
     session auth (which would demand a CSRF token). Auth is Bearer-only.
   ========================================================================= */
(function (global) {
  "use strict";

  var BASE = "/api";
  var LS = {
    access: "bitra.access",
    refresh: "bitra.refresh",
    user: "bitra.user",
  };

  /* ------------------------------------------------------------ token store */
  var Tokens = {
    get access() { return localStorage.getItem(LS.access); },
    get refresh() { return localStorage.getItem(LS.refresh); },
    set: function (access, refresh) {
      if (access) localStorage.setItem(LS.access, access);
      if (refresh) localStorage.setItem(LS.refresh, refresh);
    },
    clear: function () {
      localStorage.removeItem(LS.access);
      localStorage.removeItem(LS.refresh);
      localStorage.removeItem(LS.user);
    },
  };

  var Session = {
    get user() {
      try { return JSON.parse(localStorage.getItem(LS.user) || "null"); }
      catch (e) { return null; }
    },
    set user(u) {
      if (u) localStorage.setItem(LS.user, JSON.stringify(u));
      else localStorage.removeItem(LS.user);
    },
    get isAuthed() { return !!Tokens.access && !!this.user; },
  };

  /* ---------------------------------------------------------------- errors */
  function ApiError(message, status, data) {
    this.name = "ApiError";
    this.message = message;
    this.status = status;
    this.data = data;
  }
  ApiError.prototype = Object.create(Error.prototype);

  // Pull the most human-readable message out of a DRF error payload.
  function extractMessage(data, fallback) {
    if (!data) return fallback;
    if (typeof data === "string") return data;
    if (data.detail) {
      if (typeof data.detail === "string") return data.detail;
      if (data.detail.detail) return data.detail.detail;
    }
    // field errors: {"email": ["already exists"]}
    var parts = [];
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      var label = k === "non_field_errors" ? "" : (k + ": ");
      if (Array.isArray(v)) parts.push(label + v.join(" "));
      else if (typeof v === "string") parts.push(label + v);
    });
    return parts.length ? parts.join("  ·  ") : fallback;
  }

  /* --------------------------------------------------------- core request */
  function raw(path, opts) {
    opts = opts || {};
    var headers = { Accept: "application/json" };
    if (opts.body !== undefined && !(opts.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    if (opts.auth !== false && Tokens.access) {
      headers["Authorization"] = "Bearer " + Tokens.access;
    }
    if (opts.headers) Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });

    return fetch(BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      credentials: "omit", // force Bearer-only auth path (no CSRF surprises)
      body: opts.body !== undefined
        ? (opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body))
        : undefined,
    });
  }

  // Parse a response into JSON (or null for 204) and throw ApiError on failure.
  function handle(res) {
    if (res.status === 204) return null;
    var ct = res.headers.get("content-type") || "";
    var parse = ct.indexOf("application/json") !== -1 ? res.json() : res.text();
    return parse.then(function (data) {
      if (res.ok) return data;
      throw new ApiError(extractMessage(data, res.status + " " + res.statusText), res.status, data);
    });
  }

  var refreshing = null; // shared promise so concurrent 401s refresh once

  function refreshAccess() {
    if (refreshing) return refreshing;
    var token = Tokens.refresh;
    if (!token) return Promise.reject(new ApiError("Not authenticated", 401));
    refreshing = raw("/accounts/token/refresh/", { method: "POST", auth: false, body: { refresh: token } })
      .then(handle)
      .then(function (data) {
        Tokens.set(data.access, data.refresh /* rotated when present */);
        return data.access;
      })
      .catch(function (err) {
        Tokens.clear();
        Session.user = null;
        throw err;
      })
      .finally(function () { refreshing = null; });
    return refreshing;
  }

  // Request with one automatic refresh-and-retry on 401.
  function request(path, opts) {
    opts = opts || {};
    return raw(path, opts).then(function (res) {
      if (res.status !== 401 || opts._retried || opts.auth === false || !Tokens.refresh) {
        return handle(res);
      }
      return refreshAccess().then(function () {
        var retry = Object.assign({}, opts, { _retried: true });
        return raw(path, retry).then(handle);
      });
    });
  }

  var get  = function (p, o) { return request(p, Object.assign({ method: "GET" }, o)); };
  var post = function (p, b, o) { return request(p, Object.assign({ method: "POST", body: b }, o)); };
  var patch = function (p, b, o) { return request(p, Object.assign({ method: "PATCH", body: b }, o)); };
  var del  = function (p, o) { return request(p, Object.assign({ method: "DELETE" }, o)); };

  // DRF list endpoints here are unpaginated (plain arrays) but stay defensive.
  function asList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  // Shape an article payload for the write endpoint. When a cover File is
  // present we must send multipart/form-data (raw() detects FormData and drops
  // the JSON Content-Type so the browser sets the boundary); otherwise the
  // clean JSON path is used. `tags` is a list of ids in both cases.
  function toArticleBody(fields) {
    fields = fields || {};
    var cover = fields.cover_image;
    var hasFile = typeof File !== "undefined" && cover instanceof File;

    if (!hasFile) {
      var json = {};
      ["title", "summary", "content", "category"].forEach(function (k) {
        if (fields[k] !== undefined) json[k] = fields[k];
      });
      if (Array.isArray(fields.tags)) json.tags = fields.tags;
      return json; // object → JSON.stringify in raw()
    }

    var fd = new FormData();
    ["title", "summary", "content", "category"].forEach(function (k) {
      if (fields[k] !== undefined && fields[k] !== null) fd.append(k, fields[k]);
    });
    (fields.tags || []).forEach(function (id) { fd.append("tags", id); });
    fd.append("cover_image", cover);
    return fd;
  }

  /* ------------------------------------------------------------------- API */
  var API = {
    Tokens: Tokens,
    Session: Session,
    ApiError: ApiError,
    asList: asList,

    /* ---- auth ---- */
    login: function (email, password) {
      return post("/accounts/login/", { email: email, password: password }, { auth: false })
        .then(function (data) {
          Tokens.set(data.access, data.refresh);
          Session.user = data.user;
          return data.user;
        });
    },
    /* ---- password reset (3-step, unauthenticated) ---- */
    requestPasswordReset: function (email) {
      return post("/accounts/password-reset/request/", { email: email }, { auth: false });
    },
    verifyPasswordReset: function (email, code) {
      return post("/accounts/password-reset/verify/", { email: email, code: code }, { auth: false });
    },
    confirmPasswordReset: function (email, code, newPassword) {
      return post("/accounts/password-reset/confirm/", {
        email: email, code: code, new_password: newPassword,
      }, { auth: false });
    },
    /* ---- password reset (3-step, unauthenticated) ---- */
    requestPasswordReset: function (email) {
      return post("/accounts/password-reset/request/", { email: email }, { auth: false });
    },
    verifyPasswordReset: function (email, code) {
      return post("/accounts/password-reset/verify/", { email: email, code: code }, { auth: false });
    },
    confirmPasswordReset: function (email, code, newPassword) {
      return post("/accounts/password-reset/confirm/", {
        email: email, code: code, new_password: newPassword,
      }, { auth: false });
    },
    register: function (payload) {
      // { username, email, full_name, password }
      return post("/accounts/register/", payload, { auth: false });
    },
    logout: function () {
      var token = Tokens.refresh;
      var done = function () { Tokens.clear(); Session.user = null; };
      if (!token) { done(); return Promise.resolve(); }
      return post("/accounts/logout/", { refresh: token })
        .catch(function () { /* token already dead — log out locally anyway */ })
        .then(done);
    },

    /* ---- articles ---- */
    articles: function () { return get("/blog/articles/").then(asList); },
    article: function (id) { return get("/blog/articles/" + id + "/"); },

    /* ---- taxonomy ---- */
    categories: function () { return get("/blog/categories/").then(asList); },
    tags: function () { return get("/blog/tags/").then(asList); },

    /* ---- comments ---- */
    // Article detail already embeds `approved_comments`; this is for posting.
    postComment: function (articleId, content, parentId) {
      var body = { article: articleId, content: content };
      var uid = Session.user && Session.user.id;
      if (uid) body.author = uid; // serializer requires author id
      if (parentId) body.parent = parentId;
      return post("/blog/comments/", body);
    },
    likeComment: function (commentId) { return post("/blog/comments/" + commentId + "/likes/", {}); },
    // The reader's own comments across every status (incl. pending).
    myComments: function () { return get("/blog/comments/mine/").then(asList); },

    /* ---- personal like / bookmark (per-user, toggling) ---- */
    toggleLike: function (articleId) { return post("/accounts/likes/toggle/", { article_id: articleId }); },
    toggleBookmark: function (articleId) { return post("/accounts/bookmarks/toggle/", { article_id: articleId }); },
    myLikes: function () { return get("/accounts/likes/").then(asList); },
    myBookmarks: function () { return get("/accounts/bookmarks/").then(asList); },

    /* ---- profile (dashboard) ---- */
    isAuthenticated: function () { return Session.isAuthed; },
    profileMe: function () { return get("/accounts/profiles/me/"); },
    updateProfile: function (payload) { return patch("/accounts/profiles/me/", payload); },

    /* ---- social links ---- */
    socialPlatforms: function () { return get("/accounts/social-platforms/").then(asList); },
    socialLinks: function () { return get("/accounts/social-links/").then(asList); },
    addSocialLink: function (platformId, username) {
      return post("/accounts/social-links/", { platform: platformId, username: username });
    },
    removeSocialLink: function (id) { return del("/accounts/social-links/" + id + "/"); },

    /* ---- contributor (author) request ---- */
    authorRequests: function () { return get("/accounts/author-requests/").then(asList); },
    requestAuthor: function () { return post("/accounts/author-requests/", {}); },

    /* ---- writers' desk (author-owned articles) ---- */
    authorStats: function () { return get("/blog/articles/author_stats/"); },
    myArticles: function () { return get("/blog/articles/mine/").then(asList); },
    // Author's own draft/submitted piece by id — the write serializer round-trips.
    getArticle: function (id) { return get("/blog/articles/" + id + "/"); },
    createArticle: function (fields) { return post("/blog/articles/", toArticleBody(fields)); },
    updateArticle: function (id, fields) { return patch("/blog/articles/" + id + "/", toArticleBody(fields)); },
    submitArticle: function (id) { return post("/blog/articles/" + id + "/submit/", {}); },
    withdrawArticle: function (id) { return post("/blog/articles/" + id + "/withdraw/", {}); },
    deleteArticle: function (id) { return del("/blog/articles/" + id + "/"); },
  };

  global.BitraAPI = API;
})(window);
