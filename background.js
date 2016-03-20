'use strict';

var maxTabs;
var buffer;
var warnTabs;
var checking;
var history;

function setTabLimits() {
  maxTabs = parseInt(localStorage.tabLimit = localStorage.tabLimit || 12, 10);

  // start colorizing badge when 40% tabs left until max
  buffer = parseInt((maxTabs / 100) * 40, 10);
  warnTabs = maxTabs - buffer;
}
setTabLimits();
chrome.browserAction.setTitle({
  title: 'Tabalot: ' + maxTabs + ' tab limit'
});

function updateBadge(val, flash) {
  if (flash > 0) {
    if (flash % 2 === 0) {
      chrome.browserAction.setBadgeBackgroundColor({
        color: [0, 0, 0, 150]
      });
    } else {
      chrome.browserAction.setBadgeBackgroundColor({
        color: [255, 0, 0, 255]
      });
    }
    setTimeout(function() {
      updateBadge(val, --flash);
    }, 300);
  } else {
    chrome.browserAction.setBadgeText({
      text: val.toString()
    });
  }
}

function addHistory(tab) {
  if (tab.pinned) {
    return;
  }
  history[(tab.id || tab)] = Date.now();
}

function delHistory(tabId) {
  delete history[tabId];
}

function checkTabCount() {
  // multiple events can fire, limit the activity
  if (checking) {
    return;
  }
  checking = true;
  setTabLimits();

  chrome.tabs.query({
    windowId: chrome.windows.WINDOW_ID_CURRENT
  }, function(tabs) {
    if (!tabs.length) {
      checking = false;
      return;
    }

    var unPinnedTabs = [];
    var pinnedTabs = {};

    tabs.forEach(function(tab) {
      if (tab.pinned) {
        pinnedTabs[tab.id] = 1;
      } else {
        unPinnedTabs.push(tab);
      }
    });

    var unPinnedTabsCount = unPinnedTabs.length;

    // remove a tab
    if (unPinnedTabsCount > maxTabs) {
      // flash the icon red
      chrome.browserAction.setIcon({
        path: 'icon-alert-38.png'
      });
      setTimeout(function() {
        chrome.browserAction.setIcon({
          path: 'icon-38.png'
        });
      }, 400);

      var candidates = unPinnedTabs.filter(function(tab) {
        // if the current tab is active, don't attempt to close it
        // use case: undo closing of a tab from tabalot
        if (tab.active) {
          return false;
        }
        // don't close a new tab that was opened from another tab
        // use case: cmd click a link that creates a tab beyond the max count
        if (tab.openerTabId === tab.id || pinnedTabs[tab.openerTabId]) {
          return false;
        }

        tab.timestamp = history[tab.id];
        return true;
      }).sort(function(a, b) {
        return a.timestamp - b.timestamp;
      });

      --unPinnedTabsCount;
      chrome.tabs.remove(candidates[0].id);
    }
    updateBadge(unPinnedTabsCount);

    // update tab count on badge
    if (unPinnedTabsCount > warnTabs) {
      var panic = 100 * ((unPinnedTabsCount - warnTabs) / buffer);
      panic = parseInt((255 / 100) * panic, 10);
      if (panic >= 255) {
        panic = 255;
      }
      chrome.browserAction.setBadgeBackgroundColor({
        color: [panic, 0, 0, 255]
      });
      if (unPinnedTabsCount === maxTabs) {
        setTimeout(function() {
          updateBadge(unPinnedTabsCount, 4);
        }, 300);
      }
    } else {
      chrome.browserAction.setBadgeBackgroundColor({
        color: [0, 0, 0, 150]
      });
      chrome.browserAction.setIcon({
        path: 'icon-38.png'
      });
    }
    checking = false;
  });
}

chrome.tabs.onCreated.addListener(function(tab) {
  // console.log('tab onCreated');
  addHistory(tab);
  checkTabCount();
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // console.log('tab onUpdated');
  addHistory(tab);
});

chrome.tabs.onMoved.addListener(function(tabId) {
  // console.log('tab onMoved');
  addHistory(tabId);
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  // console.log('tab onActivated');
  addHistory(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  // console.log('tab onRemoved');
  delHistory(tabId);
  checkTabCount();
});

chrome.tabs.onDetached.addListener(function(tabId) {
  // console.log('tab onDetached');
  delHistory(tabId);
  checkTabCount();
});

chrome.tabs.onAttached.addListener(function(tabId) {
  // console.log('tab onAttached');
  addHistory(tabId);
  checkTabCount();
});

chrome.windows.getLastFocused(function() {
  // console.log('window getLastFocussed');
  checkTabCount();
});

chrome.windows.onCreated.addListener(function() {
  // console.log('window onCreated');
  checkTabCount();
});

chrome.windows.onFocusChanged.addListener(function() {
  // console.log('window on focus changed');
  checkTabCount();
});
