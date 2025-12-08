const KEYWORD_INPUT = document.getElementById("keyword_input");
const ENABLED_TOOGLE = document.getElementById("enabled");
const DARK_MODE = document.getElementById("dark-mode");
const UpdateText = document.getElementById("update-text");
const TranslateSvg = document.getElementById("translate-svg");
const TranslationToggle = document.getElementById("translation-switch");
const TranslateSwitch = document.getElementById("translate-switch");

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

function getBrowserLanguage() {
  // return { lang: "zh", langs: ["zh"] }
  return { lang: window.navigator.language, langs: window.navigator.languages };
}

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

async function onTranslateSwitchChange(ev) {
  TranslationToggle.disabled = true;
  try {
    if (TranslationToggle.checked) {
      try {
        let result = await translate();
        // already running
        if (result === false) {
          ev.preventDefault();
          return;
        }
        if (typeof result === "string") {
          alert(result);
          ev.preventDefault();
          return;
        }
        // TranslateSvg.classList.remove("translation-off");
        // TranslateSvg.classList.add("translation-on");
        console.log("translation complete");
      } catch (err) {
        if (err.message) alert(err.message);
        console.log("translation failed", err);
        ev.preventDefault();
        return;
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
      // TranslateButton.classList.remove("translation-on");
      // TranslateButton.classList.add("translation-off");
    }
  } finally {
    TranslationToggle.disabled = false;
  }
}

TranslationToggle.addEventListener("change", onTranslateSwitchChange);

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
  if (getBrowserLanguage().langs.find(x => x === "en" || x.split('-').includes("en"))) {
    console.log("no need to translate, already works with english");
    return false;
  };
  if ("Translator" in window) {
    translationRunning = true;
    TranslateSvg.classList.add("loader");
    try {
      /**
     * @typedef {require("@types/dom-chromium-ai").Translator} Translator
     */
      let translator = await Translator.create({
        sourceLanguage: 'en',
        targetLanguage: getBrowserLanguage().lang,
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
      TranslateSvg.classList.remove("loader");
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

updateText().then(console.log).catch(console.error);

async function checkIfTranslationIsPossible() {
  if ("Translator" in window) {
    try {
      /**
     * @typedef {require("@types/dom-chromium-ai").Translator} Translator
     */
      let availability = await Translator.availability({
        sourceLanguage: 'en',
        targetLanguage: getBrowserLanguage().lang,
      });
      if (availability === "unavailable") return false;
      return true;
    } catch (err) {
      console.log("translation not possible", err);
      return false;
    }
  } else {
    return false;
  }
}

function hideTranslateOption() {
  console.debug("hiding translater button");
  TranslationToggle.removeEventListener("change", onTranslateSwitchChange);
  TranslateSwitch.remove();
}

if (getBrowserLanguage().langs.find(x => x === "en" || x.split('-').includes("en"))) {
  hideTranslateOption();
} else {
  checkIfTranslationIsPossible().then((possible) => {
    if (!possible) {
      hideTranslateOption();
    }
  }).catch(err => {
    console.log("something went wrong when checking for translate availability", err);
    hideTranslateOption();
  });
}

fetchState();