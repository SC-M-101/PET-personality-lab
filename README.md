# 猫狗性格研究所：订单验证码版

这个版本保留猫狗测试和分享图，在封面与信息页之间增加购买验证码。验证码由 Cloudflare Pages Function 验证；每个订单 ID 会生成固定且不同的验证码。买家可重复使用自己的码。

## 部署

将 `dist/`、`functions/`、`lib/` 上传到 GitHub 仓库根目录，Cloudflare Pages 设置仍为：框架 `None`、构建命令留空、输出目录 `dist`、根目录留空。`scripts/` 可以留在本机，不参与网页部署。

**先在 Cloudflare Pages 项目 Settings → Variables and Secrets → Add 中添加生产环境 Secret `PET_CODE_SECRET`，点击 Encrypt，再上传新版网页。**值必须是随机且至少 32 字符的私密字符串。不要把它、有效验证码清单或订单号清单上传到 GitHub。Cloudflare 预览环境如需测试，也要单独设置同一个 Secret。设置后重新部署，访问 `https://你的域名/api/access`；配置成功时应显示 `{"ok":false,"configured":true}`，未配置时为 503。

## 一单一码

同一订单号用同一个 Secret 生成的验证码始终相同。不同订单号产生不同验证码。生成时不能随意更换 Secret，否则旧码都会失效。需要更多码时继续用原 Secret 和新的订单号生成。

在 `work/pet-personality-site` 目录执行：

```powershell
$env:PET_CODE_SECRET = '粘贴 Cloudflare 中设置的私密字符串'
node scripts/generate-codes.mjs --orders order-ids.txt order-codes.csv
```

`order-ids.txt` 每行填写一个真实订单号。也可以预先制作一个码池，再按单发放：

```powershell
node scripts/generate-codes.mjs --batch 100 stock-codes.csv
```

若小红书的对应商品类目与发货工具支持逐单发放不同的卡密，可将码池按平台要求导入；若只能填写一段固定发货说明，所有买家收到的会是同一个码，需要改为逐单发放。网页无法自动读取小红书订单或替平台配置自动发货。

## 适用范围

此版本不要求买家注册，所以码可转发给他人；它实现的是“一单一码”，无法证明使用者是原买家。现有题目和画像文本仍在公开静态文件及公开 GitHub 仓库中，技术用户可能绕过界面获取内容。正式经营如需更强保护，应把计分与付费画像移到服务端，并限制源码的公开访问。照片仍只在买家的浏览器中处理，不会发送给验证码接口。

