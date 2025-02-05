import {httpGet} from "@/utils/http";

const TCPMK_API_BASE = "https://tcp.mk/api/dig";

export class TcpmkDnsTool {
    /**
     * 检查DNS记录
     * @param domain 域名
     * @param type DNS记录类型 (NS, TXT等)
     * @param expectedValue 期望的值，如果是多条TXT记录，可以传入数组
     * @param timeout 超时时间(秒)
     * @param interval 检查间隔(秒)
     * @param callback 回调函数
     * @returns {Promise<boolean>}
     */
    static async checkDnsRecord(domain, type, expectedValue, timeout = 60, interval = 5, callback = null) {
        timeout *= 1000;
        interval *= 1000;
        const originalDomain = domain;

        const endTime = Date.now() + timeout;
        let times = 0;
        let flag = false;

        while (Date.now() < endTime) {
            times++;
            callback && callback('checkDnsRecord', {
                msg: `${originalDomain} 第${times}次检查 ${type} 记录...`,
                times,
                domain: domain
            });

            try {
                const result = await this.queryDnsRecord(domain, type);
                if (result.code === 200 && result.data) {
                    flag = this.validateDnsRecord(result.data, type, expectedValue);
                }
            } catch (e) {
                console.error('DNS查询失败:', e);
            }

            if (flag) {
                callback && callback('checkDnsRecord_success', {
                    msg: `${originalDomain} DNS记录已生效 🎉`,
                    times,
                    domain: domain
                });
                return flag;
            }

            await new Promise(resolve => setTimeout(resolve, interval));
        }

        throw new Error(`域名 ${originalDomain} DNS记录验证失败。\n已尝试${times}次，您可以：\n1. 检查DNS记录是否正确添加\n2. 等待1-2分钟后重试\n3. 如果问题持续，请检查域名DNS服务器是否正常`);
    }

    /**
     * 查询DNS记录
     * @param domain 域名
     * @param type DNS记录类型
     * @returns {Promise<*>}
     */
    static async queryDnsRecord(domain, type) {
        console.log('查询DNS记录:', domain, type);
        const url = `${TCPMK_API_BASE}?name=${domain}&type=${type}`;
        return await httpGet(url);
    }

    /**
     * 验证DNS记录
     * @param records DNS记录数组
     * @param type 记录类型
     * @param expectedValue 期望的值
     * @returns {boolean}
     */
    static validateDnsRecord(records, type, expectedValue) {
        if (!Array.isArray(records) || records.length === 0) {
            return false;
        }

        switch (type) {
            case 'NS':
                return records.some(record => record.Ns === expectedValue);
            case 'TXT':
                // 遍历所有记录，查找是否存在匹配的值
                return records.some(record => {
                    const value = record.Txt || '';
                    // 移除记录中可能存在的引号
                    const cleanValue = value.replace(/^"(.*)"$/, '$1');
                    // 移除期望值中可能存在的引号
                    const cleanExpected = expectedValue.replace(/^"(.*)"$/, '$1');
                    return cleanValue === cleanExpected;
                });
            case 'A':
                return records.some(record => record.A === expectedValue);
            case 'AAAA':
                return records.some(record => record.Aaaa === expectedValue);
            case 'CNAME':
                return records.some(record => record.Cname === expectedValue);
            case 'MX':
                return records.some(record => record.Mx === expectedValue);
            default:
                return false;
        }
    }

    /**
     * 获取域名的第一个NS服务器
     * @param domain 域名
     * @returns {Promise<string>} 返回NS服务器地址，如果查询失败则返回空字符串
     */
    static async getFirstNsServer(domain) {
        try {
            const result = await this.queryDnsRecord(domain, 'NS');
            if (result.code === 200 && Array.isArray(result.data) && result.data.length > 0) {
                return result.data[0].Ns || '';
            }
        } catch (e) {
            console.error('获取NS记录失败:', e);
        }
        return '';
    }
}
