chrome.browserAction.onClicked.addListener(function(tab) {
    const width = window.screen.availWidth/1.3;
    const height = window.screen.availHeight/1.3;
    window.open(chrome.extension.getURL('main.html'), "myhook", "width="+width+",height="+height);
});