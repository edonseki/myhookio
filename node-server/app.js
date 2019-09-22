const express = require('express' );
const uuid = require('uuid');
const ping = require('ping');
const fs = require('fs');
const http = require('http')
const https = require('https')

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

const socketClients = {};
const socketActivity = {};
const responsesWaiting = {};


const clientRequestHandler = (req, res) => {
    //this should be called only when requested from subdomain
    const domainParts = req.headers.host.split('.');

    if (req.originalUrl.indexOf('.well-known') !== -1){
        res.statusCode = 200;
        const code = fs.readFileSync('wll.txt', 'utf8');
        res.send(code);
        return;
    }

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
            method          : req.method,
            origin          : req.socket.remoteAddress
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

const allowedExt = [
    '.js',
    '.ico',
    '.css',
    '.png',
    '.jpg',
    '.woff2',
    '.woff',
    '.ttf',
    '.svg',
];

//handle main point
app.get('/', (req, res) => {
    const domainParts = req.headers.host.split('.');
    if (domainParts.length >= 3 && domainParts[0] !== 'www') {
        clientRequestHandler(req, res);
    }else{
        if (allowedExt.filter(ext => req.url.indexOf(ext) > 0).length > 0) {
            const safeSuffix = 'public/' + path.normalize(req.url).replace(/^(\.\.(\/|\\|$))+/, '');

            res.sendFile(path.join(__dirname, safeSuffix));
        } else {
            res.sendFile(path.join(__dirname,'public/index.html'));
        }
    }
})

app.get('/url-check', (req, res) => {
    if (typeof req.query.url === 'undefined'){
        res.send({alive: true});
        return;
    }

    if(req.query.url === 'localhost'){
        res.send({alive: false});
        return;
    }

    const cfg = {
        timeout: 10,
        // WARNING: -i 2 may not work in other platform like window
        extra: ["-i 2"],
    };

    ping.sys.probe(req.query.url , function(isAlive){
        res.send({alive: isAlive});
    }, cfg);
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

const serverOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/myhook.io/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/myhook.io/fullchain.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/myhook.io/fullchain.pem')
};

//redirect http to https
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);

const server = https.createServer(serverOptions, app).listen(443);
const io = require('socket.io')(server);
console.log('Server started at: {host}');

io.on('connection', (socket) => {
    let subdomain = null;

    while (subdomain == null) {
        const tempSubdomain = generateRandomString(8);
        if (typeof socketClients[tempSubdomain] === 'undefined') {
            subdomain = tempSubdomain;
        }
    }

    socketClients[subdomain] = socket;
    socketActivity[subdomain]= new Date().getTime();
    subdomain = 'https://'+subdomain+'.myhook.io/';
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