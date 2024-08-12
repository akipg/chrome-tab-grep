var DEBUG_WARN = false;

// Debounce function
function debounce(func, wait) {
  let timeout;
  let block = false;
  return function(...args) {
    if(block){
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        block = false;
        func.apply(this, args);
      }, wait);
    }
    else {
      clearTimeout(timeout);
      func.apply(this, args);
      block = true;
    }
    
  };
}

document.querySelector("#input").addEventListener("input", debounce(async function () {
  if(DEBUG_WARN) console.warn("[Panel] input event fired");
  chrome.storage.local.set({ input: this.value });
  const showDetails = document.querySelector("#showdetails").checked;
  const inputValue = this.value;
  // const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabs = await chrome.tabs.query({});
  document.querySelector("#result").innerHTML = "";
  for(const tab of tabs){
    if(DEBUG_WARN) console.warn("[Panel] Sending message to content script:", tab.id, tab.windowId, tab.index, tab.title);
    const ret = chrome.tabs.sendMessage(tab.id, { type: "inputChanged", value: inputValue, showDetails });
    if(DEBUG_WARN) console.warn(ret, tab);
    ret
      .then((response) => {
        if(DEBUG_WARN) console.warn("[Panel] Message sent to content script:", response);
      })
      .catch((error) => {
        console.error("[Panel] Error sending message to content script:", error, tab.title);
      });
  }
}, 50));


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(DEBUG_WARN) console.warn("[Panel] Message received:", message);
  if (message.type === "searchResult") {
    if(DEBUG_WARN) console.warn("Result", message.result, "sender", sender);
    // Handle the message as needed

    if(message.result.length === 0){
      return;
    }

    const showDetails = document.querySelector("#showdetails").checked;

    let div = document.createElement("div");
    document.querySelector("#result").appendChild(div);
    const result = message.result;
    // div.innerHTML = `<code><pre>${JSON.stringify(sender, null, 2)}</pre></code>`
    // div.innerHTML = `<code><pre>${JSON.stringify(message, null, 2)}</pre></code>`
    // div.innerHTML = `${sender.tab.title} - ${result.matched ? "Match found" : "No match found"}`;

    {
      let p = document.createElement("p");
      let favicon = document.createElement("img");
      favicon.classList.add("favicon");
      // favicon.src = `chrome://favicon/${sender.tab.url}`;
      favicon.src = `${sender.tab.favIconUrl}`;
      let tabTitle = document.createElement("span");
      tabTitle.textContent = sender.tab.title;
      p.appendChild(favicon);
      p.appendChild(tabTitle);
      div.appendChild(p);

      p.onclick = ((tabId) => () => {
        chrome.tabs.update(tabId, { active: true });
      })(sender.tab.id);
    }
    
    {
      if(showDetails){
        let ul = document.createElement("ul");
        let matchIdx = 0;
        for(const r of result){
          let li = document.createElement("li");
          const before = r.text.substring(0, r.index);
          const match = r.text.substring(r.index, r.index + r.length);
          const after = r.text.substring(r.index + r.length);
          li.innerHTML = `${before}<mark>${match}</mark>${after}`;
          function scrollToElement(tabId, matchIdx){
            chrome.tabs.sendMessage(tabId, { type: "scrollToElement", matchIdx});
          }
          li.onclick = ((tabId, matchIdx) => () => {
            console.log("clicked", tabId, matchIdx);
            chrome.tabs.update(tabId, { active: true }); 
            chrome.tabs.sendMessage(tabId, { type: "scrollToElement", matchIdx});
          })(sender.tab.id, matchIdx);
          ul.appendChild(li);

          matchIdx++;
        }
        div.appendChild(ul);
      }
    }
  

  }

});