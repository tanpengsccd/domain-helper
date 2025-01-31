import {IPushStrategy} from './IPushStrategy.js';
import {randomString} from "@/utils/tool";

const NodeSSH = xNodeSSH.NodeSSH;

export class SSHPushStrategy extends IPushStrategy {
    constructor() {
        super();
        this.ssh = new NodeSSH();
    }

    async validate(config) {
        try {
            await this.ssh.connect({
                host: config.host,
                port: config.port || 22,
                username: config.username,
                password: config.password,
                privateKey: config.privateKey
            });
            return true;
        } catch (error) {
            throw new Error(`SSH连接验证失败: ${error.message}`);
        }
    }

    async push(config, certData, oncall = null) {
        try {
            // 连接服务器
            await this.validate(config);
            oncall && oncall('connected');
            const sftp = await this.ssh.requestSFTP();

            // const namePrefix = "utools_dh_" + randomString(8);
            //
            // // 创建临时证书文件
            // const certPath = await xWriteTempFile(`${namePrefix}_cert.pem`, certData.cert)
            // const keyPath = await xWriteTempFile(`${namePrefix}_key.pem`, certData.key)


            oncall && oncall('beforePush');
            // console.log('certPath', certPath)
            // console.log('keyPath', keyPath)
            await this.writeContentToFile(sftp, certData.cert, config.certPath);
            await this.writeContentToFile(sftp, certData.key, config.keyPath);

            // // // 上传证书文件
            // await this.ssh.putFile(certPath, config.certPath);
            // await this.ssh.putFile(keyPath, config.keyPath);
            // await xDeleteTempFile(certPath)
            // await xDeleteTempFile(keyPath)
            oncall && oncall('afterPush');

            // 执行重启命令
            if (config.restartCommand) {
                oncall && oncall('beforeCommand');
                await this.ssh.execCommand(config.restartCommand);
                oncall && oncall('afterCommand');
            }

            await this.ssh.dispose();
            return true;
        } catch (error) {
            console.error('SSHPushStrategy push error:', error);
            oncall && oncall('error', error);
            throw new Error(`推送失败: ${error.message}`);
        }
    }

    writeContentToFile(sftp, content, path) {
        console.log("sftp 推送")
        return new Promise((resolve, reject) => {
            sftp.writeFile(path, content, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
} 