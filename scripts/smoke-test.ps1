# ==============================================================================
# EOTC Senbet Tmhrtbet Learning Platform — Production Smoke Test Utility
# Usage: .\scripts\smoke-test.ps1 [-BaseUrl <url>]
# ==============================================================================

param (
    [string]$BaseUrl = "http://localhost:4000"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  EOTC Platform Production Smoke Test Suite" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Base URL: $BaseUrl" -ForegroundColor Gray

$Passed = 0
$Failed = 0

function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Path,
        [int]$ExpectedStatus = 200,
        [scriptblock]$Validator = $null
    )

    $Url = "$BaseUrl$Path"
    Write-Host -NoNewline "[*] Testing: $Name ($Path) ... "

    try {
        $Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $Response = $null
        try {
            $Response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 10 -UseBasicParsing
        } catch {
            if ($_.Exception.Response) {
                $Response = $_.Exception.Response
            } else {
                throw $_
            }
        }
        $Stopwatch.Stop()
        $DurationMs = $Stopwatch.ElapsedMilliseconds

        $StatusCode = [int]$Response.StatusCode

        if ($StatusCode -eq $ExpectedStatus) {
            $BodyText = ""
            if ($Response.Content) {
                $BodyText = $Response.Content
            } elseif ($Response.GetResponseStream) {
                $Stream = $Response.GetResponseStream()
                $Reader = New-Object System.IO.StreamReader($Stream)
                $BodyText = $Reader.ReadToEnd()
            }

            $Body = $BodyText | ConvertFrom-Json -ErrorAction SilentlyContinue

            if ($Validator -and $Body) {
                $Valid = & $Validator $Body
                if (-not $Valid) {
                    Write-Host "FAILED (Validation check failed) [${DurationMs}ms]" -ForegroundColor Red
                    $script:Failed++
                    return
                }
            }

            Write-Host "PASSED (${DurationMs}ms)" -ForegroundColor Green
            $script:Passed++
        } else {
            Write-Host "FAILED (Expected $ExpectedStatus, got $StatusCode) [${DurationMs}ms]" -ForegroundColor Red
            $script:Failed++
        }
    } catch {
        Write-Host "ERROR ($($_.Exception.Message))" -ForegroundColor Red
        $script:Failed++
    }
}

# 1. API Health Check
Test-Endpoint -Name "API System Health" -Path "/api/health" -ExpectedStatus 200 -Validator {
    param($body)
    $status = if ($body.data -and $body.data.status) { $body.data.status } else { $body.status }
    return ($status -eq "healthy" -or $status -eq "OK" -or $status -eq "UP")
}

# 2. Database Connectivity
Test-Endpoint -Name "Database Connection State" -Path "/api/health" -ExpectedStatus 200 -Validator {
    param($body)
    $db = if ($body.data -and $body.data.database) { $body.data.database } else { $body.database }
    return ($db -eq "connected" -or $db -eq "CONNECTED" -or $db -eq "UP")
}

# 3. Public Curriculum Discovery
Test-Endpoint -Name "Curriculum Grades Hierarchy" -Path "/api/curriculum/grades" -ExpectedStatus 200 -Validator {
    param($body)
    return ($body.success -eq $true -and ($body.data.Count -gt 0))
}

# 4. RBAC Protection — Admin Users endpoint requires authentication
Test-Endpoint -Name "RBAC Guard (Admin Users 401 Rejection)" -Path "/api/admin/users" -ExpectedStatus 401

# 5. RBAC Protection — Student Curriculum endpoint requires authentication
Test-Endpoint -Name "RBAC Guard (Student Curriculum 401 Rejection)" -Path "/api/student/curriculum" -ExpectedStatus 401

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Smoke Test Results: $Passed Passed, $Failed Failed" -ForegroundColor $(if ($Failed -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Failed -gt 0) {
    exit 1
}
