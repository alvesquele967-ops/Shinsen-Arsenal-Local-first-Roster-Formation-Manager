param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [Console]::OutputEncoding

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Test-PortAvailable([int]$CandidatePort) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $CandidatePort)
    try {
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        $listener.Stop()
    }
}

if (-not (Test-PortAvailable $Port)) {
    if ($PSBoundParameters.ContainsKey("Port")) {
        Write-Host "[エラー] ポート $Port はすでに使用されています。start.cmd 4300 のように別の番号を指定してください。"
        exit 1
    }
    $fallbackPort = (($Port + 1)..([Math]::Min($Port + 100, 65535)) | Where-Object { Test-PortAvailable $_ } | Select-Object -First 1)
    if (-not $fallbackPort) {
        Write-Host "[エラー] ポート $Port から $([Math]::Min($Port + 100, 65535)) の範囲に空きがありません。"
        exit 1
    }
    Write-Host "ポート $Port は使用中のため、空いているポート $fallbackPort を使用します。"
    $Port = $fallbackPort
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[エラー] Node.js が見つかりません。Node.js 20 以上をインストールしてください。"
    exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules/vite/bin/vite.js"))) {
    Write-Host "初回起動の依存パッケージを準備しています..."
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[エラー] パッケージの準備に失敗しました。"
        exit $LASTEXITCODE
    }
}

$url = "http://127.0.0.1:$Port"
Write-Host "真戦武将帳を起動しています。準備ができるとブラウザが自動で開きます。"
Write-Host "URL: $url"
Write-Host "終了する場合は、この画面で Ctrl+C を押してください。"
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
    (Join-Path $PSScriptRoot "open_when_ready.ps1"), "-Url", $url
) -WindowStyle Hidden

& npm.cmd run dev -- --host 127.0.0.1 --port $Port
if ($LASTEXITCODE -ne 0) {
    Write-Host "[エラー] 起動に失敗しました。別のポートを指定する場合は start.cmd 4300 のように実行してください。"
}
exit $LASTEXITCODE
