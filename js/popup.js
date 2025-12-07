const KEYWORD_INPUT = document.getElementById("keyword_input");
const ENABLED_TOOGLE = document.getElementById("enabled");
const DARK_MODE = document.getElementById("dark-mode");
const UpdateText = document.getElementById("update-text");
const TranslateButton = document.getElementById("translate-button");

let KEYWORDS = [];
let ENABLED = true;
let DARK_MODE_ENABLED = true;
let translationRunning = false;

let TextContent = [
  {
    querySelectors: ["title", "#txt-title"],
    src: "No Spoilers",
    target: null
  },
  {
    querySelectors: ["#txt-updates"],
    src: "Updates",
    target: null
  },
  {
    querySelectors: ["#txt-controls"],
    src: "Controls",
    target: null
  },
  {
    querySelectors: ["#txt-enable"],
    src: "Enable Extension",
    target: null
  },
  {
    querySelectors: ["#txt-help"],
    src: "Add keywords to filter out spoilers from youtube. Type in a keyword and press enter to add more.",
    target: null
  },
  {
    querySelectors: ["#update-text"],
    src: null,
    target: null,
    opts: {
      isMarkdown: true
    }
  }
];

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
  element.classList.add("glass-card");
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

  TextContent[5].src = markdownCombined;
  UpdateText.innerHTML = DOMPurify.sanitize(marked.parse(markdownCombined));
}

async function translate() {
  if (translationRunning) return false;
  if (navigator.languages.find(x => x === "en" || x.split('-').includes("en"))) {
    console.log("no need to translate, already works with english");
    return false;
  };
  if ("Translator" in window) {
    translationRunning = true;
    try {
      /**
     * @typedef {require("@types/dom-chromium-ai").Translator} Translator
     */
      const translator = await Translator.create({
        sourceLanguage: 'en',
        targetLanguage: navigator.language,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Downloaded ${e.loaded * 100}%`);
          });
        },
      });
      for (let i = 0; i < TextContent.length; i++) {
        if (!TextContent[i].src) continue;
        if (typeof TextContent[i].target === "string") continue;
        TextContent[i].target = await translator.translate(TextContent[i].src);
      }
      updateTranslations();
    } finally {
      translationRunning = false;
    }
  } else {
    console.warn("translation api not supported");
    return "Translation API not supported in your browser";
  }
}

function updateTranslations() {
  for (let i = 0; i < TextContent.length; i++) {
    if (!TextContent[i].src) continue;
    if (typeof TextContent[i].target !== "string") continue;
    for (let querySelector of TextContent[i].querySelectors) {
      let element = document.querySelector(querySelector);
      if (element) {
        // element.textContent = TextContent[i].target;
        if (TextContent[i].opts?.isMarkdown) {
          element.innerHTML = DOMPurify.sanitize(marked.parse(TextContent[i].target));
        } else {
          element.textContent = TextContent[i].target;
        }
      }
    }
  }
}

async function onTranslateClick(event) {
  let isTranslationOff = TranslateButton.classList.contains("translation-off");
  if (isTranslationOff) {
    try {
      let result = await translate();
      if (result === false) return;
      if (typeof result === "string") {
        alert(result);
        return;
      }
      TranslateButton.classList.remove("translation-off");
      TranslateButton.classList.add("translation-on");
      console.log("translation complete");
    } catch (err) {
      if (err.message) alert(err.message);
      console.error("translation failed", err);
    }
  } else {
    for (let i = 0; i < TextContent.length; i++) {
      if (!TextContent[i].src) continue;
      // if (typeof TextContent[i].target !== "string") continue;
      for (let querySelector of TextContent[i].querySelectors) {
        let element = document.querySelector(querySelector);
        if (element) {
          if (TextContent[i].opts?.isMarkdown) {
            element.innerHTML = DOMPurify.sanitize(marked.parse(TextContent[i].src));
          } else {
            element.textContent = TextContent[i].src;
          }
        }
      }
    }
    TranslateButton.classList.remove("translation-on");
    TranslateButton.classList.add("translation-off");
  }
}

updateText().then(console.log).catch(console.error);
TranslateButton.addEventListener("click", onTranslateClick);

if (navigator.languages.find(x => x === "en" || x.split('-').includes("en"))) {
  console.debug("hiding translater button");
  TranslateButton.removeEventListener("click", onTranslateClick);
  TranslateButton.remove();
};

fetchState();