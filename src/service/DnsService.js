import TencentDnsService from "./TencentDnsService.js";
import CloudflareDnsService from "./CloudFlareDnsService";
import AliDnsService from "./AliDnsService";
import HuaweiDnsService from "./HuaweiDnsService";
import AwsDnsService from "@/service/AwsDnsService";
import VolcengineDnsService from "@/service/VolcengineDnsService";
import SpaceshipDnsService from "@/service/SpaceshipDnsService";
import WestDnsService from "@/service/WestDnsService";

const DNS_MAP_SERVICE = {}

const DNS_PROVIDER = {
    "tencent": TencentDnsService,
    "cloudflare": CloudflareDnsService,
    "ali": AliDnsService,
    'huawei': HuaweiDnsService,
    'aws': AwsDnsService,
    'volcengine': VolcengineDnsService,
    "spaceship": SpaceshipDnsService,
    "west": WestDnsService,
}

export function getDnsService(key, provider, credentials, refresh = false) {
    if (refresh) {
        if (DNS_MAP_SERVICE[key]) {
            DNS_MAP_SERVICE[key].xDestroy()
        }
        DNS_MAP_SERVICE[key] = null;
    }
    if (!DNS_MAP_SERVICE[key]) {
        DNS_MAP_SERVICE[key] = new DnsService(provider, credentials);
    }
    return DNS_MAP_SERVICE[key];
}

class DnsService {
    constructor(provider, credentials) {
        const params = credentials.map(item => item.value);
        this.provider = new DNS_PROVIDER[provider](...params);
    }

    async listDomains() {
        return this.provider.listDomains();
    }

    async listRecords(domain) {
        let {count, list} = await this.provider.listRecords(domain);
        list = list.map(r => {
            r.Domain = domain;
            return r
        }).sort((a, b) => {
            if (a.Type < b.Type) {
                return -1;
            } else if (a.Type > b.Type) {
                return 1;
            } else {
                // If Type is the same, then sort by Name
                if (a.Name < b.Name) {
                    return -1;
                } else if (a.Name > b.Name) {
                    return 1;
                } else {
                    return 0;
                }
            }
        })
        return {
            count,
            list
        }
    }

    async checkDomain(domain) {
        //
        const domains = await this.listDomains();
        if (domains.length === 0) {
            throw new Error('未找到任何有效域名');
        }
        if (domains.some(zone => zone.domain === domain)) {
            return {
                zone_id: domains.find(zone => zone.domain === domain).zone_id,
            };
        }
        throw new Error('域名不在列表中');
    }

    async addRecord(domain, record) {
        return this.provider.addRecord(domain, record);
    }

    async updateRecord(domain, record) {
        // 原始类有这个方法 则调用 ，没有则先删除再添加
        if (typeof this.provider.updateRecord === 'function') {
            return this.provider.updateRecord(domain, record);
        } else {
            await this.deleteRecord(domain, record.id);
            return this.addRecord(domain, record);
        }

    }

    async deleteRecord(domain, record) {
        return this.provider.deleteRecord(domain, record);
    }

    async xDestroy() {
        if (typeof this.provider.xDestroy === 'function') {
            this.provider.xDestroy();
        }
    }

    // 删除所有 _acme-challenge 记录
    async deleteAcmeRecord(domain, acmeDomain) {
       const target = `_acme-challenge.${acmeDomain}`.replace(`.${domain}`, "")
        // 列出所有域名
        return this.listRecords(domain).then(res => {
            // 找到所有 _acme-challenge 记录
            const acmeRecords = res.list.filter(item => item.Name === target);
            // 删除所有 _acme-challenge 记录

            console.log('删除 acmeRecords', acmeRecords);
            return Promise.all(acmeRecords.map(item => this.deleteRecord(domain, item.RecordId)));
        });
    }
    async changeRecordStatus(domain, recordId, extra = {}) {
        if (typeof this.provider.changeRecordStatus === 'function') {
            return this.provider.changeRecordStatus(domain, recordId, extra);
        }
    }
}