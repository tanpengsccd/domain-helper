const crypto = require('crypto');

const acme = require('acme-client');
const {writeFile} = require("node:fs");
const dns = require('dns');
window.xAcme = acme;
window.xDns = dns;
window.xhttps = require('https');
window.xhttp = require('http');
window.xcrypto = crypto
window.xUrl = require('url');
window.xUtil = require('util');

window.xNodeSSH = require('node-ssh');

// 加密函数
function xEncrypt(text, key) {
    // 创建一个随机初始化向量
    const iv = crypto.randomBytes(16);

    // 创建加密器
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

    // 加密文本
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 返回初始化向量和加密文本
    return iv.toString('hex') + ':' + encrypted;
}

// 解密函数
function xDecrypt(encryptedText, key) {
    // 拆分初始化向量和加密文本
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');

    // 创建解密器
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

    // 解密文本
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}


function generateKeyFromPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

window.xEncrypt = xEncrypt;
window.xDecrypt = xDecrypt;
window.generateKeyFromPassword = generateKeyFromPassword;

// 下载文件到本地
const saveFile = (options, data) => {
    return new Promise((resolve, reject) => {
        const savePath = utools.showSaveDialog(options);
        if (!savePath) {
            return reject('用户取消下载');
        }
        // 如果data是Blob对象，如何写入文件？
        if (data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = function () {
                writeFile(savePath, Buffer.from(reader.result), (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(savePath);
                });
            };
            reader.readAsArrayBuffer(data);
        } else {
            writeFile(savePath, data, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve(savePath);
            });
        }
    });
};

window.xSaveFile = saveFile;
const {XMLParser} = require('fast-xml-parser');


window.xml2Json = (xmlDataStr, arrayItem = []) => {
    let options = {
        ignoreAttributes: true,
        isArray: (tagName, jPath, isLeafNode, isAttribute) => {
            // 这里你可以使用 tagName 或 jPath 来确定哪些节点应该是数组
            return arrayItem.includes(tagName);
        }
    };
    const parser = new XMLParser(options);
    return parser.parse(xmlDataStr);
}

// 向本地临时目录写入文件
const writeTempFile = (fileName, data) => {
    return new Promise((resolve, reject) => {
        const tempPath = utools.getPath('temp') + fileName
        console.log("tempPath", tempPath)
        writeFile(tempPath, data, (err) => {
            if (err) {
                return reject(err);
            }
            resolve(tempPath);
        });
    });
}
// 删除临时文件
const deleteTempFile = (filePath) => {
    return new Promise((resolve, reject) => {
        require('fs').unlink(filePath, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
window.xWriteTempFile = writeTempFile;
window.xDeleteTempFile = deleteTempFile;


const {TextDecoder, TextEncoder} = require('util')

window.xBuffer = Buffer;
window.string2UTF8 = (data, fromCode) => {
    const decoder = new TextDecoder(fromCode);
    return decoder.decode(data);
}

// 读取本地文件内容
window.readLocalFile = (filePath) => {
    return new Promise((resolve, reject) => {
            require('fs').readFile(filePath,  (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        }
    )
}