/**
 * @fileoverview FurAffinity Ex Background Script
 * @version 0.1.0
 * @author Flam <flam@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # You underestimate a canine knot only once.
 */

if (typeof importScripts === "function") {
    importScripts("transform.js");
}

/**
 * storage api (browser/chrome)
 * @type {storage}
 */
const api = typeof browser !== "undefined" ? browser : chrome;

/**
 * sleep n ms
 * @param {integer} ms ms to sleep
 * @returns {Promise} promise resolved when timer is over
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * active gallery scraping state
 * @type {boolean}
 */
var downloadingState = false;

/**
 * prevent download start while another is already waiting
 */
var downloadLoopRunning = false;

/**
 * localStorage, exposes .get(key) and .set(object)
 * @type {object}
 */
const store = {
    get(key) {return new Promise((resolve) =>api.storage.local.get(key, result => resolve(result[key])));},
    set(obj) {return new Promise((resolve) =>api.storage.local.set(obj, resolve));}
};

/**
 * load download path from localStorage, or defaults to "faex", always with trailing slash
 * @returns {string} e.g. "faex/"
 */
async function getDownloadPath() {
    const downloadPath = await store.get("downloadPath") || "faex/";
    return downloadPath.replace(/[\\/]+$/, "") + "/";
}

/**
 * Sends a message to the provided tabId. If no tabId is provided,
 * the msg is sent to the last open FA gallery tab.
 * Response is being returned.
 * @param {object} msg the message to send, should include a `type` key
 * @param {integer} tabId [optinal] tabId; last FA gallery tab if not provided
 * @returns {object|null} response object, if there is a response
 */
async function sendTabMessage(msg, tabId = undefined) {
    if (!tabId) {
        const tabs = await api.tabs.query({
            url: "https://www.furaffinity.net/gallery/*"
        });

        if (tabs.length < 1) {
            console.warn("[faex][background] no gallery tabs found open, aborting operation");
            return;
        }
        else if (tabs.length > 1) {
            console.warn("[faex][background] multiple gallery tabs found open, make sure to have only one!");
        }

        return await sendTabMessage(msg, tabs[tabs.length - 1].id);
    }

    return await api.tabs.sendMessage(tabId, msg);
}

/**
 * update popup of progress
 */
async function notifyProgress() {
    const finished = await store.get("finished");

    api.runtime.sendMessage({type: "faex.progress", count: finished.length})
    .catch(() => {});
}

/**
 * create a tab
 * @param {api.tabs.createProperties} props api.tabs.createProperties object, see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/create#createproperties
 * @returns {integer} tabId of the created tab
 */
function createTab(props) {
    return new Promise((resolve) => api.tabs.create(props, (tab) => resolve(tab)));
}

/**
 * close a tab
 * @param {integer} tabId tabId of the tab to close
 */
function removeTab(tabId) {
    return new Promise((resolve) => api.tabs.remove(tabId, () => resolve()));
}

function download(props) {
    return new Promise((resolve, reject) =>
        api.downloads.download(props, (id) => {
            const err = api.runtime.lastError;
            if (err) reject(new Error(err.message));
            else resolve(id);
        })
    );
}

/**
 * mark the submissionID as successfully downloaded and notifies UI to update its display
 * @param {string} submissionId the submissionID to add to the list of finished downloads
 */
async function markFinished(submissionId) {
    const finished = await store.get("finished");
    if (!finished.includes(submissionId)) finished.push(submissionId);
    await store.set({ finished });
    notifyProgress();
}

/**
 * extract submissionID from a /view/{submissionID} url
 * @param {string} url the url (should be /view/{submissionnID})
 * @returns {string|null} submissionID or null on failure
 */
function submissionId(url) {
    const m = url.match(/\/view\/(\d+)/);
    if (m)
        return m[1];
    
    console.error("submissionId() failed to extract submissionID from the url:", url);
    return null;
}

/**
 * open url in a background tab, wait until its content script
 * answers a ping, then scrape it and close the tab
 * @param {string} url the url (should be /view/{submissionID})
 * @returns {object} faex-specific scraping result object
 */
async function scrapePage(url) {
    const tab = await createTab({ url, active: false });

    for (let i = 0; i < 30; i++) {
        await sleep(500);
        try {
            const alive = await sendTabMessage({ type: "ping" }, tab.id);
            if (alive) {
                const data = await sendTabMessage({ type: "scrape" }, tab.id);
                await removeTab(tab.id);
                return data || null;
            }
        } catch (e) {
            // tab not ready yet
        }
    }
    await removeTab(tab.id);
    throw new Error("scrape timeout: " + url);
}

