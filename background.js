"use strict"

var url = ""
var file = "icon_128.png"

clearPin() // clear PIN on Browser start

if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    file = "icon_128_light.png"
}
chrome.browserAction.setBadgeBackgroundColor({ color: "#283593" })

chrome.browserAction.setIcon({ path: "lock_" + file })

chrome.tabs.onActivated.addListener((info) => {
    onTabChange(info.tabId)
})

chrome.tabs.onUpdated.addListener((id) => {
    onTabChange(id)
})

var currentTimeOut = 0
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (sender.url.indexOf("chrome-extension") === 0) {
        if (request.update === "unlock") {
            chrome.browserAction.setIcon({ path: file })
            let timeout = 0
            let items = await getChromeStorage({ timeout: 0 })
            timeout = items.timeout * 1000
            currentTimeOut = setTimeout(() => {
                clearPin()
                chrome.browserAction.setIcon({ path: "lock_" + file })
            }, timeout)
        } else if (request.update === "lock") {
            chrome.browserAction.setIcon({ path: "lock_" + file })
            if (currentTimeOut !== 0) {
                clearTimeout(currentTimeOut)
            }
        }
    }
})

async function onTabChange(tabId) {
    if (url === "") {
        let url_item = await getChromeStorage({ url: "" })
        if (url_item.url === "") return
        url = url_item.url + "/api.php"
    }

    let items = await getChromeStorage({
        syspass_pin: "",
    })
    chrome.browserAction.setBadgeText({
        text: "",
    })
    if (items.syspass_pin !== "") {
        chrome.tabs.get(tabId, async (tab) => {
            let address = getAddressFromUrl(tab.url)
            if (address) {
                let login_data = await getLoginData(items.syspass_pin)
                if (!login_data) return // if pin is wrong, getLoginData will return 'false'

                let authToken = login_data.token
                try {
                    let res = await apiRequest(url, "account/search", { authToken: authToken, text: address }, 1)

                    let num = res.result.result.length
                    if (num >= 1) {
                        chrome.browserAction.setBadgeText({
                            text: num < 10 ? num.toString() : "9+",
                        })
                    }
                } catch (error) {
                    chrome.browserAction.setBadgeText({
                        text: "ERR",
                    })
                }
            }
        })
    }
}
