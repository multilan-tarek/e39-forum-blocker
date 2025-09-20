let BLUE_BAR_HEADER_PREFIX = "Der Beitrag von ";
let BLUE_BAR_HEADER_SUFFIX = " wurde ausgeblendet.";

let blockedUsers = {};
let blockedStrings = [];
let tooltipInitDone = false;
let userMenuInitDone = false;

function setCookie(c_name, c_value, ex_days) {
    const d = new Date();
    d.setTime(d.getTime() + (ex_days * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = c_name + "=" + c_value + ";" + expires + ";path=/";
}

function getCookie(c_name, fallback) {
    let name = c_name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return fallback;
}

function saveCookies() {
    setCookie("BING_BLOCKED_USERS", JSON.stringify(blockedUsers), 365);
    setCookie("BING_BLOCKED_STRINGS", JSON.stringify(blockedStrings), 365);
}

async function loadCookies() {
    blockedUsers = JSON.parse(getCookie("BING_BLOCKED_USERS", "{}"));
    blockedStrings = JSON.parse(getCookie("BING_BLOCKED_STRINGS", "[]"));
}

function addToBlacklist() {
    let string = window.getSelection().toString();

    if (!blockedStrings.includes(string)) {
        blockedStrings.push(string);
    }

    saveCookies();
}

function openSettings() {
    document.querySelector("html").style.overflow = "hidden";

    let settingsBackground = document.createElement("DIV");
    settingsBackground.id = "content-blocker-settings";
    settingsBackground.className = "content-blocker-settings-bg";

    let settingsPanel = document.createElement("DIV");
    settingsPanel.className = "content-blocker-settings-panel";

    let settingsClose = document.createElement("SPAN");
    settingsClose.className = "content-blocker-settings-panel-close";
    settingsClose.innerText = "×"
    settingsClose.addEventListener("click", closeSettings);

    let headingUsers = document.createElement("SPAN");
    headingUsers.innerText = "Blockierte Benutzer"
    headingUsers.className = "content-blocker-settings-heading";

    let headingStrings = document.createElement("SPAN");
    headingStrings.innerText = "Blockierte Wörter & Texte"
    headingStrings.className = "content-blocker-settings-heading";

    let spacer = document.createElement("DIV");
    spacer.className = "content-blocker-settings-spacer";

    settingsPanel.appendChild(settingsClose);
    settingsPanel.appendChild(headingUsers);

    if (Object.keys(blockedUsers).length === 0) {
        let userPlaceholder = document.createElement("SPAN");
        userPlaceholder.innerText = "Keine Einträge"
        userPlaceholder.className = "content-blocker-settings-placeholder";
        settingsPanel.appendChild(userPlaceholder);
    }

    for (const [userId, username] of Object.entries(blockedUsers)) {
        let userEntry = document.createElement("SPAN");
        userEntry.innerText = `${username} (ID ${userId})`;
        userEntry.className = "content-blocker-settings-entry";
        userEntry.addEventListener("click", function () {
            delete blockedUsers[userId];
            saveCookies();
            userEntry.remove();

            if (Object.keys(blockedUsers).length === 0) {
                headingUsers.remove();
                spacer.remove();

                if (blockedStrings.length === 0) {
                    closeSettings();
                }
            }
        })

        settingsPanel.appendChild(userEntry);
    }

    settingsPanel.appendChild(spacer);
    settingsPanel.appendChild(headingStrings);

    if (blockedStrings.length === 0) {
        let stringPlaceholder = document.createElement("SPAN");
        stringPlaceholder.innerText = "Keine Einträge"
        stringPlaceholder.className = "content-blocker-settings-placeholder";
        settingsPanel.appendChild(stringPlaceholder);
    }

    for (const string of blockedStrings) {
        let stringEntry = document.createElement("SPAN");
        stringEntry.innerText = `"${string}"`;
        stringEntry.className = "content-blocker-settings-entry";
        stringEntry.addEventListener("click", function () {
            blockedStrings.splice(blockedStrings.indexOf(string), 1);
            saveCookies();
            stringEntry.remove();

            if (blockedStrings.length === 0) {
                headingStrings.remove();
                spacer.remove();

                if (Object.keys(blockedUsers).length === 0) {
                    closeSettings();
                }
            }
        })

        settingsPanel.appendChild(stringEntry);
    }

    settingsBackground.appendChild(settingsPanel);
    document.querySelector("body").appendChild(settingsBackground);
    settingsBackground.click();  // Close User Panel
}

function closeSettings() {
    document.querySelector("html").style.overflow = "auto";
    document.getElementById("content-blocker-settings").remove();
}

function filterContent() {
    const blueBars = document.querySelectorAll("article.ignoredUserMessage");

    for (let blueBar of blueBars) {
        let userId = blueBar.getAttribute("data-user-id");
        let username = blueBar.getAttribute("data-ignored-user-message")
        username = username.replace(BLUE_BAR_HEADER_PREFIX, "")
        username = username.replace(BLUE_BAR_HEADER_SUFFIX, "")

        if (!Object.keys(blockedUsers).includes(userId)) {
            blockedUsers[userId] = username;
        }

        blueBar.parentElement.remove();
    }

    const articles = document.querySelectorAll("article.message");

    for (let article of articles) {
        let messageText = article.querySelector("div.messageText");

        if (messageText == null) {
            continue;
        }

        let blockquotes = messageText.querySelectorAll("blockquote");

        if (blockquotes.length === 0) {
            for (let username of Object.values(blockedUsers)) {
                if (messageText.innerHTML.includes(username)) {
                    article.parentElement.remove();
                    break;
                }
            }
            for (let string of blockedStrings) {
                if (messageText.innerHTML.includes(string)) {
                    article.parentElement.remove();
                    break;
                }
            }
        }

        for (let blockquote of blockquotes) {
            let associatedElements = [blockquote];
            let currentElement = blockquote.nextElementSibling;

            while (currentElement != null) {
                if (["HR", "BLOCKQUOTE"].includes(currentElement.nodeName)) {
                    break
                }

                if (currentElement.nodeType === 1) {
                    associatedElements.push(currentElement)
                }

                currentElement = currentElement.nextSibling;
            }

            let deleteSection = false;

            for (let username of Object.values(blockedUsers)) {
                for (let element of associatedElements) {
                    if (element.innerHTML.includes(username)) {
                        deleteSection = true;
                        break;
                    }
                }
            }

            for (let string of blockedStrings) {
                for (let element of associatedElements) {
                    if (element.innerHTML.includes(string)) {
                        deleteSection = true;
                        break;
                    }
                }
            }

            if (!deleteSection) {
                continue;
            }

            for (let element of associatedElements) {
                element.remove();
            }

            if (messageText.innerText.trim() === "") {
                article.parentElement.remove();
            }
        }
    }

    const reactionListItems = document.querySelectorAll("ol.containerList.jsGroupedUserList li");

    for (let listItem of reactionListItems) {
        let userId = listItem.getAttribute("data-object-id");

        if (Object.keys(blockedUsers).includes(userId)) {
            listItem.classList.add("blocked-reaction-entry");
        }
    }

    let listItems = [
        ...document.querySelectorAll(".containerList:not(.jsGroupedUserList) li:not(.jsIgnoredUser)"),
        ...document.querySelectorAll(".wbbBoardNode__lastPost"),
        ...document.querySelectorAll(".gridListItem"),
        ...document.querySelectorAll(".userMenuItem"),
        ...document.querySelectorAll(".ck-mentions .ck-list__item")
    ];

    for (let listItem of listItems) {
        for (let username of Object.values(blockedUsers)) {
            if (listItem.innerHTML.includes(username)) {
                listItem.remove();
                break;
            }
        }

        for (let string of blockedStrings) {
            if (listItem.innerHTML.includes(string)) {
                listItem.remove();
                break;
            }
        }
    }

    const tooltip = document.querySelector(".balloonTooltip.quoteManagerCopy");

    if (!tooltipInitDone && tooltip) {
        let blacklistTooltipButton = document.createElement("SPAN");
        blacklistTooltipButton.innerText = "Zur Blacklist hinzufügen";
        blacklistTooltipButton.addEventListener("click", addToBlacklist);

        tooltip.appendChild(blacklistTooltipButton);
        tooltipInitDone = true;
    }

    const userMenuContent = document.querySelector(".userMenuControlPanel .userMenuContent.userMenuContentScrollable");

    if (!userMenuInitDone && userMenuContent) {
        let userMenuEntry = userMenuContent.firstElementChild.nextElementSibling.cloneNode(true);
        userMenuEntry.querySelector(".userMenuItemLink").innerText = "Inhaltsblocker verwalten";
        userMenuEntry.querySelector(".userMenuItemLink").removeAttribute("href");
        userMenuEntry.addEventListener("click", openSettings);
        userMenuContent.appendChild(userMenuEntry);

        userMenuInitDone = true;
    }

    const sections = document.querySelectorAll(".section");

    for (let section of sections) {
        section.style.opacity = "1";
    }

    saveCookies();
}

let contentObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
        if (m.addedNodes.length > 0) {
            filterContent();
        }
    }
});

document.addEventListener("DOMContentLoaded", function () {
    loadCookies().then(function () {
        contentObserver.observe(document.body, {childList: true, subtree: true});
        filterContent();
    });
});





