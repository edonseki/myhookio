chrome.browserAction.onClicked.addListener(function(tab) {
    window.open(chrome.extension.getURL('main.html'), "myhook", "width=800,height=800");
});