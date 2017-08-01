/*global chrome */

'use strict';

window.onload = function() {
  var TABALOT = chrome.extension.getBackgroundPage().TABALOT;
  var tabLimitEl = document.getElementById('tabLimit');
  tabLimitEl.value = localStorage.tabLimit;
  tabLimitEl.addEventListener('change', function() {
    TABALOT.setTabLimit(tabLimitEl.value);
    chrome.windows.getAll(function(windows) {
      windows.forEach(function(win) {
        TABALOT.checkTabCount(win.id);
      });
      window.close();
    });
  }, false);
};
