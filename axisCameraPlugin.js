const urllib = require('urllib');
const fs = require('fs');
const path = require('path');


const _baseConfig = {
    cred: { username: "", password: "" },
    proto: "http",
    hostSuffix: "",
    mapping: { offset: 1 },
    imagePath: "/jpg/image.jpg",
    videoPath: "/mjpg/video.mjpg",
    imageInterval: 5000
};

var _axios = null;
var _ws = null;
var _basepath = null;

function _getConfig() {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, "axisCameraPlugin.json"), (err, data) => {
            if (err) {
                //console.warn("[WARN] AXIS CameraPlugin FetchConfig", err);
                resolve(_baseConfig);
            } else {
                resolve(JSON.parse(data.toString()));
            }
        });
    });
}

function _fillCamera(conf, lock) {
    return new Promise(accept => {
        let camera = {}
        camera.cred = conf.cred;
        camera.proto = conf.proto;
        camera.hostSuffix = conf.hostSuffix;
        camera.imagePath = conf.imagePath;
        camera.videoPath = conf.videoPath;
        camera.imageInterval = conf.imageInterval;

        let ipSegs = lock.ip.split(".");
        ipSegs[3] = parseInt(ipSegs[3]) + conf.mapping.offset;
        camera.host = ipSegs.join(".");

        if (conf.mapping[lock.ip] != undefined) {
            let mapping = conf.mapping[lock.ip];
            if (mapping.host != undefined) {
                camera.host = mapping.host;
            }
            if (mapping.cred != undefined) {
                camera.cred = mapping.cred;
            }
            if (mapping.proto != undefined) {
                camera.proto = mapping.proto;
            }
            if (mapping.hostSuffix != undefined) {
                camera.hostSuffix = mapping.hostSuffix;
            }
            if (mapping.imagePath != undefined) {
                camera.imagePath = mapping.imagePath;
            }
            if (mapping.videoPath != undefined) {
                camera.videoPath = mapping.videoPath;
            }
            if (mapping.imageInterval != undefined) {
                camera.imageInterval = mapping.imageInterval;
            }
        }

        camera.url = `${camera.proto}://${camera.host}${camera.hostSuffix}`;
        accept(camera);
    });
}

function _fetchDigest(url, auth) {
    return new Promise(resolve => {
        urllib.request(url, { digestAuth: auth })
            .then((res) => {
                //console.log(res);
                resolve(res.data);
            })
            .catch(err => {
                console.error(err);
                resolve();
            });
    });
}

module.exports = {
    init: (config) => {
        _axios = config.axios;
        _ws = config.ws;
        _basepath = config.basepath;
    },

    name: () => "axisCameraPlugin",

    getImage: (lock) => {
        return new Promise(resolve => {
            _getConfig().then(conf => {
                _fillCamera(conf, lock).then(cam => {
                    if (cam != null) {
                        _fetchDigest(`${cam.url}${cam.imagePath}`, `${cam.cred.username}:${cam.cred.password}`).then(data => resolve(data));
                    } else {
                        resolve();
                    }
                }).catch(err =>
                    resolve()
                );
            });
        });
    },

    getLiveCamUrl: (lock) => {
        return new Promise(resolve => {
            _getConfig().then(conf => {
                _fillCamera(conf, lock).then(cam => {
                    if (cam != null) {
                        let url = cam.url.replace("://", `://${cam.cred.username}:${cam.cred.password}@`);
                        resolve(`${url}${cam.videoPath}`);
                    } else {
                        resolve();
                    }
                });
            });
        });
    },

    getImageInterval: (lock) => {
        return new Promise(resolve => {
            _getConfig().then(conf => {
                _fillCamera(conf, lock).then(cam => {
                    resolve(cam.imageInterval);
                })
            })
        })
    },

    getConfig: () => {
        return new Promise(accept => {
            _getConfig().then(conf => {
                accept(conf);
            }).catch(e => {
                accept(_baseConfig);
            });
        });
    },

    writeConfig: (config) => {
        fs.writeFile(path.join(__dirname, "axisCameraPlugin.json"), JSON.stringify(config), (err) => {
            if (err) {
                console.error("Store Config", err);
            }
        });
    },

    getHelp: () => {
        return '\
{\n\
    "cred": {\n\
        "username": "", //globalAxis UserName\n\
        "password": ""  //globalAxis Password\n\
    },\n\
    proto: "http", //ConnectionProtocol\n\
    hostSuffix: "", //Suffix after host of URL (eg ":8443")\n\
    imagePath: "/jpg/image.jpg",\n\
    videoPath: "/mjpg/video.mjpg",\n\
    imageInterval: 5000  //image Rate in ms\n\
    "mapping": {\n\
        "offset": 1  //lockIP Offset (eg 192.168.0.90 + 1 = 192.168.0.91)\n\
        "192.168.0.90":{ //optional manual Mapping for 192.168.0.90\n\
            //the overwrite can contain all previous "baseSettings" (cred, proto, hostSuffix, imagePath, videoPath, imageInterval)\n\
            "cred": { //manual User Overwrite for 192.168.0.90\n\
                "username": "", //globalAxis UserName\n\
                "password": ""  //globalAxis Password\n\
            }\n\
            host: "192.168.1.90 //Manual Host overwrite for 192.168.0.90\n\
            proto: "http",\n\
            hostSuffix: "",\n\
            imagePath: "/jpg/image.jpg",\n\
            videoPath: "/mjpg/video.mjpg",\n\
            imageInterval: 5000\n\
        }\n\
    }\n\
}';
    }
}
