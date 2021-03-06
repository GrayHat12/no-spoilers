const ACTIVE_TABS = new Set();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "state_set") {
    sendResponse(updateState(request.value));
  } else if (request.type === "state_get") {
    getState();
    sendResponse(true);
  } else if (request.type === "tab_reg") {
    ACTIVE_TABS.add(sender.tab.id);
    fetchAndSendToAllTabs();
    sendResponse(true);
  } else if (request.type === "tab_unreg") {
    ACTIVE_TABS.delete(sender.value.tab.id);
    sendResponse(true);
  } else {
    console.error(request, sender, sendResponse);
    sendResponse({ error: "Unknown request type" });
  }
});

chrome.tabs.onRemoved.addListener((id, ev) => {
  ACTIVE_TABS.delete(id);
});

function updateState({ keywords, enabled, darkMode }) {
  console.log("updateState", keywords, enabled);
  keywords = keywords || [];
  if (typeof enabled !== "boolean") {
    enabled = true;
  }
  chrome.storage.sync.set({ keywords }, () => {
    console.log("state is set to ", keywords);
  });
  chrome.storage.sync.set({ enabled }, () => {
    console.log("enabled is set to " + enabled);
  });
  chrome.storage.sync.set({ darkMode }, () => {
    console.log("darkMode is set to " + darkMode);
  });
  sendToAllTabs(keywords, enabled, darkMode);
  return true;
}

function fetchAndSendToAllTabs() {
  chrome.storage.sync.get(["keywords", "enabled", "darkMode"], (result) => {
    console.log("Current state is", result);
    sendToAllTabs(result.keywords, result.enabled, result.darkMode);
  });
}

function sendToAllTabs(keywords, enabled, darkMode) {
  ACTIVE_TABS.forEach((tab) => {
    chrome.tabs.sendMessage(tab, {
      type: "state_sync",
      value: { keywords, enabled, darkMode },
    });
  });
}

function getState() {
  chrome.storage.sync.get(["keywords", "enabled", "darkMode"], (result) => {
    console.log("Current state is", result);
    chrome.runtime.sendMessage(
      {
        type: "state_sync",
        value: {
          keywords: result.keywords,
          enabled: result.enabled,
          darkMode: result.darkMode,
        },
      },
      (response) => {
        console.log(response);
      }
    );
  });
}
