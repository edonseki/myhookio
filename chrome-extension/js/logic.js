let started = false;
let startedAt = null;
let socket  = null;
let listeningUrl = null;
let publicSubdomain = null;
const wssUrl = 'http://myhook.io';

const getConnectionDetails = () => {
    return {
        listeningUrl    : listeningUrl,
        publicSubdomain : publicSubdomain,
    };
};

const startConnection = (listeningHost, listeningPort, sendResponse) => {
    if (socket == null || !started) {
        socket = io.connect(wssUrl);
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
        const port = listeningPort == '80' ? '' : ':'+listeningPort;
        listeningUrl = 'http://'+listeningHost+port;
    }
};

const stopConnection = (sendResponse) => {
    if (socket !== null && started){
        socket.disconnect();
        socket = null;
        started = false;
        if (typeof sendResponse !== 'undefined') {
            sendResponse({
                code: 200
            });
        }
    }
};

const emitResponseToSocket = (requestId, response) => {
    const unpreparedHeaders = response.getAllResponseHeaders().split("\r\n");
    const headers = {};

    for(var i=0; i<unpreparedHeaders.length; i++){
        const currentHeaderString = unpreparedHeaders[i];
        const splitIdx      = currentHeaderString.indexOf(':');
        const headerKey     = currentHeaderString.substring(0, splitIdx);
        const headerValue   = currentHeaderString.substring(splitIdx+2);
        headerKey.trim().length == 0 || (headers[headerKey] = headerValue);
    }

    const responseBody = {
        id              : requestId,
        headers         : headers,
        response_text   : response.responseText,
        status          : response.status,
        status_text     : response.status_text
    };
    //-- send response  $("#"+requestId+"_status").html("DONE");
    socket.emit('onResponse', responseBody);
};

const handleRequest = (request) => {
    const url = localUrl + request.path;

    const currentDateTime = new Date();
    /*const requestHistoryHtml = requestTemplate
        .split("{{request_id}}").join(request.id)
        .split("{{date_time}}").join(currentDateTime.toLocaleDateString())
        .split("{{http_method}}").join(request.method)
        .split("{{request_url}}").join(url)
        .split("{{status}}").join("IN PROGRESS");
    $("#request_history").append(requestHistoryHtml);*/


    $.ajax({
        url: url,
        headers: request.headers,
        method: request.method,
        data: request.body,
        success: (a1,status,response) => {
            emitResponseToSocket(request.id, response);
        },
        error: (response, status, error) => {
            emitResponseToSocket(request.id, response);
        }
    });
};
