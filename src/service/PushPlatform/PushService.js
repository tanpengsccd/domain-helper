import {SSHPushStrategy} from './SSHPushStrategy.js';
import {QiniuPushStrategy} from "./QiniuPushStrategy.js";

export class PushServiceFactory {
    static getService(platform) {
        switch (platform) {
            case 'ssh':
                return new SSHPushStrategy();
            case 'qiniu':
                return new QiniuPushStrategy();
            default:
                throw new Error(`不支持的平台类型: ${platform}`);
        }
    }
}