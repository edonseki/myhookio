const browser = global.browser;
let currentWindow = null;

const logic = require('./logic');

browser.app.onMessage.addListener(
    function(request, sender, sendResponse){
        if (typeof request.function !== 'undefined'){
            functionCallHandler(request, sender, sendResponse);
            return true;
        }
        return false;
    }
);

const openWindow = (filename, width, height) => {
    const left = parseInt((global.screenWidth/2)-(width/2));
    const top = parseInt((global.screenHeight/2)-(height/2));
    browser.window.create({
        url: filename,
        type: "popup",
        width: parseInt(width),
        height: parseInt(height),
        left: left,
        top: top
    });
};

function functionCallHandler (request, sender, sendResponse){
    switch (request.function) {
        case 'startConnection':
            const host = request.host;
            const port = request.port;

            logic.startConnection(host, port, (response) => {
                if(response === false || currentWindow !== null){
                    return;
                }
                const width = global.screenWidth/1.08;
                const height = global.screenHeight/1.3;
                openWindow('workspace.html', parseInt(width), parseInt(height));
                currentWindow = {};
                sendResponse(response);
            });
            break;
        case 'stopConnection':
            logic.stopConnection();
            const width = 490;
            const height= 712;
            openWindow('main.html', width, height);
            break;
        case 'terminateTheExtension':
            logic.terminateTheExtension();
            break;
        case 'getData':
            sendResponse(logic.getConnectionDetails());
            break;
        case 'requestDetails':
            sendResponse(logic.getRequestHistory(request.request_id));
            break;
        case 'clearRequestHistory':
            logic.clearRequestHistory(request, sendResponse);
            break;
    }
}