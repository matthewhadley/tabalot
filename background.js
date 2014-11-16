/*global chrome */

'use strict';

var maxTabs;
var buffer;
var warnTabs;
var checking;

function setTabLimits() {
  maxTabs = parseInt(localStorage.tabLimit = localStorage.tabLimit || 12, 10);

  // start colorizing badge when 40% tabs left until max
  buffer = parseInt((maxTabs / 100) * 40, 10);
  warnTabs = maxTabs - buffer;
}
setTabLimits();
chrome.browserAction.setTitle({title: 'Tabalot: ' + maxTabs + ' tab limit'});

function updateBadge(val, flash){
  if(flash > 0){
    if (flash % 2 === 0) {
      chrome.browserAction.setBadgeBackgroundColor({ color: [0, 0, 0, 150] });
    } else {
      chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
    }
    setTimeout(function(){
      updateBadge(val, --flash);
    }, 300);
  } else {
    chrome.browserAction.setBadgeText({ text: val.toString()});
  }
}

function checkTabCount() {
  // multiple events can fire, limit the activity
  if(checking){
    return;
  }
  checking = true;
  setTabLimits();

  chrome.tabs.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, function(tabs){
    if(!tabs.length){
      return;
    }

    var unPinnedTabs = [];
    var pinnedTabs = [];
    var i, il, j;

    for (i = 0, il = tabs.length; i < il; i++) {
      if(tabs[i].pinned){
        pinnedTabs.push(tabs[i]);
      } else {
        unPinnedTabs.push(tabs[i]);
      }
    }

    var unPinnedTabsCount = unPinnedTabs.length;
    var pinnedTabsCount = pinnedTabs.length;

    // remove a tab
    if(unPinnedTabsCount > maxTabs) {
      // flash the icon red
      chrome.browserAction.setIcon({path: 'iconAlert.png'});
      setTimeout(function(){
        chrome.browserAction.setIcon({path: 'icon.png'});
      }, 400);

      // try to remove a tab
      loopTabs:
      for (i = 0, il = unPinnedTabs.length; i < il; i++) {
        // if the current tab is active, don't attempt to close it
        // use case: undo closing of a tab from tabalot
        if(unPinnedTabs[i].active){
          continue;
        }

        // don't close a new tab that was opened from another tab
        // use case: cmd click a link that creates a tab beyond the max count
        if(unPinnedTabs[i].openerTabId === unPinnedTabs[i].id){
          continue;
        }
        for (j = 0; j < pinnedTabsCount; j++) {
          if(unPinnedTabs[i].openerTabId === pinnedTabs[j].id) {
            continue loopTabs;
          }
        }

        // close the leftmost tab that isn't active or the instigator of the last opened tab
        --unPinnedTabsCount;
        /*jshint loopfunc: true */
        // console.log(unPinnedTabs[i]);
        chrome.tabs.remove(unPinnedTabs[i].id, function(){
          updateBadge(unPinnedTabsCount);
        });
        break;

      }
    } else {
      updateBadge(unPinnedTabsCount);
    }

    // update tab count on badge
    if(unPinnedTabsCount > warnTabs){
      var panic = 100 * ((unPinnedTabsCount - warnTabs) / buffer);
      panic = parseInt((255 / 100) * panic, 10);
      if(panic >= 255) {
        panic = 255;
      }
      chrome.browserAction.setBadgeBackgroundColor({ color: [panic, 0, 0, 255] });
      if(unPinnedTabsCount === maxTabs){
        setTimeout(function(){
          updateBadge(unPinnedTabsCount, 4);
        }, 300);
      }
    } else {
      chrome.browserAction.setBadgeBackgroundColor({ color: [0, 0, 0, 150] });
      chrome.browserAction.setIcon({path: 'icon.png'});
    }
    checking = false;
  });
}

chrome.tabs.onUpdated.addListener(function() {
  // console.log('tab onUpdated');
  checkTabCount();
});

chrome.tabs.onCreated.addListener(function() {
  // console.log('tab onCreated');
  checkTabCount();
});

chrome.tabs.onRemoved.addListener(function() {
  // console.log('tab onRemoved');
  checkTabCount();
});

chrome.tabs.onDetached.addListener(function() {
  // console.log('tab onDetached');
  checkTabCount();
});

chrome.tabs.onAttached.addListener(function() {
  // console.log('tab onAttached');
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
