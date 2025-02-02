import {IPushStrategy} from './IPushStrategy.js';
import {httpGet, httpMethod, httpPost, httpsRequest} from "@/utils/http";
import * as x509 from '@peculiar/x509'

const crypto = window.xcrypto
const url = window.xUrl


export class QiniuPushStrategy extends IPushStrategy {

    constructor() {
        super();
    }


    base64ToUrlSafe(v) {
        return v.replace(/\//g, '_').replace(/\+/g, '-');
    }

    hmacSha1(encodedFlags, secretKey) {
        const hmac = crypto.createHmac('sha1', secretKey);
        hmac.update(encodedFlags);
        return hmac.digest('base64');
    }

    generateAccessToken(mac, requestURI, reqBody = null) {
        const u = new url.URL(requestURI);
        const path = u.pathname + u.search;
        let access = path + '\n';
        if (reqBody) {
            access += reqBody;
        }
        const digest = this.hmacSha1(access, mac.secretKey);
        const safeDigest = this.base64ToUrlSafe(digest);
        return 'QBox ' + mac.accessKey + ':' + safeDigest;
    }

    async validate(config) {
        if (!config.accessKey || !config.secretKey) {
            throw new Error('请填写完整的七牛云配置信息');
        }
        // 调用七牛云API验证AK/SK是否有效
        const {error, error_code} = await this.getSSLList(config)
        if (error_code) {
            throw new Error(`七牛云验证失败: ${error}`);
        }
        return true;
    }


    async getSSLList(config) {
        const mac = {
            accessKey: config.accessKey,
            secretKey: config.secretKey
        };
        const requestURI = 'https://api.qiniu.com/sslcert';
        const accessToken = this.generateAccessToken(mac, requestURI);
        return await httpGet(requestURI, {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `${accessToken}`
        });
    }


    async pushSSL(config, certData, oncall = null) {
        const mac = {
            accessKey: config.accessKey,
            secretKey: config.secretKey
        };
        const requestURI = 'https://api.qiniu.com/sslcert';
        const accessToken = this.generateAccessToken(mac, requestURI);
        const payload = this.parseCertificate(certData.cert, certData.key);
        return await httpPost(requestURI, payload, {
            'Content-Type': 'application/json',
            'Authorization': `${accessToken}`
        });
    }

    parseCertificate(cert, key) {
        const certInfo = new x509.X509Certificate(cert);
        return {
            name: certInfo.subject,
            common_name: certInfo.subject,
            pri: key,
            ca: cert
        }
    }

    async getDomainInfo(config, domain) {
        const mac = {
            accessKey: config.accessKey,
            secretKey: config.secretKey
        };
        const requestURI = 'https://api.qiniu.com/domain/' + domain;
        const accessToken = this.generateAccessToken(mac, requestURI);
        return await httpGet(requestURI, {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `${accessToken}`
        });
    }

    async changeDomainHttps(config, domain, certID, http2Enable, forceHttps) {
        const mac = {
            accessKey: config.accessKey,
            secretKey: config.secretKey
        };
        const requestURI = `https://api.qiniu.com/domain/${domain}/httpsconf`;
        const accessToken = this.generateAccessToken(mac, requestURI);
        const payload = {
            certID: certID,
            http2Enable,
            forceHttps
        };
        return await httpMethod("PUT", requestURI, {
            'Content-Type': 'application/json',
            'Authorization': `${accessToken}`
        }, payload);
    }

    async openDomainHttps(config, domain, certID) {
        const mac = {
            accessKey: config.accessKey,
            secretKey: config.secretKey
        }
        const requestURI = `https://api.qiniu.com/domain/${domain}/sslize`;
        const accessToken = this.generateAccessToken(mac, requestURI);
        const payload = {
            certID: certID,
            http2Enable: true,
            forceHttps: true,
        };
        return await httpMethod("PUT", requestURI, {
            'Content-Type': 'application/json',
            'Authorization': `${accessToken}`
        }, payload);
    }

    async push(config, certData, oncall = null) {
        try {
            oncall && oncall('beforePush', {msg: "开始推送证书"});
            const res = await this.pushSSL(config, certData);
            if (res.code !== 200) {
                throw new Error(`推送失败: ${res.error}`);
            }
            oncall && oncall('afterPush', {msg: "证书文件推送成功 🎉"});

            // 判断是否设置了cdnDomain 如果设置了 需要将证书直接推送到cdn
            let bindMsg = '';
            if (config.cdnDomain) {
                try {
                    const {https, error} = await this.getDomainInfo(config, config.cdnDomain)
                    if (error) {
                        throw new Error(`获取域名信息失败: ${error}`);
                    }
                    if (https.certId) {
                        // 证书已存在，更换证书
                        const {error} = await this.changeDomainHttps(config, config.cdnDomain, res.certID, https.http2Enable, https.forceHttps);
                        if (error) {
                            throw new Error(`更换证书失败: ${error}`);
                        }
                    } else {
                        // 证书不存在，开启https
                        const {error} = await this.openDomainHttps(config, config.cdnDomain, res.certID);
                        if (error) {
                            throw new Error(`开启https失败: ${error}`);
                        }
                    }
                    bindMsg = `证书成功绑定到CDN域名 ${config.cdnDomain} 🎉🎉`;
                    oncall && oncall('bindCdn', {
                        msg: bindMsg
                    })
                } catch (e) {
                    bindMsg = `绑定CDN失败: ${e.message}`
                    oncall && oncall('bindCdn', {
                        msg: bindMsg
                    })
                }
            }

            oncall && oncall('success', {msg: `推送成功 证书ID: ${res.certID}`});
            return {
                msg: `推送成功 证书ID: ${res.certID}` + (bindMsg ? `<br> ${bindMsg}` : ''),
                extData: res
            };
        } catch (error) {
            oncall && oncall('error', {
                msg: error.toString()
            });
            console.error('QiniuPushStrategy push error:', error);
            throw new Error(`推送失败: ${error.message}`);
        }
    }
} 