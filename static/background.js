chrome.commands.onCommand.addListener(async function (command) {
    console.log('Command:', command);
    if (command === "open_side_panel") {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            chrome.sidePanel.open({ tabId: tab.id });
        });
    }
});