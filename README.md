# 屏幕分享工具

这是一个基于React和WebRTC的屏幕分享工具，允许用户通过扫描二维码在不同设备间共享屏幕。

## 功能特点

- 设备B生成二维码，供设备A扫描
- 设备A扫描二维码后可查看设备B的屏幕内容
- 设备A界面中有浮窗按钮，显示分辨率、当前时间和连接状态
- 基于WebRTC实现低延迟屏幕共享
- 使用Socket.IO进行实时通信和信令

## 技术栈

- 前端：React、React Router
- 实时通信：Socket.IO
- 屏幕共享：WebRTC (simple-peer)
- 二维码生成：qrcode.react
- 服务器：Express

## 安装与使用

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动前端开发服务器
npm run dev

# 启动后端服务器
npm run server
```

### 生产模式

```bash
# 构建前端并启动服务器
npm start
```

## 使用方法

1. 访问首页，点击「创建分享(B)」按钮
2. 在设备B上会显示一个二维码
3. 使用设备A扫描该二维码，或直接访问分享链接
4. 设备B会请求屏幕共享权限，允许后开始共享
5. 设备A可以看到设备B的屏幕内容
6. 设备A可以点击右下角的「信息」按钮查看详细信息

## 注意事项

- 需要现代浏览器支持（Chrome、Firefox、Edge等）
- 屏幕共享需要HTTPS环境或localhost
- 确保两台设备能够连接到同一网络或互联网


## 参考文档
* [MDN:MediaStream](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaStream)
* [MDN:getDisplayPlayMedia](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getDisplayMedia)