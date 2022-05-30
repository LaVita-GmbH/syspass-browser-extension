# Syspass Browser Extension

This is a Browser Extension to access a [Syspass Password Manager](https://github.com/nuxsmin/sysPass).

While it was developed for and tested on Chrome, it also works on Firefox.

Current Features include:
* Searching for Accounts
* Searching for Categories
* Copying Passwords
* Keyboard navigation (Tab/Shift+Tab)
* Autofill (Enter key)
* PIN unlock

We are not affiliated in any way with the original creators of Syspass.

This Software is published and distributed under the GPLv3 License. A copy can be found in LICENSE.

This Software comes without any Warranty as stated in the LICENSE.

It's available to Download from the [Chrome Web Store](https://chrome.google.com/webstore/detail/syspass-extension/feahijnajgdohegpimfhilphmgehedji)


## Installation

1. You'll need an API Token & Password with the following priviliges:  
   account/search, account/viewPass, category/search
2. In the Extension Options, enter the Login Data and the URL, e.g. `https://syspass.domain.local`
3. Choose a PIN, this will be used to encrypt and decrypt the Token and Password
4. Click Save Icon

Step 2 can be skipped by using a file, in which the Login Data is contained as follows:

    SYSPASS URL
    API TOKEN
    API PASSWORD
This method can be used for supplying users with a file instead of the Login Data by itself.
