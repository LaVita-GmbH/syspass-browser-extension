"use strict"

var url = ""
var pin_saved = ""
var timeout = 300
var isControlPressed = false
var curtimer = undefined
var escape = document.createElement("textarea")
var categories = {}

autoTranslateDom()
category_search_button.title = _t("search_category")

getChromeStorage({
    syspass_pin: "",
    timeout: "300",
    iv: "",
    url: "",
}).then((items) => {
    if (items.url !== "") {
        to_site.href = items.url
        url = items.url + "/api.php"
    }
    timeout = items.timeout

    if (items.iv === "") {
        // IV not set -> no Encrypted Login Data
        crit_error.innerHTML = `${_t("no_login_data")}<br /><br /><md-icon class='pointer' id='options'>settings</md-icon>`
        to_site.hidden = true
        return
    } else if (items.syspass_pin === "" || requirePin()) {
        // display pin prompt
        pin_prompt.hidden = false
        pin.focus()
    } else {
        // PIN is still in memory
        checkPin(items.syspass_pin, false)
    }
})

document.addEventListener("keyup", (event) => {
    if (event.key === "Control") isControlPressed = false
})
document.addEventListener("keydown", (event) => {
    if (event.key === "Control") isControlPressed = true
})
document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.target.className.indexOf("account") < 0) return
    if (isControlPressed) {
        event.target.querySelector(".copy_password").click()
    } else {
        let username = event.target.querySelector(".username").innerHTML
        let accountID = event.target.querySelector(".copy_password").id
        autoFill(username, accountID)
    }
})
document.addEventListener("keydown", (event) => {
    if (!event.target.matches("#pin") || event.key !== "Enter") return
    checkPin()
})
document.addEventListener("keydown", (event) => {
    if (!event.target.matches("#searchbar") || event.key !== "Enter") return
    searchAccounts(searchbar.value)
})
document.addEventListener("click", (event) => {
    if (!event.target.matches("#options")) return
    location.href = "/options.html?ext"
})
document.addEventListener("click", (event) => {
    if (!event.target.matches("#search_button")) return
    searchAccounts(searchbar.value)
})
document.addEventListener("click", async (event) => {
    if (!event.target.matches("#lock_button")) return
    clearPin()
    chrome.runtime.sendMessage({ update: "lock" })
    location.reload()
})
document.addEventListener("click", async (event) => {
    if (!event.target.matches("md-icon.open_description")) return
    event.target.closest(".account").classList.toggle("opened")
})
document.addEventListener("click", async (event) => {
    if (!event.target.matches("md-icon.copy_password")) return

    event.target.innerText = "autorenew" // change md-icon
    event.target.classList.add("loading")

    let login_data = await getLoginData(pin_saved)
    let authToken = login_data.token
    let authPass = login_data.password
    let id = event.target.id

    try {
        let pass_res = await apiRequest(url, "account/viewPass", { authToken: authToken, tokenPass: authPass, id: id }, 3)
        let p = pass_res.result.result.password

        navigator.clipboard.writeText(p)
        event.target.innerText = "done"
        event.target.classList.remove("loading")
        event.target.classList.add("green_text")
        setTimeout(() => {
            // change back after 5 seconds
            event.target.innerText = "vpn_key"
            event.target.classList.remove("green_text")
        }, 5000)
    } catch {
        displayPermissionError("account/viewPass")
    }
})

document.addEventListener("click", async (event) => {
    if (!event.target.matches("#category_search_button")) return

    let login_data = await getLoginData(pin_saved)
    let authToken = login_data.token
    try {
        let categories = await apiRequest(
            url,
            "category/search",
            {
                authToken: authToken,
                text: searchbar.value,
            },
            6
        )

        let acc = []
        let idCnt = 50
        let number_of_categories = categories.result.count
        categories.result.result.forEach(async (category) => {
            try {
                let res = await apiRequest(url, "account/search", { authToken: authToken, categoryId: category.id }, idCnt++)
                acc = acc.concat(res.result.result)
                if (--number_of_categories === 0) {
                    account_list.innerHTML = await buildTextFromResponse(acc, authToken)
                }
            } catch {
                displayPermissionError("account/search")
            }
        })
    } catch {
        displayPermissionError("category/search")
    }
})

async function checkPin(value = pin.value, reset = true) {
    let data = await getLoginData(value)
    if (data) {
        if (timeout > 0 && reset) {
            chrome.storage.local.set({
                syspass_pin: value,
            })
            localStorage["pin_required_after"] = Date.now() + timeout * 1000
            chrome.runtime.sendMessage({ update: "unlock" })
        }
        pin_prompt.hidden = true
        hidePinError()
        pin_saved = value

        // load accounts
        hidden_when_locked.hidden = false
        searchbar.focus()
        lock_button.hidden = false

        // query accounts for current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tab) => {
            let tabUrl = tab[0].url
            searchAccounts(getAddressFromUrl(tabUrl))
        })
    } else {
        displayPinError()
    }
}

async function searchAccounts(searchString = "") {
    let login_data = await getLoginData(pin_saved)
    let authToken = login_data.token
    try {
        let res = await apiRequest(url, "account/search", { authToken: authToken, text: searchString }, 2)
        account_list.innerHTML = await buildTextFromResponse(res.result.result, authToken)
    } catch {
        displayPermissionError("account/search")
    }
}

async function buildTextFromResponse(accounts, authToken) {
    try {
        let res = await apiRequest(url, "category/search", { authToken: authToken, count: 1000 }, 5)

        res.result.result.forEach((category) => {
            categories[category.id.toString()] = category.name
        })
    } catch {
        // not critical, but display error anyways
        displayPermissionError("category/search")
    }

    if (accounts.length !== 0) {
        let value = ""
        accounts.forEach((account) => {
            value += `
<div tabindex="0" class="whitebox account highlight">
    <div class="account_info">
        <div class="account_head"><b>${account.name}</b><span class="account_category">${
                categories[account.categoryId]
            }</span></div>
        <div class="username">${account.login}</div>
        <div><a tabindex="-1" href="${account.url.includes("://") ? account.url : "https://" + account.url}" target="_blank">${
                account.url
            }</a></div>
        <div class="account_description">${escapeHTML(account.notes)}</div>
    </div>
    <div class="account_actions">
        <md-icon title="${_t("copy_clipboard")}" class="pointer copy_password" id="${account.id}">vpn_key</md-icon>
        <md-icon class="open_description pointer"${account.notes.length === 0 ? " hidden" : ""}>keyboard_arrow_down</md-icon>
    </div>
</div>`
        })
        return value
    } else {
        return ""
    }
}

function escapeHTML(html) {
    escape.textContent = html
    return replaceAll(escape.innerHTML, "\r\n", "<br />")
}

function replaceAll(str, search, newValue) {
    while (str.indexOf(search) !== -1) str = str.replace(search, newValue)
    return str
}

async function autoFill(username, accountID) {
    let login_data = await getLoginData(pin_saved)

    let authToken = login_data.token
    let authPass = login_data.password

    try {
        let pass_response = await apiRequest(
            url,
            "account/viewPass",
            { authToken: authToken, tokenPass: authPass, id: accountID },
            3
        )
        let password = pass_response.result.result.password

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                command: "fill",
                fields: {
                    login: username,
                    password: password,
                },
            })
        })
    } catch {
        displayPermissionError("account/viewPass")
    }
}

function displayPermissionError(permissionName) {
    displayError(_t("api_error", permissionName))
}
