# 一次性脚本:下载 @imgly/background-removal-data 模型文件到 ./models/
# 从国内 npm 镜像(registry.npmmirror.com / npm.elemecdn.com)拉,不走 staticimgly.com
# 用法: 在 PowerShell 里 cd 到这个项目目录,运行:  .\setup-models.ps1

$ErrorActionPreference = 'Stop'
$pkg     = '@imgly/background-removal-data'
$version = '1.4.5'
# 如果将来版本更新,先查可用版本:  curl -s https://registry.npmjs.org/@imgly/background-removal-data | python -c "import sys,json; print('\n'.join(json.load(sys.stdin)['versions'].keys()))"
$dest    = Join-Path $PSScriptRoot 'models'

Write-Host "==> 准备下载 $pkg@$version 到 $dest" -ForegroundColor Cyan

# 多镜像兜底:优先国内,失败逐个降级
$mirrors = @(
  "https://registry.npmmirror.com/$pkg/-/$($pkg.Split('/')[1])-$version.tgz",
  "https://registry.npmjs.org/$pkg/-/$($pkg.Split('/')[1])-$version.tgz"
)

$tgz = Join-Path $env:TEMP "imgly-data-$version.tgz"
$downloaded = $false
foreach ($url in $mirrors) {
  try {
    Write-Host "  下载: $url" -ForegroundColor DarkGray
    Invoke-WebRequest -Uri $url -OutFile $tgz -UseBasicParsing -TimeoutSec 60
    $downloaded = $true
    break
  } catch {
    Write-Host "  失败,换下一个镜像..." -ForegroundColor Yellow
  }
}
if (-not $downloaded) { throw "所有镜像都下载失败,检查网络。" }
Write-Host "==> 下载完成: $tgz ($([math]::Round((Get-Item $tgz).Length / 1MB, 1)) MB)" -ForegroundColor Green

# 解压 tgz(tar 是 Windows 10/11 自带)
$tmpExtract = Join-Path $env:TEMP "imgly-data-$version"
if (Test-Path $tmpExtract) { Remove-Item $tmpExtract -Recurse -Force }
New-Item -ItemType Directory -Path $tmpExtract | Out-Null
Write-Host "==> 解压中..."
tar -xzf $tgz -C $tmpExtract
if ($LASTEXITCODE -ne 0) { throw "tar 解压失败" }

# 把 package/dist/ 里的内容拷到 ./models/
$srcDist = Join-Path $tmpExtract 'package'
if (-not (Test-Path $srcDist)) { throw "解压后没找到 package 目录: $srcDist" }

if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Path $dest | Out-Null

# imgly 期望 publicPath/<model>/<file>,所以直接拷 dist 下的所有内容
$distSub = Join-Path $srcDist 'dist'
if (Test-Path $distSub) {
  Copy-Item "$distSub\*" $dest -Recurse -Force
} else {
  # 老版本可能直接放在 package/ 根
  Copy-Item "$srcDist\*" $dest -Recurse -Force -Exclude 'package.json','README.md','LICENSE*'
}

# 清理临时文件
Remove-Item $tgz -Force
Remove-Item $tmpExtract -Recurse -Force

$sz = (Get-ChildItem $dest -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "==> 完成! models/ 总大小: $([math]::Round($sz,1)) MB" -ForegroundColor Green
Write-Host ""
Write-Host "目录树预览:"
Get-ChildItem $dest | Format-Table Name, @{N='Size(MB)';E={[math]::Round($_.Length/1MB,2)}}, Mode

Write-Host ""
Write-Host "下一步: 把 models/ 一起 commit 到 git,然后部署到 Cloudflare Pages 即可。" -ForegroundColor Cyan
Write-Host "(注意: CF Pages 单文件 ≤ 25 MB,app.js 已配置 model:'small' 适配此限制)" -ForegroundColor DarkGray
