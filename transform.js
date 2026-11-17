/**
 * @fileoverview FurAffinity Ex Transformation Functions
 * @version 0.1.0
 * @author Flam <flam@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # Women want me, men are jealous of me. What am I? -> A romantasy dragon.
 */

const FA_ORIGIN = "https://www.furaffinity.net";

/**
 * FurAffinity image tag prefixes:
 *   u_USERNAME        -> omitted
 *   c_MEDIUM          -> "medium"
 *   t_ARTTYPE         -> "arttype"
 *   s_dragon_other    -> "dragon"
 */
function transformTags(dataTags) {
    if (!dataTags) return [];
    const out = [];
    for (const raw of dataTags.split(/\s+/).filter(Boolean)) {
        if (raw.startsWith("u_")) continue;
        if (/^[cts]_/.test(raw)) {
            out.push(raw.slice(2).replace(/_other$/, ""));
        } else {
            out.push(raw);
        }
    }
    return out;
}

/**
 * Cleans an image page description (HTML fragment):
 *  - relative URLs become absolute
 *  - class / id / style attributes are dropped
 *  - @USERNAME / @@USERNAME become profile links
 *  - :userUSERNAME: / :iconUSERNAME: become profile links
 *  - <img> elements are removed entirely
 *  - FurAffinity externalurl links are rewritten to their original URLs
 * Returns an HTML string.
 */
function transformDescription(html) {
    const userLink = (name) => `<a href="${FA_ORIGIN}/user/${name}/">${name}</a>`;
    let text = html;

    text = text.replace(/:(?:user|icon)([a-z0-9_.-]+):/gi, (_m, name) => userLink(name));
    text = text.replace(/(^|[^a-z0-9_.-])@@?([a-z0-9_.-]+)/gi, (_m, pre, name) => `${pre}${userLink(name)}`);

    const doc = new DOMParser().parseFromString(`<div>${text}</div>`, "text/html");
    const root = doc.body.firstElementChild;

    // Remove images entirely.
    root.querySelectorAll("img").forEach(el => el.remove());

    for (const el of root.querySelectorAll("*")) {
        el.removeAttribute("class");
        el.removeAttribute("id");
        el.removeAttribute("style");
        el.removeAttribute("target");

        const href = el.getAttribute("href");

        if (href !== null) {
            const url = new URL(href, FA_ORIGIN + "/");

            // Rewrite FurAffinity external-link redirects.
            if (
                ["www.furaffinity.net", "furaffinity.net"].includes(url.hostname) &&
                url.pathname === "/externalurl/"
            ) {
                const originalUrl = url.searchParams.get("q");

                if (originalUrl) {
                    el.setAttribute("href", originalUrl);
                } else {
                    el.setAttribute("href", url.href);
                }
            } else {
                el.setAttribute("href", url.href);
            }
        }

        const src = el.getAttribute("src");

        if (src !== null)
            el.setAttribute("src", new URL(src, FA_ORIGIN + "/").href);
    }

    return root.innerHTML;
}

/**
 * `129492012.mario_this_is_my_car.jpg` -> `this is my car.jpg`
 * Strips leading IMAGEID and USERNAME segments, underscores become spaces.
 * When the expected prefix is not found the basename is returned as-is (spacing applied).
 */
function makeFilename(imageUrl) {
    let pathname = /^\/\//.test(imageUrl) ? "https:" + imageUrl : imageUrl;
    const base = decodeURIComponent(new URL(pathname).pathname.split("/").pop() || "");
    const dot = base.lastIndexOf(".");
    const name = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : "";
    const cleaned = name.replace(/^\d+\.[^_]*_/, "").replace(/_/g, " ").trim();
    return sanitizeFilename(cleaned || name.replace(/_/g, " ")) + ext;
}

function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, "_").replace(/^\.+/, "").trim();
}

/** Assembles the sidecar object; only keys with actual values are included. */
function buildSidecar(data) {
    const sidecar = {};
    if (data.rating) sidecar.rating = data.rating;
    if (data.title) sidecar.title = data.title;
    if (data.description) sidecar.description = data.description;
    if (data.tags && data.tags.length) sidecar.tags = data.tags;
    if (data.source) sidecar.source = data.source;
    if (data.postDate) sidecar.postDate = data.postDate;
    return sidecar;
}
