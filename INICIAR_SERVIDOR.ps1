# ============================================================
# Consuflow - Script de instalação e inicialização do servidor
# Execute no PowerShell como Administrador
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Consuflow - Instalação do Servidor    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Detectar pasta do projeto automaticamente
$possiblePaths = @(
    "$env:USERPROFILE\Desktop\PASTA DE PROJETOS\Consuflow\server",
    "$env:USERPROFILE\Desktop\Consuflow\server",
    "$env:USERPROFILE\Documents\Consuflow\server",
    "C:\Users\$env:USERNAME\Desktop\PASTA DE PROJETOS\Consuflow\server"
)

$serverPath = $null
foreach ($p in $possiblePaths) {
    if (Test-Path $p) {
        $serverPath = $p
        break
    }
}

if (-not $serverPath) {
    Write-Host "Pasta do servidor nao encontrada automaticamente." -ForegroundColor Yellow
    $serverPath = Read-Host "Cole o caminho completo da pasta 'server' do Consuflow"
}

Write-Host "✅ Pasta encontrada: $serverPath" -ForegroundColor Green
Set-Location $serverPath

# Verificar Node.js
Write-Host ""
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js $nodeVersion encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js nao encontrado! Instale em https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Instalar dependências
Write-Host ""
Write-Host "Instalando dependências (pode demorar alguns minutos)..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no npm install!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando servidor WhatsApp...        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Mantenha esta janela ABERTA enquanto usa o sistema." -ForegroundColor Yellow
Write-Host "Acesse o painel em: http://localhost:8080" -ForegroundColor Cyan
Write-Host ""

# Iniciar servidor
node server.js
