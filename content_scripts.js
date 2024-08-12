
console.log("[ContentScript] Content script loaded");
var gResult = [];
const DEBUG = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[ContentScript] Message received from background script:", message);
    if (message.type === "inputChanged") {
        if(DEBUG) console.log("Input value changed to:", message.value);
        // Handle the message as needed
        
        gResult = [];

        function searchTextInPage(searchTerm) {
            // Function to traverse the DOM and find text nodes
            function getTextNodes(node) {
                let textNodes = [];
                if (node.nodeType === Node.TEXT_NODE) {
                    textNodes.push(node);
                } else {
                    for (let child of node.childNodes) {
                        textNodes = textNodes.concat(getTextNodes(child));
                    }
                }
                return textNodes;
            }


            gResult = [];
            function textNodesUnder(el, searchRegExp) {
                const children = []; // Type: Node[]
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
                    acceptNode: function (node) {
                        // Skip text nodes that are children of <style> elements
                        if (node.parentNode && (
                            node.parentNode.nodeName.toLowerCase() === 'style'
                            || node.parentNode.nodeName.toLowerCase() === 'script'
                            || node.parentNode.nodeName.toLowerCase() === 'noscript'
                        )
                        ) {
                            return NodeFilter.FILTER_REJECT;
                        }

                        const match = searchRegExp.exec(node.nodeValue)
                        if (match) {
                            gResult.push({
                                node: node,
                                parent: node.parentNode,
                                text: node.textContent,
                                index: match.index,
                                length: match[0].length
                            });
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        else {
                            return NodeFilter.FILTER_SKIP;
                        }
                    }
                });

                while (walker.nextNode()) {
                    children.push(walker.currentNode);
                }
                return children;
            }

            // Function to check if the text node contains the search term
            function textContainsSearchTerm(node, searchTerm) {
                const regex = new RegExp(searchTerm, 'gi');
                return regex.test(node.textContent);
            }

            // Get all text nodes in the body
            // const textNodes = getTextNodes(document.body);
            // const textNodes = textNodesUnder(document.body);
            // console.log("textNodes", typeof(textNodes), textNodes)

            // // Search for the text
            // nodes = [];
            // for (let node of textNodes) {
            //     console.log("node", node)
            //     if (textContainsSearchTerm(node, searchTerm)) {
            //         nodes.push(node.textContent);
            //     }
            // }

            const searchRegExp = new RegExp(searchTerm, 'gi');
            const foundNodes = textNodesUnder(document.body, searchRegExp);
            // console.log("foundNodes", foundNodes)
            if(DEBUG) console.log("gResult", gResult);

            return gResult;

        }

        const result = searchTextInPage(message.value)
        // const result = searchByXPath(message.value, "a");
        console.log("result", result)
        chrome.runtime.sendMessage({ type: "searchResult", result: result });
    }

    else if(message.type === "scrollToElement") {
        console.log("Scrolling to element", message);
        const matchIdx = parseInt(message.matchIdx);
        const match = gResult[matchIdx];
        console.log("match", match);
        match.parent.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }

});