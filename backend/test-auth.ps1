# Test Authentication Flow
$baseUrl = "http://localhost:5000/api/auth"
$teamName = "TestSquad_$(Get-Random)"
$accessKey = "TEST_KEY_$(Get-Random)"
$password = "testpass123"

Write-Host "--- 1. Registering Team: $teamName ---" -ForegroundColor Cyan
$regBody = @{
    name = $teamName
    accessKey = $accessKey
    password = $password
    members = @("Member 1", "Member 2")
} | ConvertTo-Json

$regResponse = Invoke-RestMethod -Uri "$baseUrl/register" -Method Post -Body $regBody -ContentType "application/json"
$regResponse | ConvertTo-Json

Write-Host "`n--- 2. Logging In ---" -ForegroundColor Cyan
$loginBody = @{
    accessKey = $accessKey
    password = $password
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $loginBody -ContentType "application/json"
$loginResponse | ConvertTo-Json

if ($loginResponse.token) {
    Write-Host "`n✅ Success! Received Token: $($loginResponse.token.Substring(0, 20))..." -ForegroundColor Green
    Write-Host "Team Details:" -ForegroundColor Green
    $loginResponse.team | ConvertTo-Json
} else {
    Write-Host "`n❌ Login Failed" -ForegroundColor Red
}
