# FreeIDPhoto · 免费证件照换底色 + 拼版

> 给已经拍好的照片换底色、按标准尺寸拼到 6 寸相纸,送便利店冲印。
> 完全免费、无水印、无张数限制、不需要注册、照片不上传服务器。
> 域名:`zhaopian.116.ccwu.cc`(占位,部署时替换)

## 定位

不和"拍照 → 美颜 → 出图"的大而全工具竞争。
**只做一件事**:你已经有一张正面照(自拍 / 影楼底片 / 旧证件照),想要:

- 换个底色(白 / 蓝 / 红 / 渐变)
- 按一寸 / 二寸 / 签证标准尺寸出图
- 自动拼到 6 寸相纸,拿去便利店打印

## 抠图引擎(全部浏览器本地、零后端)

| 引擎 | 速度 | 质量 | 首次加载 | 适用场景 |
|---|---|---|---|---|
| MediaPipe(默认) | 快 ⚡ | 中 | ~2 MB | 简单背景、光线均匀,日常够用 |
| ONNX(@imgly/background-removal) | 慢 🐢 | 高 ⭐⭐ | ~40 MB(浏览器会缓存) | 头发边缘、复杂背景,要细节 |

两个都是免费、本地跑、不上传服务器。ONNX 首次下载模型慢一点,之后浏览器会缓存。

## 功能

- 30 种常用规格,严格 300dpi 像素输出
- 6 寸相纸自动拼版,带浅灰裁切线
- 行业标准排版预设(一寸八连 / 二寸四连等)
- PWA,支持添加到主屏

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 单页应用 + SEO 落地页 |
| `styles.css` | 样式 |
| `app.js` | 上传 / 抠图 / 换底色 / 拼版 / 下载 全部逻辑 |
| `manifest.webmanifest` | PWA 配置 |
| `favicon.svg` | 图标 |
| `robots.txt` / `sitemap.xml` | SEO |

> 注:已移除 remove.bg 远程抠图路径,纯静态、零后端、零 API key。

## 本地预览

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

## 部署到 Cloudflare Pages

1. 把这个目录推到 GitHub 仓库
2. Cloudflare → Pages → Create project → Connect to Git
3. Framework preset 选 `None`,Build command 留空,Build output 写 `.`
4. 自定义域名:Custom domains → Add `zhaopian.116.ccwu.cc`,按提示加 CNAME

或直接:

```bash
npm i -g wrangler
wrangler pages deploy . --project-name=idphoto
```

## 上线前 checklist

- [ ] 把 `index.html` / `sitemap.xml` / `robots.txt` 里所有 `zhaopian.116.ccwu.cc` 改成实际域名
- [ ] Footer 里的 `GitHub` 链接换成你自己仓库 URL
- [ ] (可选)接入 Cloudflare Web Analytics(免费、无 cookie)
- [ ] Google Search Console / Bing Webmaster Tools 提交 sitemap

## SEO 关键词

- 证件照换底色 免费
- 证件照排版 免费 / 二寸证件照拼版打印 / 一寸照片排版 6寸
- 在线证件照尺寸生成
- "不上传服务器" / "本地处理" / "隐私" / "无水印"
