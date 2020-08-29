# MyHook - Expose your local host to the internet
MyHook is a Tool which helps you exposing your local services for your clients, 
teammates and other development tools. Using MyHook you won't need to buy a public 
domain or server for testing or presentation purposes. MyHook will reserve a subdomain 
for you which will be publicly accessible from every device connected on the Internet. 
In a simple workspace, you will be able to monitor every request which comes from your public - to your local hook 
including all request and response details. 

## Steps to run MyHook to your localhost

In order to run MyHook to your local machine or deploy it to your public server you have to follow the steps below:
1. Translate a domain (not real one) to your local IP address. (this step can be skipped in case you use a public domain as you have to handle this to your DNS)
2. Translate a sub domain to your local IP address. (this step can be skipped in case you use a public domain as you have to handle this to your DNS)
3. Run the node server which handles all the communication between MyHook and Clients.
4. Load one of the extensions (Chrome or Firefox) you want to use.
5. Run the electron app if you want to experience the Desktop version and have more access to rewrite HTTP headers on your local service.

## Steps

###### 1. Translate a domain (not real one) to your local IP address

MyHook needs a domain in order to work properly. In your local environment you can translate a dummy domain to your
local IP. Add the line below in your `hosts` file:<br>
`127.0.0.1 yourdummydomain.com`

###### 2. Translate a sub domain to your local IP address.

Every client on MyHook will have their own sub domain which will be their public address for their local service. MyHook generates
random string as subdomains. In order to make your local DNS system to recognize subdomains of `yourdummydomain.com` you have to use
existing tools like `dnsmasq` or any other tool. 

Another simple way to do this is by translating an specific sub domain to your local IP Address. You have to set `useTestSubdomain` (explained below)
to `true` and then add the line below to your hosts:
`127.0.0.1 test.yourdummydomain.com`

###### 3. Run the node server which handles all the communication between MyHook and Clients.

1. Change the directory to `node-server`:`cd node-server`
2. Change your main domain, port, SSL(optional) in `package.json -> config`<br>
    `mainDomain` - the public domain you're using. Example: myhook.io. This domain will be used when serving the sub domain.<br>
    `httpPort` - in case the `useSSL` is false then this port will be used for your service.<br>
    `useTestSubdomain` - determines if the sub domain for the client would be `test.yourdomain.com` or a random string. This should be true
    only if you run MyHook in your local machine as in the public domain the sub domains should be unique.<br>
    `useSSL` - determines if you're going to use SSL or not.<br>
    `sslCerts.key` - the ssl key<br>
    `sslCerts.cert` - the ssl certificate<br>
    `sslCerts.ca` - the CA bundle<br>
3. Install npm dependencies:`npm i`
4. Start the server: `npm run start` or `node app.js`
    
###### 4. Load one of the extensions (Chrome or Firefox) you want to use.

You can use the browser (Chrome or Firefox) extension to test your MyHook Setup. In order yo use the extensions you have
to change a parameter to the extension (Chrome or Firefox).

1. In the file `{extension_path}/js/logic.js` and `{extension_path}/js/main.js` change the domain `https://myhook.io` to this:
`'{your_protocol}://{yourdummydomain.com}';`
2. Go to: `chrome://extensions/` or `about:debugging` page for Firefox
3. For Chrome: Click Load unpacked and select the folder of your extension. For Firefox: Click "Load Temporary Add-on", then 
select any file in your extension's directory.
                                                                                         
###### 5. Run the electron app if you want to experience the Desktop version and have more access to rewrite HTTP headers on your local service.

1. Change the directory to `myhook-electron`:`cd myhook-electron`
2. In the file `index.js`, `app/js/main.js` and `app/js/logic.js` change the domain `https://myhook.io` to this:
`'{your_protocol}://{yourdummydomain.com}';`
3. Install dependencies: `npm i`
4. Run electron app: `electron .`

