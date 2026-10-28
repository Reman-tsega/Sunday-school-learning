# ==============================================================================
# EOTC Senbet Tmhrtbet Learning Platform — Automated Database Backup Script
# Platform: Windows PowerShell / PostgreSQL 16
# Usage: .\scripts\backup-db.ps1 [-BackupDir <path>] [-KeepDays <int>]
# ==============================================================================

param (
    [string]$BackupDir = ".\backups",
    [int]$KeepDays = 14,
    [string]$ContainerName = "",
    [string]$DbUser = "postgres",
    [string]$DbName = "eotc_learning"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  EOTC Learning Platform Database Backup Utility" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Auto-detect container if not specified
if (-not $ContainerName) {
    $Candidates = @("eotc-postgres", "chuchu-postgres")
    foreach ($cand in $Candidates) {
        $found = docker ps --filter "name=$cand" --filter "status=running" -q
        if ($found) {
            $ContainerName = $cand
            break
        }
    }
    if (-not $ContainerName) {
        # Fallback to any running container matching postgres
        $AnyPostgres = docker ps --filter "ancestor=postgres:16-alpine" --filter "status=running" --format "{{.Names}}"
        if ($AnyPostgres) {
            $ContainerName = ($AnyPostgres -split "`n")[0].Trim()
        }
    }
}

# 2. Ensure backup directory exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "Created backup directory: $BackupDir" -ForegroundColor Green
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "eotc_learning_backup_$Timestamp.sql"

Write-Host "Target database: $DbName on container: $ContainerName"
Write-Host "Output file: $BackupFile"

# 3. Check if Docker container is running
$ContainerRunning = if ($ContainerName) { docker ps --filter "name=$ContainerName" --filter "status=running" -q } else { $null }
if (-not $ContainerRunning) {
    Write-Warning "No active PostgreSQL Docker container detected. Attempting direct pg_dump..."
    try {
        & pg_dump -U $DbUser -d $DbName -F p -f $BackupFile
    } catch {
        Write-Error "Failed to execute pg_dump locally and Docker container is down."
        exit 1
    }
} else {
    Write-Host "Executing pg_dump inside Docker container '$ContainerName'..." -ForegroundColor Yellow
    docker exec -t $ContainerName pg_dump -U $DbUser -d $DbName --clean --if-exists > $BackupFile
}

# 4. Verify backup file exists and has non-zero size
if ((Test-Path $BackupFile) -and ((Get-Item $BackupFile).Length -gt 0)) {
    $Length = (Get-Item $BackupFile).Length
    $FileSizeKB = [math]::Round(($Length / 1024), 2)
    Write-Host "SUCCESS: Backup completed successfully! Size: $FileSizeKB KB" -ForegroundColor Green
    Write-Host "File saved to: $BackupFile" -ForegroundColor Cyan
} else {
    Write-Error "ERROR: Backup verification failed: file is missing or 0 bytes."
    exit 1
}

# 5. Enforce retention policy
Write-Host "Cleaning up backups older than $KeepDays days..." -ForegroundColor Gray
$CutoffDate = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem -Path $BackupDir -Filter "eotc_learning_backup_*.sql" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | ForEach-Object {
    Write-Host "Removing expired backup: $($_.Name)" -ForegroundColor DarkGray
    Remove-Item $_.FullName -Force
}

Write-Host "SUCCESS: Database backup pipeline complete." -ForegroundColor Green
