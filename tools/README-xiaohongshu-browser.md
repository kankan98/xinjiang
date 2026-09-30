# 小红书专用浏览器（本地只读调研）

本目录的 `launch_xiaohongshu_browser.ps1` 会启动一个与日常浏览器隔离的 Edge 配置目录，并只在本机回环地址 `127.0.0.1:9222` 开放 Chrome DevTools 连接，供本项目整理公开笔记的旅行线索。

## 启动

在 RoadBook 根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File tools/launch_xiaohongshu_browser.ps1
```

随后在**新打开的专用 Edge 窗口**中手动完成小红书登录。不要把账号、密码、短信验证码、Cookie、Token、二维码截图或浏览器资料文件发送给任何人。

登录完成后，保持该窗口打开。该脚本不会接收、导出或保存认证信息。

## 安全边界

- 浏览器资料保存在项目目录 `.claude/xiaohongshu-browser-profile/`，不会读取你的默认 Edge/Chrome 配置。
- DevTools 仅监听 `127.0.0.1`；不得改成 `0.0.0.0`、端口映射或公网转发。
- 访问范围仅用于读取旅行餐饮、酒店、停车、供暖、接驳、排队等公开内容；不点赞、收藏、评论、私信、发布、下单或查看订单/支付/私信。
- 登录会话仍有隐私风险，建议专用资料中不要登录支付、邮箱或其他无关服务。

## 停止与清除登录资料

关闭专用浏览器会话：

```powershell
powershell -ExecutionPolicy Bypass -File tools/launch_xiaohongshu_browser.ps1 -Stop
```

删除专用浏览器资料（会退出小红书，需要下次重新登录）：

```powershell
powershell -ExecutionPolicy Bypass -File tools/launch_xiaohongshu_browser.ps1 -ResetProfile
```
