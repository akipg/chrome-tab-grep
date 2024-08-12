<template>
  <div>
    <h1>grep</h1>
    <hr />
    <p>yo yo</p>
    <p>
      <input type="checkbox" id="showdetails" v-model="showDetails">
      <label for="showdetails"> Show details</label><br>
    </p>
    <input type="text" id="input" v-model="inputValue" @input="handleInput">
    <div>
      <div id="result">
        <div v-for="(result, index) in results" :key="index">
          <p @click="activateTab(result.sender.tab.id)">
            <img class="favicon" :src="result.sender.tab.favIconUrl" />
            <span>{{ result.sender.tab.title }}</span>
          </p>
          <ul v-if="showDetails">
            <li v-for="(match, matchIdx) in result.message.result" :key="matchIdx" @click="scrollToElement(result.sender.tab.id, matchIdx)">
              <span v-html="highlightMatch(match)"></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>



<script>

const DEBUG_WARN = false;

function debounce(func, wait) {
    let timeout;
    let block = false;
    return function(...args) {
      if (block) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          block = false;
          func.apply(this, args);
        }, wait);
      } else {
        clearTimeout(timeout);
        func.apply(this, args);
        block = true;
      }
    };
  }
  
export default {
  data() {
    return {
      inputValue: '',
      showDetails: false,
      results: []
    };
  },
  methods: {
    handleInput: debounce(async function () {
      if (DEBUG_WARN) console.warn("[Panel] input event fired");
      if(this.inputValue.trim() === "") {
        this.results = [];
        return;
      }
      chrome.storage.local.set({ input: this.inputValue });
      const tabs = await chrome.tabs.query({});
      this.results = [];
      for (const tab of tabs) {
        if (DEBUG_WARN) console.warn("[Panel] Sending message to content script:", tab.id, tab.windowId, tab.index, tab.title);
        const ret = chrome.tabs.sendMessage(tab.id, { type: "inputChanged", value: this.inputValue, showDetails: this.showDetails });
        if (DEBUG_WARN) console.warn(ret, tab);
        ret
          .then((response) => {
            if (DEBUG_WARN) console.warn("[Panel] Message sent to content script:", response);
          })
          .catch((error) => {
            console.error("[Panel] Error sending message to content script:", error, tab.title);
          });
      }
    }, 50),
    activateTab(tabId) {
      chrome.tabs.update(tabId, { active: true });
    },
    scrollToElement(tabId, matchIdx) {
      chrome.tabs.update(tabId, { active: true });
      chrome.tabs.sendMessage(tabId, { type: "scrollToElement", matchIdx });
    },
    highlightMatch(match) {
      const before = match.text.substring(0, match.index);
      const matchText = match.text.substring(match.index, match.index + match.length);
      const after = match.text.substring(match.index + match.length);
      return `${before}<mark>${matchText}</mark>${after}`;
    }
  },
  created() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (DEBUG_WARN) console.warn("[Panel] Message received:", message);
      if (message.type === "searchResult") {
        if (DEBUG_WARN) console.warn("Result", message.result, "sender", sender);
        if (message.result.length === 0) {
          return;
        }
        this.results.push({ message, sender });
      }
    });
  }
};
</script>

<style>
img.favicon {
  display: inline;
  height: 1em;
  vertical-align: middle;
  margin: 0px 5px;
}
</style>