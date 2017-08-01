/*global chrome, checkTabCount */

'use strict';

window.onload = function() {
  var tabLimitEl = document.getElementById('tabLimit');
  tabLimitEl.value = localStorage.tabLimit;
  tabLimitEl.addEventListener('change', function() {
    var maxTabs = parseInt(tabLimitEl.value, 10);
    localStorage.tabLimit = maxTabs;
    chrome.browserAction.setTitle({
      title: 'Tabalot: ' + maxTabs + ' tab limit'
    });
    chrome.windows.getAll(function(windows) {
      windows.forEach(function(win) {
        checkTabCount(win.id);
      });
      window.close();
    });
  }, false);
};
