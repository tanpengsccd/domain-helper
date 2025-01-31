import { SSHPushStrategy } from './SSHPushStrategy.js';

export class PushServiceFactory {
    static getService(platform) {
        switch (platform) {
            case 'ssh':
                return new SSHPushStrategy();
            default:
                throw new Error(`不支持的平台类型: ${platform}`);
        }
    }
}