# Web components for Privacy Manager

[![Build Status](https://travis-ci.com/Manvel/webcomponents.svg?branch=master)](https://travis-ci.com/Manvel/webcomponents)

Collection of web components to be used in the [Privacy Manager](https://chrome.google.com/webstore/detail/privacy-manager/giccehglhacakcfemddmfhdkahamfcmd):
- [pm-toggle](https://pm-components.netlify.com/pm-toggle) - Toggle switch to be used by [Privacy Manager](https://github.com/Manvel/Privacy-Manager).
- [pm-table](https://pm-components.netlify.com/pm-table) - Table to be used by [Privacy Manager](https://github.com/Manvel/Privacy-Manager).
- [pm-dialog](https://pm-components.netlify.com/pm-dialog) - Modal dialog to be used by [Privacy Manager](https://github.com/Manvel/Privacy-Manager).
- [pm-tab-panel](https://pm-components.netlify.com/pm-tab-panel) - Tab panel to be used by [Privacy Manager](https://github.com/Manvel/Privacy-Manager).
- [pm-button](https://pm-components.netlify.com/pm-button) - Button to be used by [Privacy Manager](https://github.com/Manvel/Privacy-Manager).

## Development

```
npm start // Starts server
npm test // Launch puppeteer tests
```

## Import

```
npm install privacy-manager-components
pm-components // Build and import components
pm-components --single-bundle // Build and import components into single file
// Specify components to import
pm-components --comp pm-table --comp pm-toggle
pm-components --output dirname // Specifies output folder
```

## Structure

- [components/src](components/src) - Source codes
- [components/tests/smoke](components/tests/smoke) - Smoke tests
- [components/tests/smoke](components/tests/puppeteer) - Automated tests
