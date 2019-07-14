const express = require('express' );
const uuid = require('uuid');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

const socketClients = {};
const socketActivity = {};
const responsesWaiting = {};

const clientRequestHandler = (req, res) => {
    //this should be called only when requested from subdomain
    const domainParts = req.headers.host.split('.');
    if (domainParts.length <= 2) {
        res.statusCode = 404;
        res.send('404 Not Found');
        return;
    }

    
    const subdomain = domainParts[0];

    if (typeof socketClients[subdomain] === 'undefined') {
        res.statusCode = 404;
        res.send('404 Not Found'); 
        return;
    }

    socketActivity[subdomain] = new Date().getTime();

    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        const headersToDelete = ['host', 'connection', 'accept-encoding', 'user-agent', 'referer'];

        const request = {
            id              : subdomain+'-'+uuid.v4(),
            headers         : req.headers,
            deleted_headers : {},
            query           : req.query,
            body            : body,
            path            : req.originalUrl,
            method          : req.method
        };

        for (const headerItem in headersToDelete) {
            request.deleted_headers[headersToDelete[headerItem]] = request.headers[headersToDelete[headerItem]];
            delete request.headers[headersToDelete[headerItem]];
        }

        responsesWaiting[request.id] = {
            time     : new Date().getTime(),
            response : res
        };

        socketClients[subdomain].emit('onRequest', request);
    });
}

const generateRandomString = (length) => {
    let text = "";
    let possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
};

//handle main point
app.get('/', (req, res) => {
    const domainParts = req.headers.host.split('.');
    if (domainParts.length >= 3 && domainParts[0] !== 'www') {
        clientRequestHandler(req, res);
    }else{
        res.render('index');
    }
})

app.get('/eki-stats', (req, res) => {
    const stats = {
        connections         : parseInt(Object.keys(socketClients).length),
        responses_waiting   : parseInt(Object.keys(responsesWaiting).length)
    };
    res.send(stats);
})

app.get('*', clientRequestHandler);
app.post('*', clientRequestHandler);
app.put('*', clientRequestHandler);
app.delete('*', clientRequestHandler);


server = app.listen(8283);
const io = require('socket.io')(server);
console.log('Server started at: {host}:8283');

io.on('connection', (socket) => {
    let subdomain = null;

    while (subdomain == null) {
        const tempSubdomain = '69vuv24d';//generateRandomString(8);
        if (typeof socketClients[tempSubdomain] === 'undefined') {
            subdomain = tempSubdomain;
        }
    }

    socketClients[subdomain] = socket;
    socketActivity[subdomain]= new Date().getTime();
    subdomain = 'http://'+subdomain+'.myhook.io/';
    console.log('New connection! Subdomain = '+subdomain);

    const responseHandler = (response) => {
        if (typeof responsesWaiting[response.id] !== 'undefined' ) {
            const waitingResponse = responsesWaiting[response.id].response;

            //default response code is 404 in case the status code from response is not valid
            waitingResponse.statusCode = 404;

            if (typeof response.status !== 'undefined' && parseInt(response.status) > 0){
                waitingResponse.statusCode = response.status;
            }

            const headersToIgnore = ['content-encoding', 'transfer-encoding'];

            for (let headerKey in response.headers ){
                if(headersToIgnore.indexOf(headerKey) !== -1){
                    continue;
                }
                waitingResponse.set(headerKey, response.headers[headerKey]);
            }

            try {
                waitingResponse.send(response.response_text);
            }catch(e){
                console.log(e);
            }

            delete responsesWaiting[response.id];
        }
    };

    socket.on('onResponse', responseHandler);
    socket.emit('onSubdomainPrepared', subdomain);
});


// jobs
// -- response check
const checkPendingRequests = () => {
    for(let requestKey in responsesWaiting){
        const response = responsesWaiting[requestKey].response;
        if (typeof response !== 'undefined'){
            const time = parseInt((new Date().getTime() - response.time)/1000);
            if(time >= 30){
                response.statusCode = 503;
                response.send('Timeout');
                delete responsesWaiting[response.id];
            }
        }
    }
};
console.log('Starting response check job...');
setInterval(checkPendingRequests, 1000);

// -- socket activity check
const checkSocketActivity = () => {
    for(let socketKey in socketActivity){
        const lastActivity = parseInt((new Date().getTime() - socketActivity[socketKey])/1000);
        const minutes = parseInt(lastActivity / 60);
        if(minutes >= 14){
            const socket = socketClients[socketKey];
            socket.disconnect();
            delete socketClients[socketKey]; 
            delete socketActivity[socketKey]; 
            console.log('Subdomain and socket suspended: '+socketKey);
        }
    }
};
console.log('Starting socket activity check job...');
setInterval(checkSocketActivity, 60000);