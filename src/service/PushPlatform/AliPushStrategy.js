import {IPushStrategy} from './IPushStrategy.js';
import {httpGet, httpMethod, httpPost, httpsRequest} from "@/utils/http";
import * as x509 from '@peculiar/x509'

const crypto = window.xcrypto
const url = window.xUrl
// Request 类定义

import dayjs from "dayjs";
const ALI_TYPE = {
    "ssl": {api: "cas.aliyuncs.com", version: "2020-04-07"},
    "cdn": {api: "cdn.aliyuncs.com", version: "2018-05-10"},
}

class Request {
    constructor(httpMethod, canonicalUri, host, xAcsAction, xAcsVersion) {
        this.httpMethod = httpMethod;
        this.canonicalUri = canonicalUri || '/';
        this.host = host;
        this.xAcsAction = xAcsAction;
        this.xAcsVersion = xAcsVersion;
        this.headers = {};
        this.body = null;
        this.queryParam = {};
        this._initHeader();
    }

    _initHeader() {
        const date = new Date();
        this.headers = {
            'host': this.host,
            'x-acs-action': this.xAcsAction,
            'x-acs-version': this.xAcsVersion,
            'x-acs-date': date.toISOString().replace(/\..+/, 'Z'),
            'x-acs-signature-nonce': Math.random().toString(36).substring(2)
        };
    }

    setBody(body) {
        this.body = body;
    }
}

export class AliPushStrategy extends IPushStrategy {
    constructor() {
        super();
    }

    async validate(config) {
        this.accessKeyId = config.accessKey;
        this.accessKeySecret = config.secretKey;
        if (config.type === 'SSL') {
            // 验证ssl
            const res = await this.validateSSL(config);
            console.log(res);
        }
        if (config.type === 'CDN') {
            // 验证ssl
            return this.validateCDN(config);
        }
    }

    async validateSSL(config) {
        const action = 'ListCsr';
        const request = this._makeRequest("POST", '/', '', {}, {
            api: ALI_TYPE.ssl.api,
            version: ALI_TYPE.ssl.version,
            action
        });
        return this._aliRest(request.options, request.body);
    }

    async validateCDN(config) {

    }

    // 推送证书
    async push(config, certData, oncall = null) {
        console.log(config);
        if (config.type === 'SSL') {
            return await this.pushSSL(config, certData, oncall);
        }
        if (config.type === 'CDN') {
            return await this.pushCDN(config, certData, oncall);
        }
    }

    async pushSSL(config, certData, oncall = null) {
        const action = 'UploadUserCertificate';
        const body = {
            Cert: certData.cert,
            Key: certData.key,
            Name: certData.domain + '_' + dayjs().format('YYYYMMDDHHmmss'),
        }

        const request = this._makeRequest("POST", '/', (new URLSearchParams(body)).toString(), {}, {
            api: ALI_TYPE.ssl.api,
            version: ALI_TYPE.ssl.version,
            action
        });
        const res = await this._aliRest(request.options, request.body);
        return {
            msg: `证书ID : <span style="color: #FF6A00">${res.CertId}</span> 
<br> 
证书地址 : <a onclick="utools.shellOpenExternal('https://yundun.console.aliyun.com/?p=cas#/certExtend/upload?currentPage=1&pageSize=10&keyword=&statusCode=')">查看证书</a>`
        };
    }

    async pushCDN(config, certData, oncall = null) {

    }


    _makeRequest(method, path, body, params, ext) {
        /**_aliRest
         * ext = {
         *     api, version,action
         * }
         */
        const request = new Request(
            method,
            path,
            ext.api,
            ext.action,
            ext.version
        );
        request.queryParam = {
            ...params
        };
        request.setBody(body);
        // 计算签名并获取完整请求头
        this._getAuthorization(request);
        const queryString = new URLSearchParams(request.queryParam).toString();
        return {
            options: {
                hostname: request.host,
                path: `${request.canonicalUri}` + (queryString ? `?${queryString}` : ''),
                method: request.httpMethod,
                headers: {
                    ...request.headers,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
            body: body
        }
    }

    _getAuthorization(signRequest) {
        const newQueryParam = {};
        this._processObject(newQueryParam, "", signRequest.queryParam);
        signRequest.queryParam = newQueryParam;


        const canonicalQueryString = Object.entries(signRequest.queryParam)
            .sort(([keyA, valueA], [keyB, valueB]) => {
                // 如果参数名相同，按值排序
                if (keyA === keyB) {
                    return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
                }
                // 直接使用字符串比较，底层也是基于字符代码比较
                return keyA < keyB ? -1 : 1;
            })
            .map(([key, value]) => `${this._percentCode(key)}=${this._percentCode(value)}`)
            .join('&');

        const requestPayload = signRequest.body || '';
        const hashedRequestPayload = this._sha256Hex(requestPayload);
        signRequest.headers['x-acs-content-sha256'] = hashedRequestPayload;

        signRequest.headers = Object.fromEntries(
            Object.entries(signRequest.headers).map(([key, value]) => [key.toLowerCase(), value])
        );

        const sortedKeys = Object.keys(signRequest.headers)
            .filter(key => key.startsWith('x-acs-') || key === 'host' || key === 'content-type')
            .sort();

        const signedHeaders = sortedKeys.join(";");
        const canonicalHeaders = sortedKeys.map(key => `${key}:${signRequest.headers[key]}`).join('\n') + '\n';

        const canonicalRequest = [
            signRequest.httpMethod,
            signRequest.canonicalUri,
            canonicalQueryString,
            canonicalHeaders,
            signedHeaders,
            hashedRequestPayload
        ].join('\n');


        const hashedCanonicalRequest = this._sha256Hex(canonicalRequest);
        const stringToSign = `ACS3-HMAC-SHA256\n${hashedCanonicalRequest}`;
        const signature = this._hmac256(this.accessKeySecret, stringToSign);

        signRequest.headers['Authorization'] = `ACS3-HMAC-SHA256 Credential=${this.accessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`;
    }

    _percentCode(str) {
        return encodeURIComponent(str)
            .replace(/\+/g, '%20')
            .replace(/\*/g, '%2A')
            .replace(/~/g, '%7E');
    }

    _hmac256(key, data) {
        const hmac = window.xcrypto.createHmac('sha256', key);
        hmac.update(data);
        return hmac.digest('hex').toLowerCase();
    }

    _sha256Hex(data) {
        const hash = window.xcrypto.createHash('sha256');
        hash.update(data);
        return hash.digest('hex').toLowerCase();
    }

    _processObject(map, key, value) {
        if (value === null) return;
        if (key === null) key = "";

        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                this._processObject(map, `${key}.${index + 1}`, item);
            });
        } else if (typeof value === 'object') {
            Object.entries(value).forEach(([subKey, subValue]) => {
                this._processObject(map, `${key}.${subKey}`, subValue);
            });
        } else {
            if (key.startsWith('.')) {
                key = key.slice(1);
            }
            map[key] = String(value);
        }
    }

    async _aliRest(options, data) {
        try {
            const result = await httpsRequest(options, data, true);
            if (result.Code) {
                throw new Error(result.Message);
            }
            return result;
        } catch (error) {
            console.log(error);
            throw new Error(`API请求错误: ${error.message}`);
        }
    }
} 