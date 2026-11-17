# FurAffinity Exporter

A Firefox / Chrome extension that downloads the logged in user's complete gallery along with sidecar json files of the following schema:
```
{
    "rating": "GENERAL",
    "title": "My Image",
    "description": "This is my image.",
    "tags": ["image", "test", "mine"],
    "source": "https://www.furaffinity.net/view/SUBMISSIONID",
    "postDate": "2026-11-06T16:25:12"
}
```
Each key in this json is optional. The name of the file corresponds to the image file it accompanies, e.g. "my-image.png" and "my-image.json".

## Credits

Icon image cropped from a larger work by Nimrais.


## FurAffinity Specifications

Generally, the extension requires access to 
* https://www.furaffinity.net/gallery/*
* https://www.furaffinity.net/view/*

From which it can extract relevant information out of the page HTML source.


### Logged in User

The logged in user is identified via the following snippet in the html source of e.g. the *Gallery Page*:
```
<li class="">
    <div class="floatleft hideonmobile">
        <a href="/user/USERNAME"> <!-- note this particular part contains the username -->
            <img class="loggedin_user_avatar menubar-icon-resize avatar" style="cursor:pointer" alt="DisplayName" src="//a.furaffinity.net/1234567890/USERNAME.gif">
        </a>
    </div>
</li>
```
> The <li> item above resides inside CSS path `body#pageid-gallery.c-bodyColor nav#ddmenu ul.navhideonmobile`.

Recommendation: identify the logged in user by the <a> element that has a img.loggedin_user_avatar inside's href property.


### Gallery Page

This is a paginated overview of images from any user and always resides under `https://www.furaffinity.net/gallery/USERNAME`. A trailing slash can occur.
Subsequent pages are identifed by the URL above being suffixed with more sections, e.g. `https://www.furaffinity.net/gallery/USERNAME/2/?`.

Browsing to the next page is achieved by clicking on the button labeled "Next" within the following snippet:
```
<div class="gallery-navigation aligncenter">
    <div class="inline" style="width:32%">&nbsp;</div>
    <div class="navigation-page-name inline" style="width:32%;">Page #1</div>
    <div class="inline" style="width:32%">
        <form action="/gallery/USERNAME/2/" method="get">
            <button class="button standard" type="submit">Next</button>
        </form>
    </div>
</div>
```
> The <div> element above resides inside CSS path `html body#pageid-gallery.c-bodyColor div#main-window.footer-mobile-tweak.g-wrapper div#site-content div#page-galleryscraps div#columnpage div.content section.gallery-section div.section-body div.submission-list`.

Recommendation: identify the button by its form action `<form action="/gallery/USERNAME/x/" method="GET">`.

within the *Gallery Page*, individual *Image Pages* are linked with the following snippet:
```
<figure id="sid-SUBMISSIONID" class="r-general t-image" style="height: 188px;">
    <b>
        <u>
            <a href="/view/SUBMISSIONID/">
                <noscript><span class="is-noScriptEnabled"></span></noscript>

                <img class="" data-tags="u_USERNAME c_artwork_traditional t_portraits s_dragon_other tag1 tag2 tag3 tag4 tag5" alt="" src="//t.furaffinity.net/SUBMISSIONID@400-IMAGEID.jpg" data-width="366.782" data-height="250" style="width: 255px; height: 182px;" loading="lazy" decoding="async">
                <i title="Click for description"></i>
            </a>
        </u>
    </b>
    <figcaption>
        <p>
            <a href="/view/SUBMISSIONID/" title="IMAGETITLE">IMAGETITLE</a>
        </p>
        <p>
            <i>by</i> <a href="/user/USERNAME/" title="DisplayName">DisplayName</a>
        </p>
    </figcaption>
</figure>
```
> The <figure> element above resides inside CSS path `html body#pageid-gallery.c-bodyColor div#main-window.footer-mobile-tweak.g-wrapper div#site-content div#page-galleryscraps div#columnpage div.content section.gallery-section div.section-body div.submission-list section#gallery-gallery.gallery.no-padding.aligncenter.no-artistname.s-250`.

Recommendation: identify *Image Page* links by their link `<a href="/view/SUBMISSIONID">` within `.gallery`.

### Image Page

This page contains the desired full-res image and all desired meta data. The URL adheres to the pattern `https://www.furaffinity.net/view/SUBMISSIONID/`, where SUBMISSIONID is a [0-9]+ string of numbers.

