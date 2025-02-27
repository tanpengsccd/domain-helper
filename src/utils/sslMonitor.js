// 这里是监控SSL证书的逻辑

// 定义数据结构

import {message, Modal} from "ant-design-vue";

const sslMonitorPrefix = 'sslmonitor';

/**
 * key = sslmonitor/domain/fulldomain
 * {
 *  domain: string; // 域名
 *  type: string; // 解析类型
 *  full_domain: string; // 完整域名 // 可能是* @ 等
 *  resolve_address: string; // 解析地址
 *  expire_time: string; // 过期时间
 * }
 *
 */
import psl from 'psl';

const url = window.xUrl;
const https = window.xhttps;
import {h} from "vue";
import {addNotification} from "@/utils/notification";

const dns = window.xDns;
const {promisify} = window.xUtil;

const resolveA = promisify(dns.resolve4);
const resolveAAAA = promisify(dns.resolve6);
const resolveCNAME = promisify(dns.resolveCname);

// 获取渠道通知配置
import {useThemeStore} from '@/stroes/themeStore';
import {sendNotification} from "@/utils/notificationChan";

// 定义常量配置
const EXPIRY_THRESHOLDS = {
    NOTICE: 30,
    WARNING: 10,
    CRITICAL: 5
};

const SILENCE_PERIODS = {
    NOTICE: 7 * 24 * 60 * 60 * 1000,  // 7天
    WARNING: 3 * 24 * 60 * 60 * 1000,  // 3天
    CRITICAL: 0  // 危急情况不静默
};

async function getDnsRecord(hostname) {
    // 如果hostname包含端口号，需要去除端口号再进行DNS解析
    const hostnameWithoutPort = hostname.split(':')[0];

    try {
        // 尝试获取 A 记录
        const aRecords = await resolveA(hostnameWithoutPort);
        if (aRecords && aRecords.length > 0) {
            return {type: 'A', address: aRecords[0]};
        }
    } catch (err) {
        // 忽略错误，继续尝试其他记录
    }

    try {
        // 尝试获取 CNAME 记录
        const cnameRecords = await resolveCNAME(hostnameWithoutPort);
        if (cnameRecords && cnameRecords.length > 0) {
            return {type: 'CNAME', address: cnameRecords[0]};
        }
    } catch (err) {
        // 忽略错误，继续尝试其他记录
    }

    try {
        // 尝试获取 AAAA 记录
        const aaaaRecords = await resolveAAAA(hostnameWithoutPort);
        if (aaaaRecords && aaaaRecords.length > 0) {
            return {type: 'AAAA', address: aaaaRecords[0]};
        }
    } catch (err) {
        // 忽略错误
    }

    // 如果没有找到任何记录
    throw new Error(`没有找到任何DNS记录: ${hostnameWithoutPort}`);
}


export function checkSSLCertificateExpiry(inputUrl) {
    return new Promise((resolve, reject) => {
        // 解析输入URL
        const parsedUrl = new url.URL(inputUrl);

        // 获取主机名和端口
        let hostname = parsedUrl.hostname;
        const port = parsedUrl.port || 443; // 默认端口为443


        // 如果hostname中 有 * 代表泛域名 ，替换为
        if (hostname.indexOf('*') !== -1) {
            hostname = hostname.replace('*.', 'domian_helper_666.');
        }

        const options = {
            hostname: hostname,
            port: port,
            method: 'HEAD',
            agent: false,
            rejectUnauthorized: false, // 为了测试允许不受信任的证书
            timeout: 2000,
        };

        const req = https.request(options, (res) => {
            const certificate = res.socket.getPeerCertificate(true);

            if (certificate) {
                const expiryDate = new Date(certificate.valid_to);
                // 如果拿到的证书就是过期的 直接报错
                if (expiryDate.getTime() < Date.now()) {
                    reject(new Error('证书已过期，仅支持检查有效证书'));
                }
                // 检查是否为泛域名证书
                const isWildcard = certificate.subjectaltname && certificate.subjectaltname.includes('*.');
                resolve({
                    timestamp: expiryDate.getTime(),
                    isWildcard: isWildcard
                });
            } else {
                reject(new Error('无法获取证书信息或请求失败'));
            }
        });
        // 设置超时处理
        req.setTimeout(2000, () => {
            req.destroy();
            reject(new Error('请求超时，请检查网络连接'));
        });

        req.on('error', (e) => {
            console.error(`请求错误: ${e.message}`);
            reject(e);
        });
        req.end();
    });
}