/**
 * download image and sidecar files from view page data
 * @param {object} data faex-specific scraping result object for a single view page
 */
async function downloadSubmission(data) {
    const path = await getDownloadPath();
    const base = path + await getUniqueFilename(data.filename || submissionId(data.source) || "unnamed");
    const sidecar = buildSidecar(data);

    console.info(`downloading image '${base}'`)
    await download({
        url: data.imageUrl,
        filename: base,
        conflictAction: "overwrite",
    });

    const filename = base.replace(/\.[^.]*$/, "") + ".json";
    console.info(`downloading sidecar '${filename}`);
    await download({
        url: URL.createObjectURL(new Blob(
            [JSON.stringify(sidecar, null, 4)],
            { type: "application/json" }
        )),
        filename: filename,
        conflictAction: "overwrite",
    });
}

/** Collects submission links from one gallery page via a hidden tab. */
async function collectGalleryPage(url) {
    const tab = await createTab({ url, active: false });
    let result = null;
    for (let i = 0; i < 30; i++) {
        await sleep(500);
        try {
            const alive = await sendTabMessage({ type: "ping" }, tab.id);
            if (alive) {
                result = await sendTabMessage({ type: "collectGallery" }, tab.id);
                break;
            }
        } catch (e) {
            // not ready
        }
    }
    await removeTab(tab.id);
    return result || { links: [], next: null };
}

/**
 * message handling
 */
api.runtime.onMessage.addListener(async (msg) => {
    if (!msg || !msg.type)
        return;

    switch (msg.type) {
        case "downloadStart":
            downloadingState = true;
            startDownloadLoop();
            break;

        case "downloadStop":
            downloadingState = false;
            break;

        case "resetFinished":
            await store.set({ finished: [] });
            await notifyProgress();
            break;

        case "getfinished":
            return await store.get("finished") || [];
    }
});

/**
 * main downloading loop, controlled by downloadingState
 */
async function startDownloadLoop() {
    if (downloadLoopRunning)
        return;

    downloadLoopRunning = true;

    try {
        let { links, next } = await sendTabMessage({type: "getSubmissionLinks"});

        while (true) {
            if (!downloadingState) {
                await sleep(250);
                continue;
            }

            for (const link of links) {
                if (!downloadingState)
                    break;

                const id = submissionId(link);

                if (!id || ((await store.get("finished")) || []).includes(id)) {
                    console.info(`[faex][background] skipping already finished ${id}`);
                    continue;
                }

                try {
                    const data = await scrapePage(link);

                    if (data) {
                        await downloadSubmission(data);
                        await markFinished(id);
                    }
                } catch (e) {
                    console.error(`[faex][background] failed on '${link}'; error:`, e);
                }

                await sleep(1000);
            }

            if (!downloadingState)
                continue;

            if (!next) {
                console.info("[faex][background] reached the end of all gallery pages, halting.");
                downloadingState = false;
                break;
            }

            ({ links, next } = await collectGalleryPage(next));
            console.info("[faex][background] collected next gallery page:", next);
        }
    } catch (e) {
        console.error("[faex][background] downloading loop failed; error:", e);
    } finally {
        downloadLoopRunning = false;
    }
}

/**
 * find an available filename, add a date or number if necessary;
 * check both image and sidecar filenames to prevent collisions
 * 
 * TODO: this method is dumb, as it relies on the download history being empty before commencing
 * downloads. Rather rewrite the localStorage to keep track of the filename along with the submissionId
 * to detect collisions.
 * 
 * TODO: moreso, tests indicate this function works only... sometimes? Investigate.
 *
 * @param {string} base original filename with extension
 * @returns {Promise<string>} available filename
 */
async function getUniqueFilename(base) {
    const downloads = await api.downloads.search({
        filenameRegex: base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\..*)?$"
    });

    if (!downloads.length)
        return base;

    const dot = base.lastIndexOf(".");
    const name = dot > -1 ? base.substring(0, dot) : base;
    const ext = dot > -1 ? base.substring(dot) : "";

    const date = new Date().toISOString().slice(0, 10);
    let candidate = `${name}_${date}${ext}`;
    let counter = 2;

    while (true) {
        const existing = await api.downloads.search({
            filenameRegex: candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"
        });

        if (!existing.length) {
            console.warn(`[faex][background] encountered file name collision, renaming '${base}' to '${candidate}'`)
            return candidate;
        }

        candidate = `${name}_${counter++}${ext}`;
    }
}