# BetManager — Verificacao do Ambiente de Desenvolvimento
# Execute com: Right-click > "Executar com PowerShell"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BetManager - Verificacao do Ambiente  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Check-Tool {
    param($name, $command, $expected)
    try {
        $version = Invoke-Expression $command 2>&1 | Select-Object -First 1
        Write-Host "  [OK] $name" -ForegroundColor Green -NoNewline
        Write-Host " — $version" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "  [--] $name nao encontrado" -ForegroundColor Red
        return $false
    }
}

Write-Host "--- Runtime & Package Managers ---" -ForegroundColor Yellow
Check-Tool "Node.js"  "node --version"   "v18+"
Check-Tool "npm"      "npm --version"    "9+"
Check-Tool "npx"      "npx --version"    ""

Write-Host ""
Write-Host "--- Banco de Dados ---" -ForegroundColor Yellow
$pgFound  = Check-Tool "PostgreSQL (psql)" "psql --version"     "15+"
$myFound  = Check-Tool "MySQL"             "mysql --version"    "8+"

Write-Host ""
Write-Host "--- Docker ---" -ForegroundColor Yellow
$dockerFound  = Check-Tool "Docker"         "docker --version"         ""
$composeFound = Check-Tool "Docker Compose" "docker compose version"   ""

Write-Host ""
Write-Host "--- Ferramentas de Dev ---" -ForegroundColor Yellow
Check-Tool "Git"    "git --version"    ""
Check-Tool "Python" "python --version" "3.10+"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumo para o BetManager              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($dockerFound -and $composeFound) {
    Write-Host "  [OK] Docker OK — PostgreSQL vai rodar em container" -ForegroundColor Green
    Write-Host "       (nao precisa instalar o PostgreSQL localmente)" -ForegroundColor Gray
} else {
    Write-Host "  [!!] Docker nao encontrado — instalar em:" -ForegroundColor Red
    Write-Host "       https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
}

if (-not $pgFound -and $dockerFound) {
    Write-Host "  [OK] PostgreSQL via Docker — sem problema" -ForegroundColor Green
}

if ($myFound) {
    Write-Host "  [i]  MySQL detectado — projeto usara PostgreSQL via Docker" -ForegroundColor Cyan
    Write-Host "       (MySQL nao e necessario para o BetManager)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Pressione qualquer tecla para fechar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
