const webdav = require('webdav-server').v2;


const userManager = new webdav.SimpleUserManager();
const user = userManager.addUser('username', 'password', false);

// Privilege manager (tells which users can access which files/folders)
const privilegeManager = new webdav.SimplePathPrivilegeManager();
privilegeManager.setRights(user, '/', [ 'all' ]);
// 创建一个新的 WebDAV 服务器实例
const server = new webdav.WebDAVServer({
    port: 1902,
    //privilegeManager: privilegeManager,
    httpAuthentication: new webdav.HTTPBasicAuthentication(userManager, 'realm'),
    requireAuthentification: false,
});

// 创建一个简单的文件系统资源
const userFileSystem = new webdav.PhysicalFileSystem('E:\\wedav');

// 将文件系统挂载到根路径
server.setFileSystem('/', userFileSystem, (success) => {
    if (!success) {
        console.error('Failed to set file system');
    }
});

// 启动服务器
server.start(() => {
    console.log('WebDAV server is running on port 1900');
});
