var started = false;
$("#start_hook").click(() => {
    if (started) {
        socket.disconnect();
        alert('Disconnected');
        window.close();
    }else {
        if($("#host").val().trim().length == 0){
            alert("Host is required");
            return;
        }
        if($("#host_port").val().trim().length == 0){
            alert("Host Port is required");
            return;
        }
        connect();
    }
});
function connect(){
    socket = io.connect('http://www.quickcall.io');

    const host = $("#host").val();
    const port = $("#host_port").val() == '80' ? '' : ':'+$("#host_port").val();

    const localUrl = 'http://'+host+port;

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
        $("#"+requestId+"_status").html("DONE");
        socket.emit('onResponse', responseBody);
    };

    const handleRequest = (request) => {
        const url = localUrl + request.path;

        const currentDateTime = new Date();
        const requestHistoryHtml = requestTemplate
            .split("{{request_id}}").join(request.id)
            .split("{{date_time}}").join(currentDateTime.toLocaleDateString())
            .split("{{http_method}}").join(request.method)
            .split("{{request_url}}").join(url)
            .split("{{status}}").join("IN PROGRESS");
        $("#request_history").append(requestHistoryHtml);
            

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

    
    socket.on('onRequest', (data) => {
        handleRequest(data);
    });

    socket.on('onSubdomainPrepared', (subdomain) => {
        started = true;
        $("#start_hook").html("STOP HOOK");
        $("#remote_url").html(subdomain);
    });
}

const requestTemplate = '<div style="background-color: #ccc; height: 20px; margin-bottom: 10px;">' +
                            '<span>{{date_time}}</span> | {{http_method}} | {{request_url}} | <span id="{{request_id}}_status">{{status}}</span>' +
                        '</div>';