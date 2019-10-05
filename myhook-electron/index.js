const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow} = electron;

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
                mainWindow.show();
            });
        },
    }
}

global.browser = browser;

app.on('ready', ()=>{
    const mainWindow = new BrowserWindow({
        width : 490,
        height : 712,
        webPreferences: {
            nodeIntegration: true
        },
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
        mainWindow.show();
    });
});