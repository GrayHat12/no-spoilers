const KEYWORD_INPUT = document.getElementById("keyword_input");
const ENABLED_TOOGLE = document.getElementById("enabled");
const DARK_MODE = document.getElementById("dark-mode");
const UpdateText = document.getElementById("update-text");

let KEYWORDS = [];
let ENABLED = true;
let DARK_MODE_ENABLED = true;

function updateTheme() {
  if (DARK_MODE_ENABLED) {
    if (!document.body.classList.contains("dark")) document.body.classList.add("dark");
  }
  else {
    document.body.classList.remove("dark");
  }
}

function removeKeyword(keyword) {
  KEYWORDS = KEYWORDS.filter(k => k !== keyword);
  updateUI();
  sendState();
}

function generateKeywordElement(keyword) {
  let element = document.createElement("div");
  element.classList.add("keyword");
  let text = document.createElement("span");
  text.classList.add("text");
  text.innerText = keyword;
  let remove = document.createElement("img");
  remove.src = "/assets/close.png";
  remove.addEventListener("click", () => removeKeyword(keyword));
  element.appendChild(text);
  element.appendChild(remove);
  document.getElementById("keywords").appendChild(element);
}

function updateUI() {
  document.getElementById("keywords").innerHTML = "";
  KEYWORDS.forEach((keyword) => generateKeywordElement(keyword));
  ENABLED_TOOGLE.checked = ENABLED;
  updateTheme();
}

function pushKeyword(keyword) {
  if (keyword == "") return;
  if (KEYWORDS.includes(keyword)) return;
  KEYWORDS.push(keyword);
  generateKeywordElement(keyword);
  sendState();
}

function popKeyword() {
  if (KEYWORDS.length == 0) return;
  KEYWORDS.pop();
  updateUI();
  sendState();
}

KEYWORD_INPUT.addEventListener("keyup", (ev) => {
  let key = ev.key;
  if (key == "Enter") {
    pushKeyword(KEYWORD_INPUT.value);
    KEYWORD_INPUT.value = "";
  }
});

KEYWORD_INPUT.addEventListener("keydown", (ev) => {
  let key = ev.key;
  if (key == "Backspace" || key == "Delete") {
    if (KEYWORD_INPUT.value == "") {
      popKeyword();
    }
  }
});

ENABLED_TOOGLE.addEventListener("change", (ev) => {
  ENABLED = ev.target.checked;
  sendState();
});

DARK_MODE.addEventListener("click", () => {
  let isdark = document.body.classList.contains("dark");
  DARK_MODE_ENABLED = !isdark;
  updateTheme();
  sendState();
})

function sendState() {
  chrome.runtime.sendMessage(
    {
      type: "state_set",
      value: { keywords: KEYWORDS, enabled: ENABLED, darkMode: DARK_MODE_ENABLED },
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
    }
  );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("got message", request, sender, sendResponse);
  if (request.type === "state_sync") {
    sendResponse(true);
    KEYWORDS = request.value.keywords;
    ENABLED = request.value.enabled;
    DARK_MODE_ENABLED = request.value.darkMode;
    KEYWORDS = KEYWORDS || [];
    updateUI();
  } else {
    sendResponse({ error: "Unknown request type" });
  }
});

chrome.action.onClicked.addListener((tab) => {
  fetchState();
});


async function updateText() {
  let responses = await Promise.all([
    fetch("https://raw.githubusercontent.com/GrayHat12/no-spoilers/refs/heads/main/updates/GENERAL.md"),
    fetch("https://raw.githubusercontent.com/GrayHat12/no-spoilers/refs/heads/main/updates/NoSpoilers.md"),
  ]);

  let markdownCombined = "";
  for (let response of responses) {
    if (response.status != 200) continue;
    markdownCombined += await response.text();
  }
  UpdateText.innerHTML = DOMPurify.sanitize(marked.parse(markdownCombined));
}

updateText().then(console.log).catch(console.error);


fetchState();
