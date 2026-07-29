// Shield Font site Worker — static assets + HTTP Range support.
//
// WHY THIS EXISTS
// Cloudflare Workers Static Assets always answers 200 with the whole file
// and never advertises Accept-Ranges (env.ASSETS.fetch() does not even
// return a Content-Length). Chrome's media stack treats a media resource
// whose server does not support ranges as "streaming", and then reports
// video.seekable as [0, 0] — so clicking the seekbar does nothing at all.
// We therefore implement RFC 7233 byte ranges here, scoped to media files.
//
// Sizes come from ASSET_SIZES, generated fresh at deploy time by
// deploy-cf.sh (env.ASSETS.fetch() won't give us a real Content-Length,
// so the true on-disk size has to come from the build). The copy checked
// in here is a placeholder so `wrangler dev` works standalone; deploy-cf.sh
// overwrites it with real sizes on every deploy.
//
// Anything not in the map — every non-media asset on the site — takes the
// original `env.ASSETS.fetch(request)` path, untouched.

import { ASSET_SIZES } from "./asset-sizes.js";

const RANGE_RE = /^bytes=(\d*)-(\d*)$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const total = ASSET_SIZES[url.pathname];

    // Not a range-managed asset -> behave exactly as before.
    if (!total) return env.ASSETS.fetch(request);

    const rangeHeader = request.headers.get("Range");

    // Never forward Range to the asset server; it ignores it anyway.
    const headers = new Headers(request.headers);
    headers.delete("Range");
    headers.delete("If-Range");
    const res = await env.ASSETS.fetch(
      new Request(request.url, { method: "GET", headers })
    );

    if (res.status !== 200 || !res.body) return res;

    const out = new Headers(res.headers);
    out.set("Accept-Ranges", "bytes");
    out.set("Content-Length", String(total));

    if (!rangeHeader) {
      if (request.method === "HEAD") return new Response(null, { status: 200, headers: out });
      return new Response(res.body, { status: 200, headers: out });
    }

    const m = RANGE_RE.exec(rangeHeader.trim());
    if (!m || (m[1] === "" && m[2] === "")) return unsatisfiable(out, total);

    let start;
    let end;
    if (m[1] === "") {
      const n = Number(m[2]);
      if (!n) return unsatisfiable(out, total);
      start = Math.max(0, total - n);
      end = total - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1);
    }
    if (!(start >= 0) || start > end || start >= total) return unsatisfiable(out, total);

    const length = end - start + 1;
    out.set("Content-Range", `bytes ${start}-${end}/${total}`);
    out.set("Content-Length", String(length));

    if (request.method === "HEAD") return new Response(null, { status: 206, headers: out });

    // Stream-slice: drop the first `start` bytes, emit `length`, then stop.
    // Never buffers the whole asset, so a 22 MB video costs no extra memory.
    let skip = start;
    let remaining = length;
    const slicer = new TransformStream({
      transform(chunk, controller) {
        if (remaining <= 0) return;
        let view = chunk;
        if (skip > 0) {
          if (view.byteLength <= skip) {
            skip -= view.byteLength;
            return;
          }
          view = view.subarray(skip);
          skip = 0;
        }
        if (view.byteLength > remaining) view = view.subarray(0, remaining);
        remaining -= view.byteLength;
        controller.enqueue(view);
        if (remaining <= 0) controller.terminate();
      },
    });

    return new Response(res.body.pipeThrough(slicer), { status: 206, headers: out });
  },
};

function unsatisfiable(out, total) {
  out.set("Content-Range", `bytes */${total}`);
  out.delete("Content-Length");
  return new Response(null, { status: 416, headers: out });
}
