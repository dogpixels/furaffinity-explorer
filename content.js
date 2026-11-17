/**
 * @fileoverview FurAffinity Ex Content Script
 * @version 0.1.0
 * @author Flam <flam@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # Why do lizards have two peeners?
 */

(() => {
    if (window.__faexContentLoaded) return;
    window.__faexContentLoaded = true;

    // select appropriate storage api
    const api = typeof browser !== "undefined" ? browser : chrome;
    console.info(`[faex][content] storage api selected: ${typeof browser !== "undefined" ? '"browser"' : '"chrome"'}`);
    const storageGet = (keys) => new Promise((resolve) => api.storage.local.get(keys, resolve));
    
    // /**
    //  * Extract currently logged in user on any page; null on failure
    //  * @returns {string|null} uri decoded username
    //  */
    // function getLoggedInUser() {
    //     const img = document.querySelector("nav img.loggedin_user_avatar");

    //     const a = img?.closest("a[href]");
    //     if (!a) {
    //         console.error("[faex][content] could not identify logged in user: 'nav img.loggedin_user_avatar' select miss");
    //         return null;
    //     }

    //     const m = a.getAttribute("href").match(/^\/user\/([^\/]+)\/?/);
    //     if (m)
    //         return decodeURIComponent(m[1]);

    //     console.error("[faex][content] could not identify logged in user: regex failed. href:", a.getAttribute("href"));
    //     return null;
    // }

    // /**
    //  * Extract FA username from current gallery url (/gallery/{username}/[n])
    //  * @returns {string|null} uri decoded username
    //  */
    // function getGalleryUser() {
    //     // m[1]: username; m[2]: gallery page (undefined at page 1)
    //     const m = location.pathname.match(/^\/gallery\/([^\/]+)\/?(?:(\d+)\/?)?$/);
    //     return m ? decodeURIComponent(m[1]) : null;
    // }

    /**
     * answer getSubmissionLinks requests from background.js, provide
     * all view links and next gallery page url
     * @returns {object} {links: [string], next: string}
     */
    function getSubmissionLinks() {
        const links = new Set();
        for (const a of document.querySelectorAll(".gallery a[href*='/view/']")) {
            const m = a.getAttribute("href").match(/^\/view\/(\d+)/);
            if (m) links.add(`https://www.furaffinity.net/view/${m[1]}/`);
        }
        // next gallery page, if present
        let next = null;
        for (const form of document.querySelectorAll("form[action^='/gallery/']")) {
            if (form.textContent.trim().toLowerCase() === "next") {
                next = new URL(form.getAttribute("action"), location.href).href;
                break;
            }
        }
        console.log("getsubmissionlinks returning", { links: [...links], next })
        return { links: [...links], next };
    }

    function scrapeImagePage() {
        const img = document.querySelector("img#submissionImg");
        if (!img) return null;

        const data = {};
        const src = img.getAttribute("src") || img.getAttribute("data-fullview-src");
        if (src) {
            data.imageUrl = /^\/\//.test(src) ? "https:" + src : new URL(src, location.href).href;
            data.filename = makeFilename(data.imageUrl);
        }
        const alt = img.getAttribute("alt");
        if (alt && alt !== "undefined") data.title = alt.trim();
        const tags = transformTags(img.getAttribute("data-tags"));
        if (tags.length) data.tags = tags;

        const ratingEl = [...document.querySelectorAll(".submission-page-stats .font-large")]
            .find((el) => el.nextElementSibling && el.nextElementSibling.textContent.trim() === "Rating");
        if (ratingEl) data.rating = ratingEl.textContent.trim().toUpperCase();

        const desc = document.querySelector(".submission-description-text");
        if (desc) data.description = transformDescription(desc.innerHTML.trim());

        const date = document.querySelector(".popup_date[data-time]");
        if (date && date.dataset.time) {
            data.postDate = new Date(parseInt(date.dataset.time, 10) * 1000).toISOString();
        }

        data.source = location.origin + location.pathname;
        return data;
    }

    /* message handling */

    api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (!msg) return;

        console.info(`[faex][content] '${msg.type}' message received:`, msg);

        switch (msg.type) {
            case "ping": sendResponse(true); break;
            case "scrape": sendResponse(scrapeImagePage()); break;
            case "collectGallery": sendResponse(getSubmissionLinks()); break;
            // case "progress": updateButton(msg.count); break;
            case "getSubmissionLinks": sendResponse(getSubmissionLinks()); break;
        }
    });
})();
