param(
    [Parameter(Mandatory = $true)]
    [string]$Url
)

$ErrorActionPreference = "SilentlyContinue"
for ($attempt = 0; $attempt -lt 120; $attempt++) {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 1
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Start-Process $Url
        exit 0
    }
    Start-Sleep -Milliseconds 500
}

Write-Host "ブラウザを自動で開けませんでした。手動で $Url を開いてください。"
exit 1
