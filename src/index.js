// Pre-launch lockdown — HTTP Basic Auth gate for the Shield Font site.
//
// Cloudflare Worker that intercepts every request (run_worker_first =
// true in wrangler.toml) and challenges with Basic Auth before falling
// through to the static asset binding.
//
// Credentials come from secrets set in the Cloudflare dashboard:
//   Worker → Settings → Variables and Secrets → Add:
//     SITE_USER  (e.g. "preview")
//     SITE_PASS  (the shared preview password, e.g. "optik")
//
// Note: "Variables and Secrets" only becomes available once a Worker
// script is attached (this file). Before that, the dashboard shows
// "Variables cannot be added to a Worker that only has static assets."
//
// To remove the gate at launch, see LAUNCH-CHECKLIST.md in the source
// repo — quickest path is editing this file down to just
// `return env.ASSETS.fetch(request);` and redeploying.

export default {
  async fetch(request, env) {
    const user = env.SITE_USER ?? "";
    const pass = env.SITE_PASS ?? "";

    // Fail closed if credentials aren't configured — better to 503 than
    // to accidentally serve the site unprotected.
    if (!user || !pass) {
      return new Response("Preview gate misconfigured (missing SITE_USER / SITE_PASS).", {
        status: 503,
      });
    }

    const expected = "Basic " + btoa(`${user}:${pass}`);
    if (request.headers.get("Authorization") !== expected) {
      return new Response("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Shield Font (preview)"' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
