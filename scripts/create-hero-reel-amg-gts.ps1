param(
  [string]$Source = "D:\MARCIN\FILMY - aG\AMG GTS3.mp4",
  [string]$ApiBase = "http://localhost:8001",
  [int]$DurationSeconds = 15,
  [string]$OutputName = "mercedes-amg-gt-s-hero-poc.mp4"
)

$ErrorActionPreference = "Stop"

$clip = "D:\models\media\uploads\idrivecars-amg-gts3-poc-${DurationSeconds}s.mp4"
$publicOut = Join-Path (Get-Location) "public\media\heroes\$OutputName"

if (!(Test-Path $Source)) {
  throw "Source video not found: $Source"
}

New-Item -ItemType Directory -Path "D:\models\media\uploads" -Force | Out-Null
New-Item -ItemType Directory -Path "D:\models\media\montages" -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $publicOut) -Force | Out-Null

try {
  Invoke-RestMethod -Uri "$ApiBase/v1/system/status" -TimeoutSec 5 | Out-Null
} catch {
  throw "Agentic OS API is not available at $ApiBase. Start it first: D:\AGENTIC OS MINT PLUMM\agentic-os\scripts\windows\start-agentic-os.ps1"
}

if (!(Test-Path $clip)) {
  ffmpeg -y -ss 00:00:05 -i $Source -t $DurationSeconds -vf "scale=1920:-2" -an -c:v libx264 -preset veryfast -crf 23 $clip
}

$body = @{
  scope_slug = "personal"
  clips = @(@{ path = $clip })
  width = 1920
  height = 1080
  fps = 30
  style = "cinematic"
  transition = "fade"
  transition_duration = 0.25
  beat_sync = $false
} | ConvertTo-Json -Depth 6

$job = Invoke-RestMethod -Method Post -Uri "$ApiBase/v1/montage/generate" -ContentType "application/json" -Body $body
Write-Host "Queued montage job:" $job.id

for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 5
  $status = Invoke-RestMethod -Uri "$ApiBase/v1/montage/jobs/$($job.id)" -TimeoutSec 10
  Write-Host (Get-Date).ToString("HH:mm:ss") $status.status

  if ($status.status -eq "failed") {
    throw "Montage failed: $($status.error_msg)"
  }

  if ($status.status -eq "completed") {
    Copy-Item $status.output_path $publicOut -Force
    Write-Host "Hero reel copied to:" $publicOut
    exit 0
  }
}

throw "Timed out waiting for montage job $($job.id)"
