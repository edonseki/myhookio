const Client = require('./client');

console.log("starting the stress test for https://myhook.io...");


const maxClients = 300;

let clients = [];

for (let i = 0; i<maxClients; i++){
    const cl = new Client();
    cl.connect();
    clients.push(cl);
}

let tried = 0;
startConnections();

function startConnections(){
    tried += 1;
    let ready = true;
    let readyCount = 0;
    for (let i = 0; i<maxClients; i++){
        if (!clients[i].isReady()){
            ready = false;
        }else{
            readyCount++;
        }
    }


    console.log((readyCount)+' prepared and ready to start ...');

    if (ready || tried >= 45){
        //start all
        for (let i = 0; i<maxClients; i++){
            if (clients[i].isReady()) {
                clients[i].startRequests();
            }
        }
        return;
    }

    console.log('trying in two seconds...');
    setTimeout(function () {
        startConnections();
    },2000);
}
