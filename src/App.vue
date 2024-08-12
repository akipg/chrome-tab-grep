<template>
  <div>
    <!-- <h1>grep</h1> -->
    <!-- <hr /> -->
    <div class="search-container">
      <label for="searchContent">Search </label>
      <select v-model="searchContent" disabled>
        <option value="all">All</option>
        <option value="content">Content</option>
        <option value="title">Title</option>
        <option value="url">URL</option>
      </select>
      <label for="searchScope"> in </label>
      <select v-model="searchScope">
        <option value="all">All Tabs</option>
        <option value="currentWindow">Current Window</option>
        <option value="currentTab">Current Tab</option>
      </select>
      <input type="checkbox" v-model="showDetails">
      <label for="showdetails"> Show details</label>
    </div>
    <input type="text" id="input" ref="inputElement" v-model="inputValue" @input="handleInput" placeholder="search text...">
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
      searchScope: "all",
      searchContent: "content",
      results: []
    };
  },
  methods: {
    handleInput: debounce(async function () {
      if (DEBUG_WARN) console.warn("[Panel] input event fired");

      chrome.storage.local.set({ input: this.inputValue });

      if(this.inputValue.trim() === "") {
        this.results = [];
        return;
      }
    
      let tabs;
      if(this.searchScope === "all") {
        tabs = await chrome.tabs.query({});
      } else if(this.searchScope === "currentWindow") {
        tabs = await chrome.tabs.query({ currentWindow: true });
      } else if(this.searchScope === "currentTab") {
        tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      }
      this.results = [];   

      // Search in tabs content
      for (const tab of tabs) {
        if (DEBUG_WARN) console.warn("[Panel] Sending message to content script:", tab.id, tab.windowId, tab.index, tab.title);
        const ret = chrome.tabs.sendMessage(tab.id, 
          {
            type: "inputChanged", 
            value: this.inputValue, 
            showDetails: this.showDetails, 
          }
        );
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

    chrome.storage.local.get(['showDetails', 'searchScope', 'searchContent', 'input'], (result) => {
      if(result.input) {
        this.inputValue = result.input;
      }
      if(result.showDetails) {
        this.showDetails = result.showDetails;
      }
      if(result.searchScope) {
        this.searchScope = result.searchScope;
      }
      if(result.searchContent) {
        this.searchContent = result.searchContent;
      }
    });


    handleInput();
  },
  mounted() {
    this.$refs.inputElement.focus();
  },
  watch: {
    showDetails(newValue) {
      chrome.storage.local.set({ showDetails: newValue });
    },
    searchScope(newValue) {
      chrome.storage.local.set({ searchScope: newValue });
    },
    searchContent(newValue) {
      chrome.storage.local.set({ searchContent: newValue });
    }
  },
};
</script>


<style>
/* Base styles */
:root {
  --font-family: 'Arial', sans-serif;
  --transition-duration: 0.3s;
  --border-radius: 4px;
  --box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Light mode variables */
@media (prefers-color-scheme: light) {
  :root {
    --background-color: #f0f0f5;
    --text-color: #333;
    --primary-color: #4a90e2;
    --secondary-color: #357ab8;
    --border-color: #ddd;
    --input-background-color: #fff;
    --input-text-color: #333;
    --result-background-color: #fff;
    --result-hover-color: #f4f4f9;
  }
}

/* Dark mode variables */
@media (prefers-color-scheme: dark) {
  :root {
    --background-color: #1e1e1e;
    --text-color: #ccc;
    --primary-color: #9cdcfe;
    --secondary-color: #7cb8d9;
    --border-color: #555;
    --input-background-color: #333;
    --input-text-color: #ccc;
    --result-background-color: #2e2e2e;
    --result-hover-color: #444;
  }
}

body {
  font-family: var(--font-family);
  background-color: var(--background-color);
  color: var(--text-color);
  margin: 0;
  padding: 0;
  transition: background-color var(--transition-duration), color var(--transition-duration);
}

h1 {
  font-size: 2em;
  text-align: center;
  margin-top: 20px;
  color: var(--primary-color);
  transition: color var(--transition-duration);
}

hr {
  border: 0;
  height: 1px;
  background-color: var(--border-color);
  margin: 20px 0;
  transition: background-color var(--transition-duration);
}

p {
  margin: 20px;
}

label {
  font-weight: bold;
  margin-right: 10px;
}

input[type="checkbox"] {
  margin-right: 5px;
}

input[type="text"], select {
  /* width: calc(100% - 40px); */
  width: fit-content;
  padding: 10px;
  margin: 20px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background-color: var(--input-background-color);
  color: var(--input-text-color);
  box-shadow: var(--box-shadow);
  transition: background-color var(--transition-duration), color var(--transition-duration), border-color var(--transition-duration);
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: var(--border-radius);
  background-color: var(--primary-color);
  color: #fff;
  cursor: pointer;
  transition: background-color var(--transition-duration);
}

button:hover {
  background-color: var(--secondary-color);
}

#result {
  margin: 20px;
  padding: 20px;
  background-color: var(--result-background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
}

#result p {
  cursor: pointer;
  padding: 10px;
  border-bottom: 1px solid var(--border-color);
  transition: background-color var(--transition-duration);
}

#result p:hover {
  background-color: var(--result-hover-color);
}

#result ul {
  list-style-type: none;
  padding: 0;
}

#result li {
  padding: 5px 0;
  cursor: pointer;
  transition: background-color var(--transition-duration);
}

#result li:hover {
  background-color: var(--result-hover-color);
}

img.favicon {
  display: inline;
  height: 1em;
  vertical-align: middle;
  margin: 0px 5px;
}
.search-container {
  display: flex;
  align-items: center;
  gap: 0px;
  margin: 20px;
}
</style>