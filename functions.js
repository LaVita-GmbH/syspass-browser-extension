"use strict"

const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

function _t(string, placeholders = "") {
    return chrome.i18n.getMessage(string, placeholders)
}

function getAddressFromUrl(url) {
    if (!url) return
    let address = url.split("//")[1]
    address = address.split("/")[0]
    address = address.split(":")[0]
    let host_as_array = address.split(".")
    let max_index = host_as_array.length - 1
    if (host_as_array[max_index].includes("local")) {
        return host_as_array[max_index - 2]
    } else if (host_as_array.length === 4 && host_as_array[0] === "192" && host_as_array[1] === "168") {
        return address
    } else {
        return host_as_array[max_index - 1]
    }
}

function requirePin() {
    let pin_required_after = localStorage["pin_required_after"]
    if (isNaN(parseInt(pin_required_after))) return true
    return parseInt(pin_required_after) < Date.now()
}

function clearPin() {
    chrome.storage.local.set({
        syspass_pin: "",
    })
    delete localStorage["pin_required_after"]
}

function getChromeStorage(items) {
    return new Promise((resolve) => {
        chrome.storage.local.get(items, (result) => {
            resolve(result)
        })
    })
}

async function apiRequest(url, method, params, id) {
    let response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: method,
            params: params,
            id: id,
        }),
    })

    response = await response.json()

    if (response.error) {
        throw new Error("API Error", { cause: response })
    }

    return response
}

document.addEventListener("click", (event) => {
    if (!event.target.matches("#close_error")) return
    error_box.classList.add("fadeout")
})

function displayError(message) {
    error_box.hidden = false
    error.innerText = message
    error_box.classList.remove("fadeout")
}

function displayPinError() {
    displayError(_t("wrong_pin"))
    error_box.classList.add("pin_error")
    close_error.hidden = true
}

function hidePinError() {
    error_box.hidden = true
    close_error.hidden = false
    error_box.classList.remove("pin_error")
    error_box.classList.add("fadeout")
}

async function getLoginData(pin) {
    let data = await getChromeStorage({ api_data: "", timeout: "", iv: "", url })
    let decrypted = {}
    if (pin !== undefined && pin !== null) {
        let buffArr = base64ToArrayBuffer(data["api_data"])
        try {
            let jsonDataEnc = await decrypt(pin, buffArr, base64ToArrayBuffer(data["iv"]))
            let jsonData = textDecoder.decode(jsonDataEnc)
            decrypted = JSON.parse(jsonData)
        } catch (error) {
            console.log(error)
            if (error.name === "OperationError") {
                return false
            } else {
                throw error
            }
        }
    } else return false

    return Object.assign(decrypted, data)
}

async function decrypt(pin, encrypted, iv) {
    let key = await generateAesKey(pin)
    let decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encrypted)
    return decrypted
}

async function generateAesKey(keystring) {
    let hash = await stringToHashBuffer(keystring)
    let key = await window.crypto.subtle.importKey("raw", hash, "AES-GCM", true, ["encrypt", "decrypt"])
    return key
}

async function stringToHashBuffer(string) {
    let utf8 = textEncoder.encode(string)
    let hashBuffer = await crypto.subtle.digest("SHA-256", utf8)
    return hashBuffer
}

function autoTranslateDom() {
    let elements = document.querySelectorAll("[data-translation]")
    elements.forEach((element) => {
        let translation = _t(element.getAttribute("data-translation"))
        element.innerText = translation
    })
}

// https://www.isummation.com/blog/convert-arraybuffer-to-base64-string-and-vice-versa/
function arrayBufferToBase64(buffer) {
    let binary = ""
    let bytes = new Uint8Array(buffer)
    let len = bytes.byteLength
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
}

function base64ToArrayBuffer(base64) {
    let binary_string = window.atob(base64)
    let len = binary_string.length
    let bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes.buffer
}
