'use strict';

window.TABALOT = (function init() {
  var defaultTabLimit = 25;
  var tabLimit;
  var buffer;
  var warnTabs;
  var checking;
  var history = {};

  var debug = !('update_url' in chrome.runtime.getManifest());
  var noop = function() {};
  var log = noop;
  var logHistory = noop;

  if (debug) {
    log = console.log;

    logHistory = function() {
      var list = [];

      Object.keys(history).forEach(function(tab) {
        list.push({
          tab: tab,
          title: tab.title,
          timestamp: history[tab]
        });
      });

      list = list.sort(function(a, b) {
        return (a.timestamp || 0) - (b.timestamp || 0);
      }).map(function(tab) {
        return tab.tab;
      });

      log(list);
    };
  }

  function setTabLimit(limit) {
    localStorage.tabLimit = tabLimit = parseInt(limit || localStorage.tabLimit || defaultTabLimit, 10);
    log('tab limit:', tabLimit);

    // start colorizing badge when 40% tabs left until max
    buffer = parseInt((tabLimit / 100) * 40, 10);
    warnTabs = tabLimit - buffer;
  }
  setTabLimit();
  chrome.browserAction.setTitle({
    title: 'Tabalot: ' + tabLimit + ' tab limit'
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
    logHistory();
  }

  function delHistory(tabId) {
    delete history[tabId];
    logHistory();
  }

  function checkTabCount() {
    // multiple events can fire, limit the activity
    if (checking) {
      return;
    }

    checking = true;
    setTabLimit();

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
      if (unPinnedTabsCount > tabLimit) {
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
          return (a.timestamp || 0) - (b.timestamp || 0);
        });
        --unPinnedTabsCount;
        log('remove tab:', candidates[0].id);

        chrome.tabs.remove(candidates[0].id, function() {
          log('removed tab:', candidates[0].id);
        });
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
        if (unPinnedTabsCount === tabLimit) {
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
    log(tab.id, 'tab: onCreated');
    addHistory(tab);
    checkTabCount();
  });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    log(tabId, 'tab: onUpdated');
    addHistory(tab);
    // catch (un)pin events
    if (changeInfo.hasOwnProperty('pinned')) {
      checkTabCount();
    }
  });

  chrome.tabs.onMoved.addListener(function(tabId) {
    log(tabId, 'tab: onMoved');
    addHistory(tabId);
  });

  chrome.tabs.onActivated.addListener(function(activeInfo) {
    log(activeInfo.tabId, 'tab: onActivated');
    addHistory(activeInfo.tabId);
  });

  chrome.tabs.onRemoved.addListener(function(tabId) {
    log(tabId, 'tab: onRemoved');
    delHistory(tabId);
    checkTabCount();
  });

  chrome.tabs.onDetached.addListener(function(tabId) {
    log(tabId, 'tab: onDetached');
    delHistory(tabId);
    checkTabCount();
  });

  chrome.tabs.onAttached.addListener(function(tabId) {
    log(tabId, 'tab: onAttached');
    addHistory(tabId);
    checkTabCount();
  });

  chrome.windows.getLastFocused(function() {
    log('window: getLastFocussed');
    checkTabCount();
  });

  chrome.windows.onCreated.addListener(function() {
    log('window: onCreated');
    checkTabCount();
  });

  chrome.windows.onFocusChanged.addListener(function() {
    log('window: onFocusChanged');
    checkTabCount();
  });

  // add all tabs on startup
  chrome.tabs.getAllInWindow(null, function(tabs) {
    tabs.forEach(function(tab) {
      addHistory(tab.id);
    });
  });

  return {
    checkTabCount: checkTabCount,
    setTabLimit: setTabLimit
  };

})();
