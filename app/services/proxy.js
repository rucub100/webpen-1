const { ipcMain } = require("electron");
const http = require("http");
const url = require("url");

let proxy;

let intercept = false;
let proxyReqQueue = [];
let proxyResQueue = [];
let interceptReqQueue = [];
let interceptResQueue = [];

// #region Functions ----------------------------------------------------------

const startProxy = (address = "127.0.0.1", port = 8080) => {
    if (proxy) {
        return true;
    }

    proxy = http.createServer((req, res) => {
        proxyReqQueue.push({ req, res });
    });

    proxy
        .listen({ host: address, port }, () => {
            console.log("opened server(proxy) on ", proxy.address());
        })
        .on("error", (error) => {
            proxy = null;
            console.error(error);
        });

    return true;
};

const stopProxy = () => {
    if (!proxy) {
        return false;
    }

    const address = proxy.address();
    proxy.close(() => {
        console.log("closed server(proxy) on ", address);
        intercept = false;
        proxyReqQueue = [];
        proxyResQueue = [];
        proxy = null;
    });

    return false;
};

const proxyRequest = (req, res) => {
    const options = {
        method: req.method,
        headers: req.headers,
    };

    const proxyReq = http.request(req.url, options, (targetRes) => {
        proxyResQueue.push({ req, targetRes, res });
    });

    req.pipe(proxyReq, {
        end: true,
    });
};

const _convertRawHeadersToOutgoingHttpHeaders = (rawHeaders) => {
    headers = {};

    for (let i = 0; i < rawHeaders.length; i += 2) {
        headers[rawHeaders[i]] = rawHeaders[i + 1];
    }

    return headers;
};

const proxyRawRequest = (rawRequest, res) => {
    const options = {
        method: rawRequest.method,
        headers: _convertRawHeadersToOutgoingHttpHeaders(rawRequest.rawHeaders),
    };

    const proxyReq = http.request(rawRequest.url, options, (targetRes) => {
        proxyResQueue.push({ rawRequest, targetRes, res });
    });

    proxyReq.end(rawRequest.body);
};

const proxyResponse = (targetRes, res) => {
    res.writeHead(targetRes.statusCode, targetRes.headers);
    targetRes.pipe(res, {
        end: true,
    });
};

const interceptRequest = (req, res) => {
    let body = [];
    req.on("data", (chunk) => {
        body.push(chunk);
    }).on("end", () => {
        body = Buffer.concat(body).toString();
        interceptReqQueue.push({
            rawRequest: {
                method: req.method,
                url: new URL(req.url),
                httpVersion: req.httpVersion,
                rawHeaders: req.rawHeaders,
                body,
                rawTrailers: req.rawTrailers,
            },
            res,
        });
    });
};

const interceptResponse = (targetRes, res) => {
    let body = [];
    targetRes
        .on("data", (chunk) => {
            body.push(chunk);
        })
        .on("end", () => {
            body = Buffer.concat(body).toString();
            interceptResQueue.push({
                rawResponse: {
                    httpVersion: targetRes.httpVersion,
                    statusCode: targetRes.statusCode,
                    statusMessage: targetRes.statusMessage,
                    rawHeaders: targetRes.rawHeaders,
                    body,
                    rawTrailers: targetRes.rawTrailers,
                },
                res,
            });
        });
};

const watchQueue = () => {
    while (
        (interceptResQueue.length > 0 && !intercept) ||
        (interceptReqQueue.length > 0 && !intercept) ||
        proxyResQueue.length > 0 ||
        proxyReqQueue.length > 0
    ) {
        if (interceptResQueue.length > 0 && !intercept) {
            const { rawResponse, res } = interceptResQueue.shift();
            // TODO proxyRawResponse(rawResponse, res);
        } else if (interceptReqQueue.length > 0 && !intercept) {
            const { rawRequest, res } = interceptReqQueue.shift();
            proxyRawRequest(rawRequest, res);
        } else if (proxyResQueue.length > 0) {
            const { req, rawRequest, targetRes, res } = proxyResQueue.shift();
            const url = req ? req.url : rawRequest.url.href;
            console.log(new Date(), "[HTTP PROXY <-]:", url);
            if (intercept) {
                interceptResponse(targetRes, res);
            } else {
                proxyResponse(targetRes, res);
            }
        } else if (proxyReqQueue.length > 0) {
            const { req, res } = proxyReqQueue.shift();
            console.log(new Date(), "[HTTP PROXY ->]:", req.method, req.url);
            if (intercept) {
                interceptRequest(req, res);
            } else {
                proxyRequest(req, res);
            }
        }
    }

    setTimeout(watchQueue, 500);
};

const onIntercept = (enable) => {
    intercept = !!enable;
};

// #endregion

// #region IPC ----------------------------------------------------------------

ipcMain.handle("proxy:status", () => {
    if (proxy) {
        return proxy.address();
    }
});

ipcMain.handle("proxy:start", (event, address, port) => {
    return startProxy(address, port);
});

ipcMain.handle("proxy:stop", () => {
    return stopProxy();
});

ipcMain.handle("proxy:intercept:get", () => {
    return intercept;
});

ipcMain.handle("proxy:intercept", (event, enable) => {
    return onIntercept(enable);
});

// #endregion

setTimeout(watchQueue, 1000);

module.exports = {
    startProxy,
    stopProxy,
};
