# ============================================================
# GUIA: Como enviar as correções para o GitHub e Vercel
# Execute no PowerShell dentro da pasta raiz do Consuflow
# ============================================================

# 1. Entrar na pasta raiz do projeto
cd "C:\Users\SEU_USUARIO\Desktop\PASTA DE PROJETOS\Consuflow"

# 2. Verificar se o git já está configurado
git remote -v
# Deve mostrar: origin https://github.com/vitoriaservicosdepintura-arch/consulflow.git

# 3. Se ainda não tiver o remote configurado, adicionar:
git remote add origin https://github.com/vitoriaservicosdepintura-arch/consulflow.git

# 4. Copiar os 3 arquivos corrigidos para o lugar certo:
#    - server/server.js      → substitui o arquivo atual
#    - server/package.json   → substitui o arquivo atual
#    - vercel.json           → cria na raiz do projeto

# 5. Adicionar os arquivos modificados ao git
git add server/server.js
git add server/package.json
git add vercel.json
git add INICIAR_SERVIDOR.ps1

# 6. Fazer o commit
git commit -m "fix: servidor WhatsApp com detecção automática de Chrome e script de start"

# 7. Enviar para o GitHub
git push origin main
# (se der erro, tente: git push origin master)

# ============================================================
# PRONTO! O Vercel vai detectar o push e fazer o deploy
# automaticamente do frontend em:
# consulflow-g9s53n3t5-mayckons-projects-14900d80.vercel.app
# ============================================================

# IMPORTANTE: O servidor backend (server.js) precisa rodar
# no seu PC local — o Vercel só hospeda o frontend React.
# Para o WhatsApp funcionar remotamente, precisaria de um
# servidor VPS separado (Railway, Render, etc.)
