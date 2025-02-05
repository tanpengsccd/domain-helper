import {cloudsData} from "./data.js";
import {message, notification} from "ant-design-vue";
import JSZip from "jszip";
import psl from 'psl';
import {a} from "./salt.js";

const dns = window.xDns


import confetti from 'canvas-confetti';
import {TcpmkDnsTool} from "@/utils/TcpmkDnsTool";

function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

const flowers = () => {
    // 使用定时器 300ms 播放一次 共播放6次
    let times = 0;
    let timer = setInterval(() => {
        confetti({
            zIndex: 8898989,
            angle: randomInRange(55, 125),
            spread: randomInRange(50, 70),
            particleCount: randomInRange(50, 100),
            origin: {y: 0.6},
            colors: [
                "#ff1744",
                "#d500f9",
                "#651fff",
                "#3d5afe",
                "#00e5ff",
                "#2196f3",
                "#00e676",
                "#ffea00",
                "#ff9100",
                "#ff3d00",
            ],
            shapes: ['square', 'circle', 'star']
        });
        times++;
        if (times >= 6) {
            clearInterval(timer)
            timer = null
        }
    }, 300)
}

// 撒花函数
export function congratulations() {
    flowers()
}


export function getItem(key, initValue = null) {
    let value = utools.dbStorage.getItem(key);
    if (value) {
        return JSON.parse(window.xDecrypt(value, a()));
    }
    return initValue;
}

export function setItem(key, value) {
    utools.dbStorage.setItem(key, window.xEncrypt(JSON.stringify(value), a()));
}

const prefix = "cloud"

const domainPrefix = "xdomain"


const accountPrefix = "account"

const sslPrefix = "ssl"

function getNow() {
    // 返回 ymdhms
    return new Date().toISOString().replace(/[-:]/g, "").replace("T", "").split(".")[0];
}

function getKey(prefix) {
    return `${prefix}/${getNow()}_${randomString(6)}`;
}

export function saveSettingDb(value, key = null) {
    if (!key) {
        key = getKey(accountPrefix);
    }
    setItem(key, value);
    return key;
}

const pushPlatformPrefix = "push_platform"

export function savePushPlatform(value, key = null) {
    if (!key) {
        key = getKey(pushPlatformPrefix);
    }
    setItem(key, value);
    return key;
}


export function getAllPushplatform() {
    const keys = utools.db.allDocs(pushPlatformPrefix)
    return keys.map(item => {
        return {
            _id: item._id,
            ...JSON.parse(window.xDecrypt(item.value, a()))
        };
    }).reverse()
}


export function initCloudData() {
    return [];
}

export function getValidCloudData() {
    const data = initCloudData();
    return data.filter(item => item.tokens.some(item => item.value));
}

export function clearCloudDb(key) {
    const dataKey = `${prefix}/${key}`;
    utools.dbStorage.removeItem(dataKey);
}

export function saveDomain(domain, cloud, extra = {}) {
    const dataKey = `${domainPrefix}/${cloud}/${domain}`;
    utools.dbStorage.setItem(dataKey, {
        domain, cloud, ...extra
    });
}

export function deleteDomainDb(cloud, domain) {
    const dataKey = `${domainPrefix}/${cloud}/${domain}`;
    utools.dbStorage.removeItem(dataKey);
}

// 获取全部域名
export function getAllDomains() {
    // 获取全部的服务器账号信息
    const accounts = getAllAccount();
    // 改成 key => v
    const accountMap = accounts.reduce((acc, item) => {
        acc[item._id] = item;
        return acc;
    }, {})
    const keys = utools.db.allDocs(domainPrefix)
    let res = keys.map(item => {
        return {
            _id: item._id,
            ...item.value
        }
    }).map(item => {
        return {
            ...item,
            cloud_info: getDomainBaseCloud(item.cloud),
            account_info: accountMap[item.account_key]
        }
    })

    // 按照字母排序
    res.sort((a, b) => {
        return a.domain.localeCompare(b.domain);
    })
    return res;
}


export function getDomainBaseCloud(key) {
    return cloudsData.find(item => item.key === key);
}

export function getDomain(key) {
    const dataKey = `${domainPrefix}/${key}`;
    return utools.dbStorage.getItem(dataKey);
}


