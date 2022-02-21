"use strict"

autoTranslateDom()

getChromeStorage({ iv: "" }).then((data) => {
    if (data.iv === "") {
        // iv not set -> no encrypted Data
        pin_prompt.hidden = true
        settings.hidden = false
    }
})

document.addEventListener("click", (event) => {
    if (!event.target.matches("#save") && !event.target.matches("#save > *")) return
    save()
})
document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || settings.hidden) return
    save()
})

async function save() {
    let token_value = token.value
    let password = pass.value
    let pin_value = new_pin.value
    let pin_confirm = confirm_pin.value
    let timeout_value = timeout.value
    let url_value = url.value

    if (token_value === "" || password === "" || pin_value === "" || pin_confirm === "") {
        displayError(_t("fill_all_fields"))
        return
    } else if (timeout > 1800) {
        displayError(_t("timeout_too_long"))
        return
    } else if (pin_value !== pin_confirm) {
        displayError(_t("pins_not_equal"))
        return
    }

    let validation = validatePin(pin_value)

    if (validation) {
        displayError(validation)
        return
    }

    let iv = window.crypto.getRandomValues(new Uint8Array(16))
    let dataObj = { token: token_value, password: password }

    let key = await generateAesKey(pin_value)
    let encoded = textEncoder.encode(JSON.stringify(dataObj))
    let encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encoded)

    let dataBase64 = arrayBufferToBase64(encrypted)
    let ivBase64 = arrayBufferToBase64(iv)
    chrome.storage.local.set(
        {
            api_data: dataBase64,
            timeout: timeout_value,
            url: url_value,
            iv: ivBase64,
        },
        () => {
            success_msg.classList.remove("fadeout")
            setTimeout(() => {
                if (location.href.includes("?ext")) {
                    location.href = "/index.html"
                } else {
                    location.reload()
                }
            }, 5000)
        }
    )
}
document.addEventListener("change", (event) => {
    if (!event.target.matches("#file_select")) return
    let file = event.target.files[0]
    let reader = new FileReader()
    reader.onload = (() => {
        return (e) => {
            let strArr = e.target.result.split("\n")
            fillFields({
                url: strArr[0],
                token: strArr[1],
                password: strArr[2],
            })
        }
    })(file)
    reader.readAsText(file)
})

document.addEventListener("change", (event) => {
    if (!event.target.matches("#timeout")) return
    updateMinutes()
})

document.addEventListener("keydown", (event) => {
    if (!event.target.matches("#pin") || event.key !== "Enter") return
    let entered_pin = pin.value
    if (entered_pin !== "") {
        getLoginData(entered_pin).then((result) => {
            if (result) {
                hidePinError()
                fillFields(result)
                pin_prompt.hidden = true
                settings.hidden = false
            } else {
                displayPinError()
            }
        })
    }
})

function updateMinutes() {
    timeout_minutes.innerText = timeout.value / 60
}

function validatePin(pin) {
    if (pin.length < 2) return _t("pin_too_short")
    return false
}

function fillFields(items) {
    token.value = items.token || token.value
    pass.value = items.password || pass.value
    url.value = items.url || url.value
    timeout.value = parseInt(items.timeout) || timeout.value
    updateMinutes()
}
