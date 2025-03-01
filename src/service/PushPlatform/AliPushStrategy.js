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
    "oss": {api: "oss-cn-beijing.aliyuncs.com", version: "2023-03-10"},
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

// OSS专用Request类
class OssRequest {
    constructor(httpMethod, path, host, header, queryParam) {
        this.httpMethod = httpMethod;
        this.path = path;
        this.host = host;
        this.headers = header;
        this.queryParam = queryParam;
        this.body = null;
        this._initHeader();
    }

    _initHeader() {
        const date = new Date();
        this.headers = {
            ...this.headers,
            'host': this.host,
            'x-oss-date': this._getISO8601Date()
        };
    }

    _getISO8601Date() {
        const date = new Date();

        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }

    setBody(body) {
        this.body = body;
    }

    setBucket(bucket) {
        this.bucket = bucket;
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
        if (config.type === 'OSS') {
            // 验证OSS
            return this.validateOSS(config);
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
        // CDN验证逻辑
    }

    async validateOSS(config) {
        this.region = config.oss_region || 'cn-hangzhou';
        this.bucket = config.oss_bucket || config.bucket;

        if (!this.bucket) {
            throw new Error('OSS bucket未设置');
        }

        const api = `${this.bucket}.${ALI_TYPE.oss.api.replace('cn-beijing', this.region)}`;

        try {
            const request = this._makeOssRequest("GET", '/', "", {cname: undefined}, {}, {api, bucket: config.oss_bucket});
            console.log(request);
            const res = await this._aliOssRest(request.options, request.body);
            // console.log(xml2Json(res));
            // console.log(xml2Json(res).Error.CanonicalRequest);
        } catch (e) {
            console.error('验证OSS配置失败:', e);
            throw new Error(`验证OSS配置失败: ${e.message}`);
        }
    }

    // 推送证书
    async push(config, certData, oncall = null) {
        console.log(config);
        this.accessKeyId = config.accessKey;
        this.accessKeySecret = config.secretKey;

        if (config.type === 'SSL') {
            return await this.pushSSL(config, certData, oncall);
        }
        if (config.type === 'CDN') {
            return await this.pushCDN(config, certData, oncall);
        }
        if (config.type === 'OSS') {
            return await this.pushOSS(config, certData, oncall);
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
        // CDN推送逻辑
    }

    async pushOSS(config, certData, oncall = null) {
        this.region = config.region || 'cn-hangzhou';
        this.bucket = config.oss_bucket || config.bucket;

        if (!this.bucket) {
            throw new Error('OSS bucket未设置');
        }

        const objectKey = `certificates/${certData.domain}/${dayjs().format('YYYY-MM-DD')}/cert.pem`;
        const keyObjectKey = `certificates/${certData.domain}/${dayjs().format('YYYY-MM-DD')}/key.pem`;

        try {
            // 上传证书
            const certRequest = this._makeOssRequest("PUT", `/${objectKey}`, certData.cert, {
                api: `${this.bucket}.${ALI_TYPE.oss.api.replace('cn-beijing', this.region)}`,
            });

            await this._aliRest(certRequest.options, certRequest.body);

            // 上传私钥
            const keyRequest = this._makeOssRequest("PUT", `/${keyObjectKey}`, certData.key, {
                api: `${this.bucket}.${ALI_TYPE.oss.api.replace('cn-beijing', this.region)}`,
            });

            await this._aliRest(keyRequest.options, keyRequest.body);

            return {
                msg: `证书已成功上传到OSS
<br>
证书路径: ${objectKey}
<br>
私钥路径: ${keyObjectKey}`
            };
        } catch (e) {
            console.error('上传证书到OSS失败:', e);
            throw new Error(`上传证书到OSS失败: ${e.message}`);
        }
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

    _makeOssRequest(method, path, body, params, headers, ext) {
        const host = ext.api;
        const request = new OssRequest(
            method,
            path,
            host,
            headers,
            params
        );
        request.setBody(body);
        request.setBucket(ext.bucket);
        // 计算OSS签名并获取完整请求头
        this._getOssAuthorization(request);

        const queryString = (new URLSearchParams(request.queryParam).toString()).replace('=undefined', '');
        console.log(queryString);
        return {
            options: {
                hostname: request.host,
                path: `${request.path}` + (queryString ? `?${queryString}` : ''),
                method: request.httpMethod,
                headers: {
                    ...request.headers,
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

    _getOssAuthorization(signRequest) {
        let hashedRequestPayload = 'UNSIGNED-PAYLOAD';
        signRequest.headers['x-oss-content-sha256'] = hashedRequestPayload;
        // 确保所有头部都是小写的
        signRequest.headers = Object.fromEntries(
            Object.entries(signRequest.headers).map(([key, value]) => [key.toLowerCase(), value])
        );

        // 构建规范请求
        const canonicalQueryString = Object.entries(signRequest.queryParam || {})
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([key, value]) => {
                if (value === undefined) {
                    return `${this._percentCode(key)}`;
                }
                return `${this._percentCode(key)}=${this._percentCode(value)}`
            })
            .join('&');


        // 获取并排序头部
        const sortedHeaders = Object.keys(signRequest.headers)
            .sort()
            .filter(key => key === 'host' || key === 'content-type' || key === 'content-md5' || key.startsWith('x-oss-'));

        const signedHeaders = sortedHeaders.join(';');

        const canonicalHeaders = sortedHeaders
            .map(key => `${key}:${signRequest.headers[key]}`)
            .join('\n') + '\n';

        // 构建规范请求
        const canonicalRequest = [
            signRequest.httpMethod,
            `/${signRequest.bucket}/`,
            canonicalQueryString,
            canonicalHeaders,
           signedHeaders,
            hashedRequestPayload
        ].join('\n');
//                 canonicalRequest = `GET
// /xinu-note-images/
// cname
// host:xinu-note-images.oss-cn-beijing.aliyuncs.com
// x-oss-content-sha256:UNSIGNED-PAYLOAD
// x-oss-date:20250301T095042Z
//
// host;x-oss-content-sha256;x-oss-date
// UNSIGNED-PAYLOAD`

        console.log("==============canonicalRequest==========");
        console.log(canonicalRequest)


        // 获取当前日期
        const date = new Date();
        const dateStamp = signRequest.headers['x-oss-date'].split('T')[0].replace(/-/g, '');
        const dateTimeStamp = signRequest.headers['x-oss-date'];

        // 构建待签名字符串
        const scope = `${dateStamp}/${this.region}/oss/aliyun_v4_request`;
        const stringToSign = [
            'OSS4-HMAC-SHA256',
            dateTimeStamp,
            scope,
            this._sha256Hex(canonicalRequest)
        ].join('\n');

        console.log('========stringToSign==========')
        console.log(stringToSign)
        // 计算签名
        const signature = this._calculateOssSignature(dateStamp, stringToSign);
        console.log("==============signature==========");
        console.log(signature)
        // 构建授权头
        signRequest.headers['Authorization'] = `OSS4-HMAC-SHA256 Credential=${this.accessKeyId}/${dateStamp}/${this.region}/oss/aliyun_v4_request,AdditionalHeaders=${signedHeaders},Signature=${signature}`;
        console.log(signRequest.headers['Authorization']);
    }

    _getContentMd5(data) {
        // 创建一个MD5哈希对象
        const hash = crypto.createHash('md5');
        // 更新哈希对象的内容
        hash.update(data, 'utf8');
        // 获取哈希的二进制数据
        const digest = hash.digest();
        // 使用 Buffer 的内置方法将二进制数据转换为 Base64 编码
        return digest.toString('base64').replace("==", '');
    }

    _calculateOssSignature(dateStamp, stringToSign) {
        // 计算签名密钥
        const kDate = this._hmacSha256(`aliyun_v4${this.accessKeySecret}`, dateStamp);
        const kRegion = this._hmacSha256(kDate, this.region);
        const kService = this._hmacSha256(kRegion, 'oss');
        const kSigning = this._hmacSha256(kService, 'aliyun_v4_request');

        // 计算最终签名
        return this._hmacSha256Hex(kSigning, stringToSign);
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

    _hmacSha256(key, data) {
        // 确保data不为undefined
        if (data === undefined) {
            data = '';
        }

        // 如果key是字符串，转换为Buffer
        if (typeof key === 'string') {
            const hmac = window.xcrypto.createHmac('sha256', key);
            hmac.update(data);
            return hmac.digest();
        } else {
            // 如果key已经是Buffer或类似Buffer的对象
            const hmac = window.xcrypto.createHmac('sha256', key);
            hmac.update(data);
            return hmac.digest();
        }
    }

    _hmacSha256Hex(key, data) {
        // 确保data不为undefined
        if (data === undefined) {
            data = '';
        }

        const hmac = window.xcrypto.createHmac('sha256', key);
        hmac.update(data);
        return hmac.digest('hex').toLowerCase();
    }

    _sha256Hex(data) {
        // 确保data不为undefined
        if (data === undefined) {
            data = '';
        }

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
            if (result && result.Code) {
                throw new Error(result.Message || '未知错误');
            }
            return result;
        } catch (error) {
            console.log(error);
            throw new Error(`API请求错误: ${error.message}`);
        }
    }

    async _aliOssRest(options, data) {
        console.log(options, data)
        try {
            let result = await httpsRequest(options, data, true);
            result = xml2Json(result, ['Cname']);
            // if (result && result.Code) {
            //     throw new Error(result.Message || '未知错误');
            // }
            console.log(result)
            return result;
        } catch (error) {
            console.log(error);
            throw new Error(`API请求错误: ${error.message}`);
        }
    }
} 