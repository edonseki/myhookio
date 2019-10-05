const electron = require('electron');
const url = require('url');
const path = require('path');
const config = require('./package');
const https = require('https');
const open = require('open');

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
                    nodeIntegration: true
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
                Menu.setApplicationMenu(null);
                mainWindow.show();
            });
        },
    }
};

const checkForUpdate = () => {
    const checkUrl = 'https://myhook.io/version-check?v='+config.version;
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

app.on('ready', ()=>{
    checkForUpdate();
    const mainWindow = new BrowserWindow({
        width : 490,
        height : 712,
        webPreferences: {
            nodeIntegration: true
        },
        title: "MyHook",
        show: false,
        icon: path.join(__dirname, 'assets/icons/png/64x64.png')
    });


    global.screenWidth = electron.screen.getPrimaryDisplay().size.width;
    global.screenHeight = electron.screen.getPrimaryDisplay().size.height;

    require('./app/js/background.js');

    mainWindow.loadURL(url.format(
        {
            pathname: path.join(__dirname, 'app/main.html'),
            protocol: 'file:',
            slashes : true
        }
    ));

    mainWindow.webContents.on('did-finish-load', function() {
        Menu.setApplicationMenu(null);
        mainWindow.show();
    });
});
