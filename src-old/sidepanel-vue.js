
new Vue({
    el: '#app',
    data: {
        inputValue: '',
        showDetails: false,
        messages: [],
        DEBUG_WARN: false
    },
    methods: {
        debounce(func, wait) {
            let timeout;
            let block = false;
            return function (...args) {
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
        },
        onInput: function () {
            this.debounce(async () => {
                if (this.DEBUG_WARN) console.warn("[Panel] input event fired");
                chrome.storage.local.set({ input: this.inputValue });
                const tabs = await chrome.tabs.query({});
                document.querySelector("#result").innerHTML = "";
                for (const tab of tabs) {
                    if (this.DEBUG_WARN) console.warn("[Panel] Sending message to content script:", tab.id, tab.windowId, tab.index, tab.title);
                    const ret = chrome.tabs.sendMessage(tab.id, { type: "inputChanged", value: this.inputValue, showDetails: this.showDetails });
                    if (this.DEBUG_WARN) console.warn(ret, tab);
                    ret
                        .then((response) => {
                            if (this.DEBUG_WARN) console.warn("[Panel] Message sent to content script:", response);
                        })
                        .catch((error) => {
                            console.error("[Panel] Error sending message to content script:", error, tab.title);
                        });
                }
            }, 50)();
        },
        activateTab(tabId) {
            chrome.tabs.update(tabId, { active: true });
        },
        scrollToElement(tabId, matchIdx) {
            chrome.tabs.sendMessage(tabId, { type: "scrollToElement", matchIdx });
        },
        highlightMatch(r) {
            const before = r.text.substring(0, r.index);
            const match = r.text.substring(r.index, r.index + r.length);
            const after = r.text.substring(r.index + r.length);
            return `${before}<mark>${match}</mark>${after}`;
        }
    },
    created() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (this.DEBUG_WARN) console.warn("[Panel] Message received:", message);
            if (message.type === "searchResult") {
                if (this.DEBUG_WARN) console.warn("Result", message.result, "sender", sender);
                if (message.result.length === 0) {
                    return;
                }
                this.messages.push({ result: message.result, sender });
            }
        });
    }
});