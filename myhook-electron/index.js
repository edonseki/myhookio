const electron = require('electron');
const url = require('url');
const path = require('path');
const config = require('./package');
const https = require('https');
const open = require('open');
const fs = require('fs');

const {app, BrowserWindow, Menu, dialog} = electron;

const browser = {
    appOnMessageCallbacks : [],
    runtimeOnMessageCallbacks : [],
    app : {
        sendMessage : (data , callback) => {
            if (typeof this.appOnMessageCallbacks === 'undefined'){
                this.appOnMessageCallbacks = [];
            }
            for(let cb of this.appOnMessageCallbacks){
                cb(data, this, callback);
            }
        },
        onMessage : {
            addListener : (callback) => {
                if (typeof this.appOnMessageCallbacks === 'undefined'){
                    this.appOnMessageCallbacks = [];
                }
                this.appOnMessageCallbacks.push(callback);
            }
        },
    },
    runtime : {
        onMessage : {
            addListener : (callback) => {
                if (typeof this.runtimeOnMessageCallbacks === 'undefined'){
                    this.runtimeOnMessageCallbacks = [];
                }
                this.runtimeOnMessageCallbacks.push(callback);
            }
        },
        sendMessage : (data , callback) => {
            if (typeof this.runtimeOnMessageCallbacks === 'undefined'){
                this.runtimeOnMessageCallbacks = [];
            }
            for(let cb of this.runtimeOnMessageCallbacks){
                cb(data, this, callback);
            }
        },
    },
    window : {
        create : (options) => {
            const mainWindow = new BrowserWindow({
                width : options.width,
                height : options.height,
                webPreferences: {
                    nodeIntegration: true,
                    enableRemoteModule: true
                },
                show: false,
                icon: path.join(__dirname, 'assets/icons/png/64x64.png')
            });
            mainWindow.loadURL(url.format(
                {
                    pathname: path.join(__dirname, 'app/'+options.url),
                    protocol: 'file:',
                    slashes : true
                }
            ));

            mainWindow.webContents.on('did-finish-load', function() {
                const menu = Menu.buildFromTemplate([
                    {
                        label: 'Quit',
                    }
                ]);
                Menu.setApplicationMenu(menu);
                Menu.setApplicationMenu(null);
                Menu.setApplicationMenu(null);
                mainWindow.show();
            });
        },
    }
};

const checkForUpdate = () => {
    const checkUrl = config.customConfig.mainDomain + 'version-check?v='+config.version;
    https.get(checkUrl, (res) => {
        res.on('data', (d) => {
            try{
                const response = JSON.parse(d.toString());
                if(typeof response.hasUpdate !== 'undefined' &&
                    typeof response.updateUrl !== 'undefined' &&
                    typeof response.newVersion !== 'undefined' &&
                    response.hasUpdate === true){
                    const options  = {
                        buttons: ["Yes","No"],
                        message: "New version "+response.newVersion+" available. Do you want to download the new version?"
                    }
                    const resp = dialog.showMessageBoxSync(options);
                    if(resp === 0){
                        open(response.updateUrl);
                    }
                }
            }catch (e) {

            }
        });
    }).on('error', ()=>{});
};

global.browser = browser;

function getConnectionFromTemp() {
    const filePath = path.join(app.getPath("temp"), 'myhook-connection-dt.json') ;
    if(!fs.existsSync(filePath)){
        return undefined;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const connectionDetails = JSON.parse(content);

    if(typeof connectionDetails !== 'undefined' &&
    typeof connectionDetails.host !== 'undefined' &&
    typeof connectionDetails.port !== 'undefined'){
        fs.unlinkSync(filePath);
        return  connectionDetails;
    }

    return undefined;
}

app.on('ready', ()=>{
    global.screenWidth = electron.screen.getPrimaryDisplay().size.width;
    global.screenHeight = electron.screen.getPrimaryDisplay().size.height;

    const initConnection = getConnectionFromTemp();
    if(typeof initConnection !== 'undefined'){
        const appLogic = require('./app/js/logic');
        appLogic.startConnection(initConnection.host, initConnection.port, (response) => {
            require('./app/js/background');
            const width = global.screenWidth/1.08;
            const height = global.screenHeight/1.3;
            const left = parseInt((global.screenWidth/2)-(width/2));
            const top = parseInt((global.screenHeight/2)-(height/2));
            browser.window.create({
                url: 'workspace.html',
                type: "popup",
                width: parseInt(width),
                height: parseInt(height),
                left: left,
                top: top
            });
        });
        return;
    }
    checkForUpdate();
    const mainWindow = new BrowserWindow({
        width : 490,
        height : 712,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        },
        title: "MyHook",
        show: false,
        icon: path.join(__dirname, 'assets/icons/png/64x64.png')
    });

    require('./app/js/background.js');

    mainWindow.loadURL(url.format(
        {
            pathname: path.join(__dirname, 'app/main.html'),
            protocol: 'file:',
            slashes : true
        }
    ));

    mainWindow.webContents.on('did-finish-load', function() {
        const menu = Menu.buildFromTemplate([
            {
                label: 'Quit',
                // Other code removed for brevity
            }
        ]);
        Menu.setApplicationMenu(menu);
        Menu.setApplicationMenu(null);
        mainWindow.show();
    });
});
