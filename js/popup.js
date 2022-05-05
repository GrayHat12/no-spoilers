const KEYWORD_INPUT = document.getElementById("keyword_input");
const UPDATE_BUTTON = document.getElementById("update");
const ENABLED_TOOGLE = document.getElementById("enabled");
let KEYWORDS = [];
let ENABLED = true;

function generateKeywordElement(keyword) {
  let element = document.createElement("div");
  element.classList.add("keyword");
  element.textContent = keyword;
  document.getElementById("keywords").appendChild(element);
}

function updateUI() {
  document.getElementById("keywords").innerHTML = "";
  KEYWORDS.forEach((keyword) => generateKeywordElement(keyword));
  ENABLED_TOOGLE.checked = ENABLED;
}

function pushKeyword(keyword) {
  if (keyword == "") return;
  if (KEYWORDS.includes(keyword)) return;
  KEYWORDS.push(keyword);
  generateKeywordElement(keyword);
}

function popKeyword() {
  if (KEYWORDS.length == 0) return;
  KEYWORDS.pop();
  updateUI();
}

KEYWORD_INPUT.addEventListener("keyup", (ev) => {
  let key = ev.key;
  if (key == "Enter") {
    pushKeyword(KEYWORD_INPUT.value);
    KEYWORD_INPUT.value = "";
  } else if (key == "Backspace" || key == "Delete") {
    if (KEYWORD_INPUT.value == "") {
      popKeyword();
    }
  }
});

ENABLED_TOOGLE.addEventListener("change", (ev) => {
  ENABLED = ev.target.checked;
});

UPDATE_BUTTON.addEventListener("click", () => {
  sendState();
});

function sendState() {
  chrome.runtime.sendMessage(
    {
      type: "state_set",
      value: { keywords: KEYWORDS, enabled: ENABLED },
    },
    (response) => {
      console.log(response);
    }
  );
}

function fetchState() {
  chrome.runtime.sendMessage(
    {
      type: "state_get",
    },
    (response) => {
      console.log(response);
      // KEYWORDS = response.keywords;
      // ENABLED = response.enabled;
      // updateUI();
    }
  );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("got message", request, sender, sendResponse);
  if (request.type === "state_sync") {
    sendResponse(true);
    KEYWORDS = request.value.keywords;
    ENABLED = request.value.enabled;
    updateUI();
  } else {
    sendResponse({ error: "Unknown request type" });
  }
});

chrome.action.onClicked.addListener((tab) => {
  fetchState();
});

fetchState();