export async function addSslMonitor(obj, isEdit = false) {
    // uri 地址标识符, type, address, domain, remark
    if (typeof obj === "string") {
        obj = {uri: obj}
    }
    let {uri, type, address, domain, remark, cloud, account_key} = obj
    const url = uri.includes('://') ? uri : `https://${uri}`;
    // 解析url
    const parsedUrl = new xUrl.URL(url);
    const port = parsedUrl.port || 443;
    uri = port === 443 ? parsedUrl.hostname : `${parsedUrl.hostname}:${port}`;

    // 获取域名时，需要使用不带端口号的主机名
    const hostnameWithoutPort = parsedUrl.hostname;
    domain = domain || psl.get(hostnameWithoutPort);

    const key = `${sslMonitorPrefix}/${domain}/${uri}`;
    let sub = parsedUrl.hostname === domain ? '@' : parsedUrl.hostname.replace(`.${domain}`, '');

    // 如果type为空，则尝试获取dns记录
    if (!type) {
        const dnsRecord = await getDnsRecord(uri);
        type = dnsRecord.type;
        address = dnsRecord.address;
    }

    const data = {
        domain,
        type,
        remark,
        uri,
        sub,
        address,
        is_wildcard: false,
        expire_time: 0,
        cloud,
        account_key
    }
    if (typeof obj === "object" && isEdit) {
        data.expire_time = obj.expire_time
        data.is_wildcard = obj.is_wildcard
    }
    let {isWildcard, timestamp} = await checkSSLCertificateExpiry(url);
    data.is_wildcard = isWildcard;
    data.expire_time = timestamp;

    // 存入utools
    utools.dbStorage.setItem(key, data)

    if (isEdit) {
        return;
    }
    // 监控成功以后 触发检测
    await monitorSSL(() => {
        //
        window.updateUnreadCount();
    }, () => {
        //
        window.updateUnreadCount();
    })
}


export async function batchAddSslMonitor(fullUrls) {
    const promises = fullUrls.map(fullUrl => {
        try {
            return addSslMonitor(fullUrl);
        } catch (error) {
            return Promise.reject({url: fullUrl, error});
        }
    });

    const results = await Promise.allSettled(promises);

    let successCount = 0;
    let errorCount = 0;
    let errorUrls = [];
    results.forEach((result, index) => {
        let uri = typeof fullUrls[index] === "string" ? fullUrls[index] : fullUrls[index].uri;
        if (result.status === 'rejected') {
            errorCount++;
            errorUrls.push({
                uri: uri,
                error: result.reason
            });
        } else {
            successCount++;
        }
    });

    if (errorCount > 0) {
        //console.warn('部分记录更新失败:', errorUrls);
    }

    return {
        successCount,
        errorCount,
        errorUrls
    };
}


export function getAllSslMonitor(domian = "") {
    let keyPrefix = `${sslMonitorPrefix}`
    if (domian) {
        keyPrefix = `${sslMonitorPrefix}/${domian}`
    }
    const keys = utools.db.allDocs(keyPrefix);
    return keys.map(item => {
        return {
            _id: item._id,
            ...item.value
        }
    }).sort((a, b) => {
        // 按时间戳排序 降序 validFrom
        return b.expire_time - a.expire_time;
    })
}


export async function batchAddSslMonitorLogic(urls, edit = false) {
    const op = edit ? '更新' : '添加';
    const hide = message.loading(`正在${op} ${urls.length} 条记录`, 0);
    const addRes = await batchAddSslMonitor(urls);
    hide()
    // 根据结果显示适当的消息
    if (addRes.successCount > 0 && addRes.errorCount === 0) {
        message.success(`成功添加 ${addRes.successCount} 个域名监控`);
    } else if (addRes.successCount > 0 && addRes.errorCount > 0) {
        Modal.info({
            title: '部分域名添加成功',
            content: h('div', null, [
                h('div', {
                    style: {
                        padding: '12px 16px',
                        backgroundColor: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: '4px',
                        marginBottom: '12px'
                    }
                }, [
                    h('div', {style: {display: 'flex', alignItems: 'center'}}, [
                        h('span', {
                            style: {
                                color: '#52c41a',
                                fontSize: '16px',
                                marginRight: '8px',
                                fontWeight: 'bold'
                            }
                        }, '🎉'),
                        h('span', {style: {color: '#52c41a', fontWeight: 'bold'}},
                            `成功添加 ${addRes.successCount} 个域名监控`
                        )
                    ])
                ]),
                h('p', null, `${addRes.errorCount} 个域名添加失败`),
                h('div', {style: {maxHeight: '200px', overflow: 'auto', marginTop: '10px'}},
                    h('div', {style: {border: '1px solid #f0f0f0', borderRadius: '4px'}},
                        addRes.errorUrls.map((item, index) =>
                            h('div', {
                                style: {
                                    padding: '8px 12px',
                                    borderBottom: index < addRes.errorUrls.length - 1 ? '1px solid #f0f0f0' : 'none',
                                    backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff'
                                }
                            }, [
                                h('div', {style: {fontWeight: 'bold', marginBottom: '4px'}}, item.uri),
                                h('div', {style: {color: '#ff4d4f', fontSize: '13px'}},
                                    item.error.message || '无法连接或证书无效'
                                )
                            ])
                        )
                    )
                )
            ]),
            onOk() {

            }
        });
    } else if (addRes.errorCount > 0) {
        Modal.error({
            title: '添加失败',
            content: h('div', null, [
                h('p', null, `${addRes.errorCount} 个域名添加失败`),
                h('div', {style: {maxHeight: '200px', overflow: 'auto', marginTop: '10px'}},
                    h('div', {style: {border: '1px solid #f0f0f0', borderRadius: '4px'}},
                        addRes.errorUrls.map((item, index) =>
                            h('div', {
                                style: {
                                    padding: '8px 12px',
                                    borderBottom: index < addRes.errorUrls.length - 1 ? '1px solid #f0f0f0' : 'none',
                                    backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff'
                                }
                            }, [
                                h('div', {style: {fontWeight: 'bold', marginBottom: '4px'}}, item.uri),
                                h('div', {style: {color: '#ff4d4f', fontSize: '13px'}},
                                    item.error.message || '无法连接或证书无效'
                                )
                            ])
                        )
                    )
                )
            ])
        });
    }
}

