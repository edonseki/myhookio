let started = false;
let startedAt = null;
let socket  = null;
let listeningUrl = null;
let publicSubdomain = null;
const wssUrl = 'https://myhook.io';
let requestHistory = {};

const getConnectionDetails = () => {
    return {
        listeningUrl    : listeningUrl,
        publicSubdomain : publicSubdomain,
        requestHistory  : requestHistory,
    };
};

const connectionErrorCallback = () => {
    chrome.runtime.sendMessage({body: false, type: 'status'});
}

const startConnection = (listeningHost, listeningPort, sendResponse) => {
    if (socket == null || !started) {
        try {

            socket = io.connect(wssUrl, {
                upgrade: false, transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: 2000,                  //starts with 2 secs delay, then 4, 6, 8, until 60 where it stays forever until it reconnects
                reconnectionDelayMax : 86400000,             //24 hours maximum delay between connections
                timeout : 10000,
            });
            socket.on("disconnect", connectionErrorCallback);
            socket.on("connect_failed", connectionErrorCallback);
            socket.on("connect_error", connectionErrorCallback);
            socket.on('onSubdomainPrepared', (subdomain) => {
                started = true;
                publicSubdomain = subdomain;
                startedAt = new Date();
                if (typeof sendResponse !== 'undefined') {
                    sendResponse({
                        code: 200
                    });
                }
            });
            socket.on('onSsPrepared', (ss) => {
                socket.io.opts.query = 'ss=' + ss;
            });
            socket.on('onRequest', handleRequest);
            const port = listeningPort == '80' ? '' : ':'+listeningPort;
            listeningUrl = 'http://'+listeningHost+port;
        }catch (e){
            sendResponse({});
        }
    }else{
        sendResponse({});
    }
};

const stopConnection = (sendResponse) => {
    if (socket !== null && started){
        socket.disconnect();
        socket = null;
        started = false;
        listeningUrl = null;
        publicSubdomain = null;
        requestHistory = {};
        if (typeof sendResponse !== 'undefined') {
            sendResponse({
                code: 200
            });
        }
    }
};

const terminateTheExtension = (sendResponse) => {
    currentWindow = null;
    stopConnection();

    if(typeof sendResponse !== 'undefined'){
        sendResponse({status: 200});
    }
};

const emitResponseToSocket = (requestId, response) => {
    const unpreparedHeaders = response.getAllResponseHeaders().split("\r\n");
    const headers = {};

    for(let i=0; i<unpreparedHeaders.length; i++){
        const currentHeaderString = unpreparedHeaders[i];
        const splitIdx      = currentHeaderString.indexOf(':');
        const headerKey     = currentHeaderString.substring(0, splitIdx);
        const headerValue   = currentHeaderString.substring(splitIdx+2);
        headerKey.trim().length == 0 || (headers[headerKey] = headerValue);
    }

    //TODO this should be as an extra setting for the workspace user. For now it will be always performed.
    response.responseText = response.responseText.split(listeningUrl).join(publicSubdomain.substring(0, publicSubdomain.length-1));

    const responseBody = {
        id              : requestId,
        headers         : headers,
        response_text   : response.responseText,
        binary_data     : response.binaryData || null,
        status          : response.status,
        status_text     : response.status_text
    };

    let duration = new Date().getTime()-requestHistory[requestId].local_date.getTime();
    responseBody.duration = duration;
    chrome.runtime.sendMessage({body: responseBody, type: 'response'});

    //append response to request
    requestHistory[requestId].response = responseBody;

    socket.emit('onResponse', responseBody);
};

const handleBinaryRequest = (request) => {
    const url = listeningUrl + request.path;
    request.local_date = new Date();

    requestHistory[request.id] = request;
    $.ajax({
        url: url,
        headers: request.headers,
        method: request.method,
        xhrFields:{
            responseType: 'blob'
        },
        data: request.body,
        success: async (dt,status,response) => {
            if (dt instanceof Blob){
                const arrayBuffer = await dt.arrayBuffer();
                const responseText = new TextDecoder().decode(arrayBuffer);
                response.responseText = responseText;
                response.binaryData = arrayBuffer;
            }else{
                response.responseText = '';
                response.binaryData = null;
            }
            emitResponseToSocket(request.id, response);
        },
        error: (response, status, error) => {
            response.responseText = error;
            emitResponseToSocket(request.id, response);
        }
    });
};

const handleRequest = (request) => {
    const url = listeningUrl + request.path;
    request.local_date = new Date();
    chrome.runtime.sendMessage({body: request, type: 'request'});
    requestHistory[request.id] = request;

    $.ajax({
        url: url,
        headers: request.headers,
        method: request.method,
        data: request.body,
        success: (a1,status,response) => {
            if(typeof response.responseText !== 'undefined' &&
                /\ufffd/.test(response.responseText ) === true){
                //is binary
                handleBinaryRequest(request);
            }else{
                emitResponseToSocket(request.id, response);
            }
        },
        error: (response, status, error) => {
            emitResponseToSocket(request.id, response);
        }
    });
};

const clearRequestHistory = (request, sendResponseCallback) => {
    requestHistory = {};
    sendResponseCallback({});
};
