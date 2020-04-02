const urllib = require('urllib');
const fs = require('fs');
const path = require('path');

var _axios = null;
var _ws = null;
var _basepath = null;

function _getConfig() {
    return new Promise((resolve) => {
        fs.readFile(path.join(__dirname, "axisCameraPlugin.json"), (err, data) => {
            resolve(JSON.parse(data.toString()));
        });
    });
}

function _writeConfig(config) {
    fs.writeFile(path.join(__dirname, "axisCameraPlugin.json"), JSON.stringify(config), (err) => {
        if (err) {
            console.error("Write Config", err);
        }
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
            });
    });
}

module.exports = {
    init: (config) => {
        _axios = config.axios;
        _ws = config.ws;
        _basepath = config.basepath;
    },

    getCamera: (lock) => {
        return new Promise(resolve => {
            _getConfig().then(conf => {
                let cam = conf.cam[lock.ip];
                if (cam != null) {
                    _fetchDigest(`${cam.url}/jpg/image.jpg`, cam.auth).then(data => resolve(data));
                } else {
                    resolve();
                }
            });
        });
    },

    getLiveCamUrl: (lock) => {
        return new Promise(resolve => {
            _getConfig().then(conf => {
                let cam = conf.cam[lock.ip];
                if (cam != null) {
                    let url = cam.url.replace("://", `://${cam.auth}@`);
                    resolve(`${url}/mjpg/video.mjpg`);
                } else {
                    resolve();
                }
            });
        });
    }
}
