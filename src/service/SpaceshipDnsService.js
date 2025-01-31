import {httpsRequest} from '@/utils/http';
import dayjs from "dayjs";
import {containsAnySubstring} from "@/utils/tool";

const renewLink = "https://www.spaceship.com/zh/application/domain-list-application/"


// https://docs.spaceship.dev/#tag/DnsRecords

class SpaceshipDnsService {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.apiBase = 'spaceship.dev';
        this.dnsServer = ["spaceship"]
    }

    async listDomains() {
        let pageSize = 100, offset = 0;
        let domains = [];
        while (true) {
            let action = `api/v1/domains?take=${pageSize}&skip=${offset}`;
            const {total, items} = await this._spaceshopRest(action, 'GET');
            if (total === 0) {
                break;
            }
            domains = domains.concat(items);
            if (total < (pageSize + offset)) {
                break;
            }
            offset += pageSize;
        }
        const now = new Date().getTime();
        return domains.filter(r => {
            const expTime = new Date(r.expirationDate).getTime()
            return now < expTime && containsAnySubstring(this.dnsServer, r?.nameservers?.hosts?.[0])
        }).map(item => {
            return {
                domain: item.unicodeName,
                cloud: "spaceship",
                expire_time: item.expirationDate ? dayjs(item.expirationDate).format('YYYY-MM-DD HH:mm:ss') : '',
                renew_link: item.expirationDate ? renewLink : ""
            }
        });
    }

    async listRecords(domain) {
        let pageSize = 500, offset = 0;
        let records = [];
        while (true) {
            const action = `api/v1/dns/records/${domain}?take=${pageSize}&skip=${offset}`;
            const res = await this._spaceshopRest(action, 'GET');
            console.log(typeof res)
            console.log(res)
            break;
            // if (detail) {
            //     throw new Error(detail)
            // }
            // console.log(total, items);
            // if (total === 0) {
            //     break;
            // }
            // records = records.concat(items);
            // if (total < (pageSize + offset)) {
            //     break;
            // }
            // offset += pageSize;
        }
        console.log(records);
        return records.map(item => {
            return {
                RecordId: `${item.type}##${item.name}`,
                Remark: "",
                Name: item.name,
                Type: item.type,
                TTL: item.ttl,
                Value: item.data,
            }
        });
    }

    async addRecord(domain, record) {
        const action = `api/v1/domains/${domain}/records`;
        const payload = JSON.stringify([{
            type: record.type,
            name: record.name,
            data: record.value,
            ttl: record.ttl
        }]);
        return this._spaceshopRest(action, 'POST', payload);
    }

    async updateRecord(domain, record) {
        const action = `api/v1/domains/${domain}/records/${record.type}/${record.name}`;
        const payload = JSON.stringify({
            data: record.value,
            ttl: record.ttl
        });
        return this._spaceshopRest(action, 'PUT', payload);
    }

    async deleteRecord(domain, recordType, recordName) {
        const action = `api/v1/domains/${domain}/records/${recordType}/${recordName}`;
        return this._spaceshopRest(action, 'DELETE');
    }

    _spaceshopRest(action, method, payload = null) {
        const options = {
            hostname: this.apiBase,
            path: `/${action}`,
            method: method,
            headers: {
                'X-Api-Secret': this.apiSecret,
                'X-Api-Key': this.apiKey,
                'Content-Type': 'application/json'
            }
        };
        // options.agent = new xhttps.Agent(
        //     {proxy: 'http://127.0.0.1:10809'}
        // );
        return httpsRequest(options, payload, true);
    }
}

export default SpaceshipDnsService;