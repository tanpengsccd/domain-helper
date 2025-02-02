import {IPushStrategy} from './IPushStrategy.js';
import {httpGet, httpPost} from "@/utils/http";
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
        return  await httpPost(requestURI, payload, {
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

    async push(config, certData, oncall = null) {
        try {
            oncall && oncall('beforePush', "开始推送证书");
            // 等待2s
            await new Promise(resolve => setTimeout(resolve, 2000));
            const res = await this.pushSSL(config, certData);
            if (res.code !== 200) {
                throw new Error(`推送失败: ${res.error}`);
            }
            oncall && oncall('afterPush', "证书文件推送成功 🎉");
            return {
                msg: `推送成功 证书ID: ${res.certID}`,
                extData: res
            };
        } catch (error) {
            oncall && oncall('error', error);
            throw new Error(`推送失败: ${error.message}`);
        }
    }
} 