## 域名助手 - uTools插件

<div align="center">
    <img src="logo.png" alt="Domain Hero Logo" width="200"/>
</div>

### 简介 📝

域名助手 是一款功能强大的域名、SSL证书管理工具，集成在uTools平台中。它能帮助开发者和域名管理员更高效地管理他们的域名资产。

### 主要功能 ✨
- 📝 域名记录管理
  - 支持A、CNAME等记录类型
  - 批量导入导出

- 🔐 SSL证书管理
  - 证书申请与更新
  - 证书状态监控
  - 到期提醒

- 🏢 多平台支持
  - 阿里云
  - 腾讯云
  - 华为云
  - 更多平台持续添加中...

### 安装方法 🚀

1. 安装 [uTools](https://u.tools/)
2. 打开 uTools 插件市场
3. 搜索 "域名助手"
4. 点击安装即可使用

### 使用说明 📖

1. 在uTools中呼出输入框
2. 输入关键词 "域名助手"
3. 选择相应功能进行操作

### 开发相关 🛠️

本项目使用以下技术栈：
- Vue 3
- Vite
- Ant Design Vue
- Node.js

#### 本地开发


为了保护敏感信息，项目中没有包含salt.js文件，需要自行新建
```js
// 新建salt.js文件
// 在路径 /src/utils/ 下新建 salt.js 文件，内容如下：
export function a() {
    return generateKeyFromPassword("密码", "盐");
}
```


```bash
# 克隆项目
git clone https://github.com/imxiny/domain-helper.git

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 贡献指南 🤝

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (git checkout -b feature/AmazingFeature)
3. 提交你的更改 (git commit -m 'Add some AmazingFeature')
4. 推送到分支 (git push origin feature/AmazingFeature)
5. 开启一个 Pull Request
6. 接受代码优化类的合并，前端还在学习中，功能匆忙，代码质量不高，欢迎指正


### 开源协议 📄

本项目采用 MIT 协议。详情请见 [LICENSE](LICENSE) 文件。

### 联系方式 📮

- 项目作者：逆流而上
- 邮箱：tcp-ip@outlook.com
- 微信：qazink [注明来意]
- GitHub：https://github.com/imxiny

### 致谢 🙏

感谢所有为这个项目做出贡献的开发者们！

---

如果这个项目对你有帮助，欢迎给一个 ⭐️ Star！