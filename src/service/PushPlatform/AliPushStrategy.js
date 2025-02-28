import {IPushStrategy} from './IPushStrategy.js';
import {httpGet, httpMethod, httpPost, httpsRequest} from "@/utils/http";
import * as x509 from '@peculiar/x509'

const crypto = window.xcrypto
const url = window.xUrl
// Request 类定义


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
    public accessKeyId;
    public accessKeySecret;

    constructor() {
        super();
        this.casApiUrl = 'cas.aliyuncs.com'; // api地址
        this.version = '2020-04-07'; // api地址的版本
        this.api
    }

    async validate(config) {
        if (config.type === 'ssl') {
            // 验证ssl
            const res = await this.validateSSL(config);
            console.log(res);
        }
        if (config.type === 'cdn') {
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
        return this._aliRest(request);
    }

    async validateCDN(config) {

    }

    async push() {

    }

    async listDomainsWithExp() {
        this.apiBase = "domain.aliyuncs.com";
        this.version = '2018-01-29';
        const action = "QueryDomainList";

        let page = 1;
        let domainList = [];
        while (1) {
            const payload = this._buildQuery(action, {PageSize: 500, PageNum: page});
            const res = await this._aliRest(action, payload)
            domainList.push(...res.Data.Domain)
            if (res.NextPage === false) {
                break;
            }
            page++;
        }
        return domainList;
    }

    async listDomains() {
        let pageNumber = 1;
        const pageSize = 100;
        const res = await this.getDomainsData(pageNumber, pageSize);
        if (res.TotalCount === 0) {
            return new Error('未发现域名')
        }
        const totalPageCount = Math.ceil(res.TotalCount / pageSize);
        let domains = res.Domains.Domain;
        if (totalPageCount > 1) {
            for (var i = 2; i <= totalPageCount; i++) {
                const res = await this.getDomainsData(i, pageSize);
                domains.push.apply(domains, res.Domains.Domain);
            }
        }
        try {
            const expRes = await this.listDomainsWithExp();
            // 过滤掉已过期的域名, 并且把过期时间加入到域名列表中
            domains = domains.map(item => {
                const exp = expRes.find(expItem => expItem.DomainName === item.DomainName);
                return {
                    ...item,
                    ExpirationDateStatus: exp?.ExpirationDateStatus,
                    ExpirationDate: exp?.ExpirationDate
                }
            }).filter(item => item.ExpirationDateStatus !== '2')
        } catch (e) {
            //console.log(e);
        } finally {
            // 调用完 恢复api地址
            this.apiBase = 'alidns.aliyuncs.com';
            this.version = '2015-01-09';
        }
        domains = await Promise.all(domains.map(async item => {
            try {
                const {nsname} = await getDnsServer(item.DomainName);
                const isAliDns = containsAnySubstring(this.aliDns, nsname);
                return isAliDns ? item : null; // 检测是否是阿里云的dns服务器
            } catch (e) {
                return item;
            }
        }));
        domains = domains.filter(zone => zone !== null);
        return domains.map(item => {
            return {
                domain: item.DomainName,
                cloud: "ali",
                expire_time: item?.ExpirationDate,
                renew_link: item?.ExpirationDate ? renewLink : "",
            }
        })
    }


    async getDomainsData(PageNumber, PageSize) {
        const action = 'DescribeDomains';
        const payload = this._buildQuery(action, {
            PageSize, PageNumber
        });
        return this._aliRest(action, payload);
    }

    async DomainInfo(domina) {
        const action = "DescribeDomainInfo"
        const payload = this._buildQuery(action, {DomainName: domina});
        return await this._aliRest(action, payload);
    }

    async listRecords(domain) {
        const action = 'DescribeDomainRecords';
        const payload = this._buildQuery(action, {DomainName: domain, PageSize: 500});
        return new Promise((resolve, reject) => {
            this._aliRest(action, payload).then(res => {
                if (res.TotalCount === 0) {
                    resolve({
                        count: 0,
                        list: []
                    });
                }
                resolve({
                    count: res.TotalCount,
                    list: res.DomainRecords.Record.map(item => {
                        return {
                            RecordId: item.RecordId,
                            Name: item.RR,
                            Value: item.Value,
                            TTL: item.TTL,
                            Type: item.Type,
                            Status: item.Status === "ENABLE",
                            Remark: item.Remark
                        }
                    })
                })
            }).catch(e => {
                reject(e);
            })
        })
    }

    async addRecord(domain, record) {
        const action = 'AddDomainRecord';
        const payload = this._buildQuery(action, {
            DomainName: domain,
            RR: record.name,
            Type: record.type,
            Value: record.value,
        });
        return new Promise((resolve, reject) => {
            this._aliRest(action, payload).then(res => {
                if (record.remark) {
                    this.updateRecordRemark(res.RecordId, record.remark).then(() => {
                        resolve(res);
                    }).catch(e => {
                        reject(e);
                    })
                } else {
                    resolve(res);
                }
            }).catch(e => {
                reject(e);
            })
        })
    }

    async updateRecordRemark(recordId, remark) {
        const action = 'UpdateDomainRecordRemark';
        const payload = this._buildQuery(action, {
            RecordId: recordId,
            Remark: remark.replace(/[!~*'()_.-]/g, ' ')
        });
        return this._aliRest(action, payload);
    }

    async deleteRecord(domain, recordId) {
        const action = 'DeleteDomainRecord';
        const payload = this._buildQuery(action, {RecordId: recordId});
        return this._aliRest(action, payload);
    }

    async updateRecord(domain, record) {
        const records = await this.listRecords(domain);
        const oldRecord = records.list.find(item => item.RecordId === record.id);

        if (!oldRecord) {
            throw new Error('未找到记录');
        }

        const {name, type, value, remark, id} = record;
        if (oldRecord.Name !== name || oldRecord.Type !== type || oldRecord.Value !== value) {
            const action = 'UpdateDomainRecord';
            const payload = this._buildQuery(action, {
                RecordId: id,
                RR: name,
                Type: type,
                Value: value,
            });
            await this._aliRest(action, payload);
        }
        // 如果remark不同，则更新remark
        if (oldRecord.Remark !== remark) {
            await this.updateRecordRemark(id, remark);
        }
    }


    _buildQuery(action, params) {
        const request = new Request(
            'GET',
            '/',
            this.apiBase,
            action,
            this.version
        );
        request.queryParam = {
            ...params
        };

        // 计算签名并获取完整请求头
        this._getAuthorization(request);

        return {
            headers: request.headers,
            query: new URLSearchParams(request.queryParam).toString()
        };
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
        return {
            hostname: request.host,
            path: `${request.canonicalUri}?` + new URLSearchParams(request.queryParam).toString(),
            method: request.method,
            headers: {
                ...request.headers,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        };
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

    async _aliRest(request) {
        try {
            const response = await httpsRequest(request);
            const result = JSON.parse(response);
            if (result.Code) {
                throw new Error(result.Message);
            }
            return result;
        } catch (error) {
            throw new Error(`API请求错误: ${error.message}`);
        }
    }

    async changeRecordStatus(domain, recordId, extra = {}) {
        const action = 'SetDomainRecordStatus';
        const payload = this._buildQuery(action, {
            RecordId: recordId,
            Status: extra.Status ? "Enable" : "Disable"
        });
        return this._aliRest(action, payload);
    }
} 