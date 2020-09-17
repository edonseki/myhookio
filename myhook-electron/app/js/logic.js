const browser = global.browser;

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
    browser.runtime.sendMessage({body: false, type: 'status'});
}

const startConnection = (listeningHost, listeningPort, sendResponse) => {
    if (socket == null || !started) {
        try {
            const io = require('socket.io-client');
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
    const headers = response.headers || '';
    delete headers.connection;

    //TODO this should be as an extra setting for the workspace user. For now it will be always performed.
    response.responseText = response.responseText.split(listeningUrl).join(publicSubdomain.substring(0, publicSubdomain.length-1));

    if (typeof headers.location !== 'undefined'){
        headers.location = headers.location.replace(listeningUrl, publicSubdomain);
    }

    const responseBody = {
        id              : requestId,
        headers         : headers,
        response_text   : response.responseText,
        binary_data     : response.binaryData || null,
        status          : response.statusCode,
        status_text     : 'response.status_text'
    };

    responseBody.duration = new Date().getTime() - requestHistory[requestId].local_date.getTime();
    browser.runtime.sendMessage({body: responseBody, type: 'response'});
    socket.emit('onResponse', responseBody);


    //append response to request
    requestHistory[requestId].response = responseBody;
};

const handleBinaryRequest = (request) => {
    const url = listeningUrl + request.path;
    request.local_date = new Date();

    const http = require('http');

    const options = {
        protocol:'http:',
        hostname: listeningUrl.replace('http://',''),
        port: 80,
        path: request.path,
        method: request.method,
        headers: request.headers
    };

    const req = http.request(options, res => {
        let data = []; // List of Buffer objects
        res.responseText = '';
        res.on("data", (chunk) => {
            data.push(chunk); // Append Buffer object
        });
        res.on("end", () => {
            data = Buffer.concat(data);
            res.binaryData = data;
            emitResponseToSocket(request.id, res);
        });
    });

    req.on('error', (error, r,e) => {
        emitResponseToSocket(request.id, {
            id              : request.id,
            headers         : '',
            responseText    : error.errno,
            binaryData      : null,
            statusCode      : 500,
        });
    });

    req.write(request.body || '');
    req.end();
};

const handleRequest = (request) => {
    const url = listeningUrl + request.path;
    request.local_date = new Date();
    browser.runtime.sendMessage({body: request, type: 'request'});
    request.response = {};
    requestHistory[request.id] = request;

    const http = require('http');

    const options = {
        protocol:'http:',
        hostname: listeningUrl.replace('http://',''),
        port: 80,
        path: request.path,
        method: request.method,
        headers: request.headers
    };

    if(typeof request.deleted_headers !== 'undefined'){
        for(let key in request.deleted_headers){
            if (['host', 'referer', 'connection','accept','accept-encoding'].indexOf(key) !== -1){
                continue;
            }
            options.headers[key] = request.deleted_headers[key];
        }
    }

    const req = http.request(options, res => {
        let data = '';

        res.on('data', chunk => {
            data += chunk;
        });
        res.on('end', () => {
            if(typeof data !== 'undefined' &&
                /\ufffd/.test(data) === true){
                //is binary
                handleBinaryRequest(request);
            }else{
                res.responseText = data;
                emitResponseToSocket(request.id, res);
            }
        });
    });

    req.on('error', (error, r,e) => {
        emitResponseToSocket(request.id, {
            id              : request.id,
            headers         : '',
            responseText    : error.errno,
            binaryData      : null,
            statusCode      : 500,
        });
    });

    req.write(request.body || '');
    req.end();
};

const getRequestHistory = (id) => {
    return requestHistory[id];
};

const setRequestHistory = (reqId, data) => {
    requestHistory[reqId] = data;
};

const clearRequestHistory = (request, sendResponseCallback) => {
    requestHistory = {};
    sendResponseCallback({});
};

module.exports = {
    getConnectionDetails : getConnectionDetails,
    startConnection : startConnection,
    stopConnection : stopConnection,
    terminateTheExtension : terminateTheExtension,
    clearRequestHistory : clearRequestHistory,
    getRequestHistory : getRequestHistory,
    setRequestHistory : setRequestHistory
};
