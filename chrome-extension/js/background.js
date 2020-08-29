let currentWindow = null;

chrome.browserAction.onClicked.addListener(function(tab) {
    const width = 490;
    const height= 712;
    openWindow('main.html', width, height);
});

chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse){
        if (typeof request.function !== 'undefined'){
            functionCallHandler(request, sender, sendResponse);
            return true;
        }
        return false;
    }
);

const openWindow = (filename, width, height) => {
    const left = parseInt((screen.width/2)-(width/2));
    const top = parseInt((screen.height/2)-(height/2)); 
    chrome.windows.create({
        url: chrome.runtime.getURL(filename),
        type: "popup",
        width: parseInt(width),
        height: parseInt(height),
        left: left, 
        top: top
    });
};

const functionCallHandler = (request, sender, sendResponse) =>{
    switch (request.function) {
        case 'startConnection':
            const host = request.host;
            const port = request.port;
            startConnection(host, port, (response) => {
                if(response === false || currentWindow !== null){
                    return;
                }
                const width = window.screen.availWidth/1.08;
                const height = window.screen.availHeight/1.3;
                openWindow('workspace.html', parseInt(width), parseInt(height));
                currentWindow = {};
                sendResponse(response);
            });
            break;
        case 'stopConnection':
            stopConnection();
            const width = 490;
            const height= 712;
            openWindow('main.html', width, height);
            break;
        case 'terminateTheExtension':
            terminateTheExtension();
            break;
        case 'getData':
            sendResponse(getConnectionDetails());
            break;
        case 'requestDetails':
            sendResponse(requestHistory[request.request_id]);
            break;
        case 'clearRequestHistory':
            clearRequestHistory(request, sendResponse);
            break;
    }
};
