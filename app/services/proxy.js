const { ipcMain } = require("electron");
const http = require("http");

let proxy;

let intercept = false;
let proxyReqQueue = [];

const proxyRequest = (req, res) => {
    const options = {
        method: req.method,
        headers: req.headers,
    };

    const proxyReq = http.request(req.url, options, (targetRes) => {
        res.writeHead(targetRes.statusCode, targetRes.headers);
        targetRes.pipe(res, {
            end: true,
        });
    });

    req.pipe(proxyReq, {
        end: true,
    });
};

const startProxy = (port = 8080, host = "127.0.0.1") => {
    if (proxy) {
        return;
    }

    proxy = http.createServer((req, res) => {
        proxyReqQueue.push({ req, res });
    });

    proxy.listen({ port, host }, () => {
        console.log("opened server(proxy) on ", proxy.address());
    });
};

const stopProxy = () => {
    if (!proxy) {
        return;
    }

    const address = proxy.address();
    proxy.close(() => {
        console.log("closed server(proxy) on ", address);
        proxy = null;
    });
};

const watchQueue = () => {
    while (proxyReqQueue.length > 0) {
        const { req, res } = proxyReqQueue.shift();
        console.log(new Date(), "[HTTP PROXY]:", req.method, req.url);
        proxyRequest(req, res);
    }

    setTimeout(watchQueue, 500);
};

setTimeout(watchQueue, 1000);

const onIntercept = (enable) => {
    intercept = enable;
};

ipcMain.handle("proxy:start", () => {
    startProxy();
});

ipcMain.handle("proxy:stop", () => {
    stopProxy();
});

ipcMain.handle("proxy:intercept", (event, enable) => {
    onIntercept(enable);
});

module.exports = {
    startProxy,
    stopProxy,
};
