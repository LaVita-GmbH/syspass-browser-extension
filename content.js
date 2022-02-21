"use strict"

const username_fields = ["login", "user", "email"]
const password_fields = ["pass", "pwd"]

function findAndFillField(fieldName, value, type) {
    let field = document.querySelector(`input[name*=${fieldName}][type=${type}]`)
    if (!field) return false
    field.value = value
    return true
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.command === "fill") {
        if (request.fields.login) {
            for (let i = 0; i < username_fields.length; i++) {
                if (findAndFillField(username_fields[i], request.fields.login, "text")) break
            }
        }
        if (request.fields.password) {
            for (let i = 0; i < password_fields.length; i++) {
                if (findAndFillField(password_fields[i], request.fields.password, "password")) break
            }
        }
    }
})
