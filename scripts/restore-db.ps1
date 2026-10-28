# ==============================================================================
# EOTC Senbet Tmhrtbet Learning Platform — Database Restore Script
# Platform: Windows PowerShell / PostgreSQL 16
# Usage: .\scripts\restore-db.ps1 -BackupFile <path_to_sql> [-Force]
# ==============================================================================

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [switch]$Force,
    [string]$ContainerName = "",
    [string]$DbUser = "postgres",
    [string]$DbName = "eotc_learning"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "  EOTC Learning Platform Database Restore Utility" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

# 1. Verify backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found at path: $BackupFile"
    exit 1
}

$Length = (Get-Item $BackupFile).Length
$FileSizeKB = [math]::Round(($Length / 1024), 2)
Write-Host "Selected backup file: $BackupFile ($FileSizeKB KB)"

# 2. Auto-detect container if not specified
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
        $AnyPostgres = docker ps --filter "ancestor=postgres:16-alpine" --filter "status=running" --format "{{.Names}}"
        if ($AnyPostgres) {
            $ContainerName = ($AnyPostgres -split "`n")[0].Trim()
        }
    }
}

Write-Host "Target database: $DbName on container: $ContainerName"

# 3. Confirmation prompt (unless -Force is specified)
if (-not $Force) {
    Write-Warning "WARNING: Restoring the database will overwrite existing tables and records!"
    $Confirmation = Read-Host "Are you sure you want to proceed with restore? (type 'YES' to confirm)"
    if ($Confirmation -ne "YES") {
        Write-Host "Restore cancelled by user." -ForegroundColor Gray
        exit 0
    }
}

# 4. Check if Docker container is running
$ContainerRunning = if ($ContainerName) { docker ps --filter "name=$ContainerName" --filter "status=running" -q } else { $null }
if (-not $ContainerRunning) {
    Write-Warning "No active PostgreSQL Docker container detected. Attempting direct psql..."
    try {
        & psql -U $DbUser -d $DbName -f $BackupFile
    } catch {
        Write-Error "Failed to execute psql locally and Docker container is down."
        exit 1
    }
} else {
    Write-Host "Restoring into Docker container '$ContainerName'..." -ForegroundColor Cyan
    Get-Content $BackupFile | docker exec -i $ContainerName psql -U $DbUser -d $DbName
}

# 5. Verification check
Write-Host "Verifying database connectivity and schema..." -ForegroundColor Cyan
if ($ContainerRunning) {
    $TableCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    Write-Host "SUCCESS: Database restored successfully! Active public tables: $($TableCount.Trim())" -ForegroundColor Green
} else {
    Write-Host "SUCCESS: Database restore command executed successfully." -ForegroundColor Green
}
