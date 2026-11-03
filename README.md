# 猫狗性格研究所：订单验证码版

买家输入发货消息里的验证码后，可以反复测试猫咪或狗狗。新版验证码为 6 位纯数字，首批已生成 1000 个。此前发出的 `PET-...` 旧码继续有效。

## 部署

Cloudflare Pages 保持框架 `None`、构建命令留空、输出目录 `dist`、根目录留空。仓库根目录需要有 `dist/`、`functions/` 和 `lib/`。

生产环境需要两个加密 Secret：`PET_CODE_SECRET` 是原有密钥，用于旧版码；`PET_NUMERIC_CODES` 是这批数字码的私密清单，值为本机 `cloudflare-six-digit-codes.txt` 的完整内容。两者都不能提交到 GitHub，也不要发送截图。Cloudflare 的单个 Secret 上限为 5 KB，1000 个六码经打包约 4 KB。

部署后访问 `https://你的域名/api/access`。未输入码且配置正确时，应显示 `{"ok":false,"configured":true,"numericConfigured":true}`。如果 `numericConfigured` 为 `false`，说明数字码清单尚未配置。

## 一单一码

首批数字码保存在卖家本机的 `first-1000-six-digit-codes.csv`。每成交一单，取一行尚未发出的码，把实际订单号填入该行，并只把这一枚码发给该买家。买家可以重复使用自己的码。网页本身不会读取小红书订单，也不会自动发货；自动逐单发码需要在小红书或所用发货工具中另行配置。

生成新码表：`node scripts/generate-numeric-codes.mjs --create <数量> <新的私密 CSV 路径> <新的私密 Secret 文件路径>`。已有 CSV 可用 `--pack <私密 CSV 路径> <新的私密 Secret 文件路径>` 打包。不要覆盖或遗失已经发出的码；更新 Cloudflare 的 `PET_NUMERIC_CODES` 时必须包含所有仍需有效的数字码。

## 限制

6 位数字且 1000 个码同时有效，随机猜一次命中的概率约为 1/900；当前版本没有按买家账户绑定，也没有服务端限流。码可以被转发给其他人。现有题目和画像文本位于公开静态文件中，技术用户也可能绕过验证界面。需要更严格的付费控制时，应使用更长的码、限流和服务端结果计算。
