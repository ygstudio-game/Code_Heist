# Test Code Submission
$baseUrl = "http://localhost:5000/api"
$accessKey = "TEST_KEY_SOLVER" # Assuming a team with this key exists or is created
$password = "testpass123"

Write-Host "--- 1. Registering/Logging in ---" -ForegroundColor Cyan
# For simplicity, let's assume we use the first team from the DB if available, 
# or just run a login if we know the credentials.
# Since I can't easily "know" the current DB state without querying, 
# I'll just write the script and the user can run it after seeding.

$loginBody = @{
    accessKey = "PHANTOM_77"
    password = "team123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token

    Write-Host "✅ Logged in as: $($loginResponse.team.name)" -ForegroundColor Green

    Write-Host "`n--- 2. Submitting Code ---" -ForegroundColor Cyan
    $submitBody = @{
        snippetId = "snippet-001"
        code = "void process() { delete[] ptr; }"
        solverName = "Lokesh"
        solverRole = "TEAM_LEADER"
    } | ConvertTo-Json

    $submitResponse = Invoke-RestMethod -Uri "$baseUrl/code/submit" -Method Post -Body $submitBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
    
    Write-Host "✅ Submission Response:" -ForegroundColor Green
    $submitResponse | ConvertTo-Json
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