#### The Image
The desired full-res image is placed in the following snippet:
```
<div class="submission-content">
    <div class="submission-content-inner">
        <div class="aligncenter submission-area submission-image">
            <noscript><span class="is-noScriptEnabled"></span></noscript>

            <img
                class=""
                data-tags="u_USERNAME c_artwork_traditional t_portraits s_dragon_other tag1 tag2 tag3 tag4 tag5"
                id="submissionImg"
                title="Click to change the View"
                alt="IMAGETITLE"
                data-fullview-src="//d.furaffinity.net/art/USERNAME/IMAGEID/IMAGEID.USERNAME_IMAGETITLESLUG.png"
                data-preview-src="//t.furaffinity.net/SUBMISSIONID@600-IMAGEID.jpg"
                src="//d.furaffinity.net/art/USERNAME/IMAGEID/IMAGEID.USERNAME_IMAGETITLESLUG.png"
                style="cursor: pointer"
            />

            <div id="c-imgControls">
                <div id="c-imgControls--inner" style="display: none">
                    <span id="c-imgControls--close" title="Close Image Viewer">❌</span>
                </div>
            </div>
        </div>

        <div id="submission-options">
            <a
                class="button standard mobile-fix"
                href="/fav/SUBMISSIONID/?key=abcdef123456780edc"
                >+Fav</a
            >
            <a class="button standard mobile-fix" href="/newpm/USERNAME/">Note</a>
            <a
                class="button standard mobile-fix"
                href="//d.furaffinity.net/art/USERNAME/IMAGEID/IMAGEID.USERNAME_IMAGETITLESLUG.png"
                >Download</a
            >
        </div>

        <!-- some other nonsense -->
    </div>
</div>
```
> The <div> element above resides within CSS path `html body#pageid-submission.c-bodyColor div#main-window.footer-mobile-tweak.g-wrapper div#site-content div#submission_page.page-content-type-image div div.submission-page-content div#submission-main-content.content-with-sidebar div`.

Recommendation: identify the image URL via `img#submissionImg`'s src property.

#### Meta Data

The *Image Page* also contains all desired meta data, such as Rating, Tags, Description.

##### Rating
Resides in the snippet
```
<div>
    <div class="font-large inline c-contentRating--general">General</div>
    <div class="highlight">Rating</div>
</div>
```
> The <div> element above resides in CSS path `html body#pageid-submission.c-bodyColor div#main-window.footer-mobile-tweak.g-wrapper div#site-content div#submission_page.page-content-type-image div div.submission-page-content div#submission-main-content.content-with-sidebar div div div.submission-page-stats`.

Values may be "General", "Mature" or "Adult".

##### Title
Resides the <img> alt property but also in the snippet
```
<div class="submission-title">
    <h2>IMAGETITLE</h2>
</div>
```
> The <div> element above resides in CSS path `html body#pageid-submission.c-bodyColor div#main-window.footer-mobile-tweak.g-wrapper div#site-content div#submission_page.page-content-type-image div div.submission-page-content div#submission-main-content.content-with-sidebar div div.submission-details div section.submission-description div.section-header.submission-description-header div.submission-description-artist div`.

Recommendation: extract the title from the <img> alt property or from the string value of <h2> within <div class="submission-title">.

##### Tags
The tags are already attached to the image itself, see *The Image*.

**Conversion**
The tags include FurAffinity-specific tags that are to be converted in the following manner:
* u_USERNAME -> can be omitted
* c_MEDIUM -> omit the prefixed c_
* t_ARTTYPE -> omit the prefixed t_
* s_dragon_other -> omit the prexided s_ and _other, if it occurs

All conversions are sourced in transform.js.

##### Description
Resides <img> data-tags property and in this snippet:
```
<div class="submission-description-text user-submitted-links">
    What a lovely image!<br>
    <br>
    art by <a href="/user/SOMEOTHERUSER" class="iconusername"><img src="//a.furaffinity.net/17174310667/something.gif" title="SOMEOTHERUSER" alt="SOMEOTHERDISPLAYNAME">&nbsp;<span class="c-usernameBlockSimple username-underlined"><span class="c-usernameBlockSimple__displayName" title="SOMEOTHERDISPLAYNAME">SOMEOTHERDISPLAYNAME</span></span></a> <a class="auto_link" href="https://www.furaffinity.net/view/61840189/">(some link)</a>
</div>
```
> The <div> element above resides in CSS path `html body#pageid-submission.c-bodyColor div#main-window.footer-mobile-tweak.g-wrapper div#site-content div#submission_page.page-content-type-image div div.submission-page-content div#submission-main-content.content-with-sidebar div div.submission-details div section.submission-description div.section-body`.

