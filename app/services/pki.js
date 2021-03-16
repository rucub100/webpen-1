const forge = require("node-forge");
const fs = require("fs");

let _keys;
let _caCert;
const _pems = new Map();

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
            caCert.serialNumber = Date.now()
                .toString(16)
                .replace(/(..)/g, "$1:")
                .slice(0, -2);
            caCert.validity.notBefore = new Date();
            caCert.validity.notAfter = new Date();
            caCert.validity.notAfter.setFullYear(
                caCert.validity.notBefore.getFullYear() + 10
            );

            const attrs = [
                {
                    name: "countryName",
                    value: "Webpen Proxy",
                },
                {
                    shortName: "ST",
                    value: "Webpen Proxy",
                },
                {
                    name: "localityName",
                    value: "Webpen Proxy",
                },
                {
                    name: "organizationName",
                    value: "Webpen Proxy",
                },
                {
                    shortName: "OU",
                    value: "Webpen Proxy CA",
                },
                {
                    name: "commonName",
                    value: "Webpen Proxy CA",
                },
            ];

            caCert.setSubject(attrs);
            caCert.setIssuer(attrs);

            caCert.setExtensions([
                {
                    name: "basicConstraints",
                    cA: true,
                },
            ]);

            caCert.sign(keys.privateKey, forge.md.sha256.create());

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
    const dnsl = domain.split(".");
    const nDomain =
        dnsl.length >= 2
            ? dnsl.slice(Math.max(dnsl.length - 2, 0)).join(".")
            : domain;
    const domainDns = domain !== nDomain ? [{ type: 2, value: domain }] : [];

    const keys = _getKeys();
    const caCert = _getCACert();
    const cert = forge.pki.createCertificate();
    const keyPair = forge.pki.rsa.generateKeyPair(2048);

    cert.publicKey = keyPair.publicKey;
    cert.serialNumber = Date.now()
        .toString(16)
        .replace(/(..)/g, "$1:")
        .slice(0, -2);
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
        cert.validity.notBefore.getFullYear() + 1
    );

    const attrs = [
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
            value: "Webpen Proxy CA",
        },
        {
            name: "commonName",
            value: domain,
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
            name: "subjectAltName",
            altNames: [
                ...domainDns,
                {
                    type: 2, // DNS
                    value: nDomain,
                },
                {
                    type: 2, // DNS (2)
                    value: `*.${nDomain}`,
                },
            ],
        },
        {
            name: "subjectKeyIdentifier",
        },
    ]);

    cert.sign(keys.privateKey, forge.md.sha256.create());

    return { cert: cert, key: keyPair.privateKey };
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
    if (_pems.has(domain)) {
        return _pems.get(domain);
    }

    const { cert, key } = _getCert(domain);
    const pem = {
        cert: forge.pki.certificateToPem(cert),
        key: forge.pki.privateKeyToPem(key),
    };

    _pems.set(domain, pem);

    return pem;
};

module.exports = {
    getCAPrivateKeyPem,
    getCAPem,
    getPem,
};
