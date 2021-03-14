const forge = require("node-forge");
const fs = require("fs");

let _keys;
let _caCert;

const _getKeys = () => {
    if (!_keys) {
        try {
            const keys = JSON.parse(fs.readFileSync("webpen.key", "utf8"));
            _keys = {
                publicKey: forge.pki.publicKeyFromPem(keys.publicKey),
                privateKey: forge.pki.privateKeyFromPem(keys.privateKey),
            };
        } catch (error) {
            _keys = forge.pki.rsa.generateKeyPair(4096);
            const keys = JSON.stringify({
                publicKey: forge.pki.publicKeyToPem(_keys.publicKey),
                privateKey: forge.pki.privateKeyToPem(_keys.privateKey),
            });

            fs.writeFile("webpen.key", keys, { encoding: "utf8" }, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log("New key file created!");
                }
            });
        }
    }

    return _keys;
};

_getKeys();

const _getCACert = () => {
    if (!_caCert) {
        try {
            const caCert = fs.readFileSync("webpen_ca.pem", "utf8");
            _caCert = forge.pki.certificateFromPem(caCert);
        } catch (error) {
            const keys = _getKeys();
            const caCert = forge.pki.createCertificate();

            caCert.publicKey = keys.publicKey;
            caCert.serialNumber = "01";
            caCert.validity.notBefore = new Date();
            caCert.validity.notAfter = new Date();
            caCert.validity.notAfter.setFullYear(
                caCert.validity.notBefore.getFullYear() + 10
            );

            const attrs = [
                {
                    name: "commonName",
                    value: "Webpen Proxy",
                },
                {
                    name: "countryName",
                    value: "Webpen Proxy",
                },
                {
                    name: "organizationName",
                    value: "Webpen Proxy",
                },
                {
                    shortName: "OU",
                    value: "Webpen Proxy",
                },
            ];

            caCert.setSubject(attrs);
            caCert.setIssuer(attrs);

            caCert.setExtensions([
                {
                    name: "basicConstraints",
                    cA: true,
                },
                {
                    name: "keyUsage",
                    keyCertSign: true,
                    digitalSignature: true,
                    nonRepudiation: true,
                    keyEncipherment: true,
                    dataEncipherment: true,
                },
                {
                    name: "extKeyUsage",
                    serverAuth: true,
                    clientAuth: true,
                    codeSigning: true,
                    emailProtection: true,
                    timeStamping: true,
                },
                {
                    name: "nsCertType",
                    client: true,
                    server: true,
                    email: true,
                    objsign: true,
                    sslCA: true,
                    emailCA: true,
                    objCA: true,
                },
                {
                    name: "subjectKeyIdentifier",
                },
            ]);

            caCert.sign(keys.privateKey);

            _caCert = caCert;

            const caCertPem = forge.pki.certificateToPem(_caCert);
            fs.writeFile(
                "webpen_ca.pem",
                caCertPem,
                { encoding: "utf8" },
                (err) => {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log("New CA file created!");
                    }
                }
            );
        }
    }

    return _caCert;
};

const _getCert = (domain) => {
    const keys = _getKeys();
    const caCert = _getCACert();
    const cert = forge.pki.createCertificate();

    cert.publicKey = forge.pki.rsa.generateKeyPair(2048).publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
        cert.validity.notBefore.getFullYear() + 1
    );

    const attrs = [
        {
            name: "commonName",
            value: domain,
        },
        {
            name: "countryName",
            value: "Webpen Proxy",
        },
        {
            name: "organizationName",
            value: "Webpen Proxy",
        },
        {
            shortName: "OU",
            value: "Webpen Proxy",
        },
    ];

    cert.setSubject(attrs);
    cert.setIssuer(caCert.subject.attributes);

    cert.setExtensions([
        {
            name: "keyUsage",
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true,
        },
        {
            name: "extKeyUsage",
            serverAuth: true,
            clientAuth: true,
            codeSigning: true,
            emailProtection: true,
            timeStamping: true,
        },
        {
            name: "nsCertType",
            client: true,
            server: true,
            email: true,
            objsign: true,
        },
        {
            name: "subjectKeyIdentifier",
        },
    ]);

    cert.sign(keys.privateKey);

    return cert;
};

const getCAPem = () => {
    const caCert = _getCACert();

    // convert a Forge certificate to PEM
    const pem = forge.pki.certificateToPem(caCert);

    return pem;
};

const getCAPrivateKeyPem = () => {
    const key = _getKeys().privateKey;
    return forge.pki.privateKeyToPem(key);
};

const getPem = (domain) => {
    const cert = _getCert(domain);
    return forge.pki.certificateToPem(cert);
};

module.exports = {
    getCAPrivateKeyPem,
    getCAPem,
    getPem,
};
