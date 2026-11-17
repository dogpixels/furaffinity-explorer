/**
 * @fileoverview FurAffinity Ex Popup Script
 * @version 0.1.0
 * @author Flam <flam@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # Cats have little pincushions.
 */

const api = typeof browser !== "undefined" ? browser : chrome;
const storageGet = (keys) => new Promise((resolve) => api.storage.local.get(keys, resolve));
const storageSet  = (obj) => new Promise((resolve) => api.storage.local.set(obj, resolve));
const sendMessage = (msg) =>
    new Promise((resolve) => api.runtime.sendMessage(msg, (resp) => resolve(resp)));

const pathInput = document.getElementById("downloadPath");
const countEl = document.getElementById("finishedCount");

storageGet(["downloadPath", "finished"]).then(({ downloadPath = "", finished = [] }) => {
    pathInput.value = downloadPath;
    countEl.textContent = finished.length;
});

document.getElementById("save").addEventListener("click", () => {
    const downloadPath = pathInput.value.trim().replace(/^[\\/]+|[\\/]+$/g, "");
    storageSet({ downloadPath });
});

document.getElementById("reset").addEventListener("click", () => {
    // todo: prevent this button from being clicked when a download is currently running, it fucks up the queue
    sendMessage({ type: "resetFinished" }).then(() => {
        countEl.textContent = "0";
    });
});

document.getElementById("start").addEventListener("click", () => {
    console.info("[faex][popup] user initiated download START");
    api.runtime.sendMessage({ type: "downloadStart"});
});

document.getElementById("stop").addEventListener("click", () => {
    console.info("[faex]][popup] user initiated download STOP");
    api.runtime.sendMessage({ type: "downloadStop"});
});

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (!msg) return;

        console.info(`[faex][popup] '${msg.type}' message received:`, msg);

        switch (msg.type) {
            case "faex.progress": countEl.textContent = msg.count; break;
        }
    });