Recommendation: extract the tags from the <img> data-tags property, or alternatively, from the snippet above.

**Conversion**
The description may include FurAffinity-specific links that are to be converted by the following rules:
* Relative URLs are turned into absolute URLs.
* CSS classes and IDs are omitted.
* Mentions of "@USERNAME" or "@@USERNAME" are converted to links: "https://www.furaffinity.net/user/USERNAME".
* Mentions of ":userUSERNAME:" and ":iconUSERNAME:" are converted to links: "https://www.furaffinity.net/user/USERNAME".
* `<img>` tags with their source pointing to `https://a.furaffinity.net/` contain avatars are omitted entirely.
* `<a>` tags with their href pointing to `https://www.furaffinity.net/externalurl/` are rewritten so that they link to the original url.

All conversions are sourced in transform.js.

##### PostDate

The original submission date resides in the following snippet:
```
<span class="popup_date" data-title-date="1" data-24-hour="0" data-time="1784324577" title="July 17, 2026 11:42:57 PM">3 months ago</span>
```
> The <span> element above resides in CSS path `html body#pageid-submission.c-bodyColor div#main-window.footer-mobile-tweak.g-wrapper div#site-content div#submission_page.page-content-type-image div div.submission-page-content div#submission-main-content.content-with-sidebar div div.submission-details div section.submission-description div.section-header.submission-description-header div.submission-description-artist div div`.

Recommendation: extract the date time from .popup_date data-time and convert it to an ISO 8601 string for the sidecar.

##### Source
Lastly, the source URL of the image is to be saved along with all meta data. That is simply the url of the *Image Page*, containing its SUBMISSIONID.

## Extension Working

When a gallery page is visited (identified by its url being `https://www.furaffinity.net/gallery/USERNAME` and nothing more beyond that, e.g. no further segments), the extension checks if the logged in user is the same as USERNAME from the gallery url. If it is, a button "Download Gallery" is injected onto the page. When it is clicked, it changes its display to: "downloaded n files", where n is the number of entries in the extension's storage, "finished" key: a list of SUBMISSIONIDs already fully completed. The counter is synced with the number of entries in the list after each successful download.

The extension opens each image page individually, in the background, one page per second as to not burden the FurAffinity servers. The page is loaded in the background, or, if necessary, as tab that is to be closed after completing read-out.

The image page is scanned for
* the image itself
* Rating
* Title
* Description
* Tags
* Post Date

The image is downloaded, all other meta data and the *Image Page*'s url (source) is stored in a sidecar json file and downloaded alongside the image. When the end of the gallery page is reached, the next page is opened in the same tab and the download process resumed automatically. This goes on until all pages and thus images have been downloaded and the "Next" button is simply not present. 

### Image naming

Images on FurAffinity have the following naming convention:
`IMAGEID.USERNAME_ORIGINALFILENAME.EXTENSION`.
The IMAGEID and the USERNAME along with the dot and underscore delimitting are to be omitted. What should remain is the original file name, with underscores turned into spaces, and of course the original extension. The sidecar should naturally follow along, as it needs to have the same filename in the end.
For example, `129492012.mario_this_is_my_car.jpg` results in the filenames `this is my car.jpg` and `this is my car.json`.

The SUBMISSIONID from the URL is extracted for the "finished" list to prevent it from being downloaded again in the future.

### Issues / TODOs

* The reset button can be clicked in the middle of a download process, screwing up queues.
* File name collision detection works wonky and relies on download history, which should be cleared before commencing downloads. This is an unacceptable requirement of the user.
* Scraps are being entirely ignored.
* The popup is fugly.
* Some logs appear in the content page, some on the background console, where they are unreachable to the user. A proper log messaging mechanic like in Patreon Helper would be nice, e.g. into the options page that does not exist yet.
* All tested on Firefox, never on Chrome, albeit some efforts have been made for compatibility.
