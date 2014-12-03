# [![tabalot](https://raw.githubusercontent.com/diffsky/tabalot/master/icon-38.png)](https://github.com/diffsky/tabalot) Tabalot

Google Chrome Browser Extension to keep a limit on your open tabs.

## Install

Install via [the chrome web store](https://chrome.google.com/webstore/detail/tabalot/oakcapkgmnkhiglcimjcbobnloldlcgf?hl=en&gl=US).

## Description

Automatically limit the number of open tabs in chrome.

If you end up with too many tabs open, all reduced to a tiny size, this extension will help you keep those tabs under control. After reaching a configurable open tab limit (that excludes pinned tabs) Tabalot will automatically close the left-hand non-active tab. As you get close to your tab limit, the extension icon badge count will turn red and when it deletes a tab for you give off a visual glow.

Note that the tab badge count shows tabs in the current open window only (which seems to be a limitation on chrome) but will correctly update as you switch windows.

## Usage

Click the badge icon to set your maximum number of tabs. The badge displays the
current number of open tabs (not counting pinned tabs). As you open more tabs
the badge count background gets more red as it nears your limit (which you set
by clicking the badge). When your tab limit is reached, the tab count number flashes.
Once the limit is exceeded, the Tabalot badge flashes red and Tabalot will
close the left-hand most tab (unless that tab was just opened or was used to
open a new tab by command clicking a link in it).