export function setDomainExpireTime(key, expireTime, renewLink) {
    const dataKey = `${domainPrefix}/${key}`;
    utools.dbStorage.setItem(dataKey, {
        ...getDomain(key),
        expire_time: expireTime,
        renew_link: renewLink
    });
}

export function xcopyText(value, msg = "复制成功") {
    utools.copyText(value);
    message.success(msg);
}

export function randomString(len = 16) {
    const $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
    const maxPos = $chars.length;
    let pwd = '';
    for (let i = 0; i < len; i++) {
        pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
}

export function getAllAccount() {
    const keys = utools.db.allDocs(accountPrefix)
    return keys.map(item => {
        return {
            _id: item._id,
            ...JSON.parse(window.xDecrypt(item.value, a()))
        };
    }).map(item => {
        return {
            ...item,
            cloud_info: getDomainBaseCloud(item.cloud_key)
        }
    }).reverse()
}

export function openDoc(url) {
    utools.ubrowser.goto(url).run({width: 1200, height: 800});
}

export function goScore(pluginName = "域名助手") {
    //utools.redirect(['管理中心', '插件应用市场内搜索'], pluginName)
    utools.shellOpenExternal("utools://域名助手")
}

export function saveSslInfo(domain, subdomain, sslinfo) {
    let key = `${sslPrefix}/${subdomain}`;
    utools.dbStorage.setItem(key, {
        domain, subdomain, ...sslinfo
    });
    return key;
}

export function getAllSslInfo() {
    const keys = utools.db.allDocs(`${sslPrefix}/`)
    return keys.map(item => {
        return {
            _id: item._id,
            ...item.value
        }
    }).sort((a, b) => {
        // 按时间戳排序 降序 validFrom
        return b.validFrom - a.validFrom;
    })
}

export function getAvailableSSL() {
    let all = getAllSslInfo();
    return all.filter(item => item.validTo > new Date().getTime());
}

export function getDnsServer(domain) {
    // 获取DNS服务器 优先使用 tcp.mk服务
    return new Promise(async (resolve, reject) => {
        const nsname = await TcpmkDnsTool.getFirstNsServer(domain);
        if (nsname) {
            resolve({
                nsname: nsname
            });
            return;
        }
        dns.resolveNs(domain, (err, address) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    nsname: address?.[0] || ""
                });
            }
        });
    });
}


// 根据给定的天数，判断ssl证书 有效期

export function getSomeSsl(days = 0) {
    const now = new Date().getTime();
    return getAllSslInfo().filter(item => {
        return item.validTo - now < days * 24 * 60 * 60 * 1000;
    })
}

export function containsAnySubstring(array, str) {
    return array.some(substring => str.includes(substring));
}


export function getFullDomainByItem(item, domain = "") {
    return item.Name === "@" ? (item.Domain || domain) : `${item.Name}.${(item.Domain || domain)}`;
}

export function exportSSL(item) {
    const zipFile = JSZip()
    let prefix = item.subdomain
    // 检测如果域名是泛域名，那么证书文件名加上_wildcard 去掉 * 号
    if (prefix.startsWith("*.")) {
        prefix = prefix.replace("*.", "") + "_wildcard"
    }
    zipFile.file(`${prefix}.csr`, item.csr, {binary: false});
    zipFile.file(`${prefix}.key`, item.key, {binary: false});
    zipFile.file(`${prefix}.cert`, item.cert, {binary: false});
    zipFile.generateAsync({type: "uint8array"}).then(file => {
        window.xSaveFile({
            title: '导出ssl证书',
            buttonLabel: '导出',
            defaultPath: utools.getPath('downloads') + `/${prefix}_ssl证书.zip`,
            filters: [{name: 'Zip File', extensions: ['zip']}]
        }, file).then((path) => {
            message.success("证书导出成功")
            utools.shellShowItemInFolder(path)
        }).catch(err => {
            if (err.toString() === "用户取消下载") {
                message.info("用户取消下载")
            } else {
                notification.error({
                    message: '导出失败', description: err.toString(), duration: 10
                });
            }
        })
    });
}

export function getRootDomain(domain) {
    // 如果是泛域名 干掉泛域名前缀
    if (domain.indexOf('*') !== -1) {
        domain = domain.replace('*.', '');
    }
    return psl.get(domain);
}

export function goUrl(url) {
    utools.shellOpenExternal(url);
}