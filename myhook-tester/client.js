const https = require('https');

const method = Client.prototype;

let ALL_ID = 0;

function Client() {
    this.id = ALL_ID;
    ALL_ID++;
    this.subdomain = null;
    this.requestsCount = 0;
    this.socket = null;
}

method.isReady = function() {
    return this.subdomain != undefined;
}

method.connect = function() {
    const wssUrl = 'https://myhook.io';
    const socket = require('socket.io-client')(wssUrl,  {
        reconnection: true,
        reconnectionDelay: 2000,                  //starts with 2 secs delay, then 4, 6, 8, until 60 where it stays forever until it reconnects
        reconnectionDelayMax : 86400000,             //1 minute maximum delay between connections
        reconnectionAttempts: "Infinity",         //to prevent dead clients, having the user to having to manually reconnect after a server restart.
        timeout : 10000,                           //before connect_error and connect_timeout are emitted.
        transports : ["websocket"]                //forces the transport to be only websocket. Server needs to be setup as well/

    });
    const clientId = this.id;
    let requestCount = 0;
    const instance = this;
    socket.on("connect_failed", (e,i) => {console.log('Connection for '+this.id+' failed...' + e +' --> '+i);});
    socket.on("connect_error",  (e,i) => {console.log('Connection for '+this.id+' failed...' + e +' --> '+i);});
    socket.on('disconnect', (e, i) => {console.log(clientId+ ' disconnected '+e+' -- '+i)});
    socket.on('onSubdomainPrepared', (subdomain) => {
        //console.log('Subdmoain ['+subdomain+'] prepared for client '+this.id)
        this.subdomain = subdomain;
        instance.startRequests();
    });
    socket.on('onRequest', (request) => {
        requestCount +=1;
        //console.log('Client '+clientId+' new request ['+request.id+']...');
        setTimeout(function () {
            const responseBody = {
                id              : request.id,
                headers         : [],
                response_text   : 'testing text',
                status          : 200,
                status_text     : 'OK'
            };


            socket.emit('onResponse', responseBody);
            console.log('Client '+clientId+' processed '+requestCount+'/50.');

            if (requestCount >= 50){
                console.log(requestCount + " performed for client "+clientId);
                console.log("Closing connection for "+clientId);
                socket.disconnect();
            }else{
                instance.startRequests();
            }
        }, 500);

    })
}

method.startRequests = function()  {
    https.get(this.subdomain+"?key=1&key2=2&key3=3", ()=>{}).on("error", (err) => {
        console.log("Error for client "+this.id+": " + err.message);
    });
}

module.exports = Client;