// 检测域名是否被监控了，如果被监控了，重新获取证书信息
export async function updateOneDomainMonitor(domain) {
    // 处理可能包含端口号的域名
    const domainWithoutPort = domain.split(':')[0];
    // 获取根域名
    const rootDomain = psl.get(domainWithoutPort);
    const key = `${sslMonitorPrefix}/${rootDomain}/${domain}`;
    const data = utools.dbStorage.getItem(key);
    if (data) {
        await addSslMonitor(data)
    }
}


export async function monitorSSL(onNotifcation, onError) {
    const store = useThemeStore();
    const config = store.config;

    // 获取全部的监控记录
    let records = getAllSslMonitor();
    // 过滤处于通知静默期的域名
    const now = Date.now();
    records = records.filter(record => {
        // 如果没有设置静默时间，或者当前时间大于静默时间，就是需要监控的域名
        return !record.silence_time || now > record.silence_time
    });

    // 遍历监控记录
    let notifyRecords = [];
    for (const record of records) {
        // 检查证书剩余的过期时间，如果小于30天、10天、5天就发送通知 并且更新静默时间
        const {expire_time} = record;
        const remainingDays = Math.floor((expire_time - now) / (1000 * 60 * 60 * 24));
        if (remainingDays > EXPIRY_THRESHOLDS.NOTICE) {
            continue;
        }
        try {
            if (remainingDays > EXPIRY_THRESHOLDS.WARNING && remainingDays <= EXPIRY_THRESHOLDS.NOTICE) {
                notifyRecords.push({
                    title: record.uri,
                    content: `证书剩余${remainingDays}天`,
                    level: 'info'
                });
                // 更新静默时间
                record.silence_time = now + SILENCE_PERIODS.NOTICE;
                utools.dbStorage.setItem(record._id, record);
            } else if (remainingDays > EXPIRY_THRESHOLDS.CRITICAL && remainingDays <= EXPIRY_THRESHOLDS.WARNING) {
                notifyRecords.push({
                    title: record.uri,
                    content: `证书剩余${remainingDays}天`,
                    level: 'warning'
                });
                // 更新静默时间
                record.silence_time = now + SILENCE_PERIODS.WARNING;
                utools.dbStorage.setItem(record._id, record);
            } else if (remainingDays <= EXPIRY_THRESHOLDS.CRITICAL) {
                notifyRecords.push({
                    title: record.uri,
                    content: `证书剩余${remainingDays}天`,
                    level: 'error'
                });
                // 危急情况下不设置静默时间，每次都通知
            }
        } catch (e) {
            addNotification('监控SSL证书出错', `监控${record.uri}时出错: ${e.message}`);
            onError();
        }
    }

    if (notifyRecords.length > 0) {
        let title = `关于${notifyRecords[0].title}等${notifyRecords.length}个域名证书到期提醒`;

        // 将内容转换为HTML字符串
        let content = notifyRecords.map(record => {
            const colorClass = record.level === 'error' ? 'red' :
                record.level === 'warning' ? 'orange' : '#1e90ff';
            return `
                <div>
                    <span style="color: ${colorClass}">${record.title}</span><br/>
                    <span>${record.content}</span><br/><br/>
                </div>
            `;
        }).join('');

        // 存储通知
        addNotification(title, content);

        // 系统通知使用纯文本格式
        const plainTextContent = notifyRecords.map(record =>
            `${record.title}: ${record.content}`
        ).join('\n');

        utools.showNotification(title, '域名助手');
        onNotifcation();

        // 如果配置了通知渠道，则发送通知
        if (config.notifications) {
            const notificationChannels = {
                wechat: config.notifications.wechat,
                dingtalk: config.notifications.dingtalk,
                serverChan: config.notifications.serverChan,
                anPush: config.notifications.anPush,
                custom: config.notifications.custom
            };

            const promises = Object.entries(notificationChannels)
                .filter(([_, value]) => value)
                .map(([channel, config]) =>
                    sendNotification(channel, config, {title, content: plainTextContent})
                );

            await Promise.all(promises);
            // 不关心通知结果
        }
    }
}