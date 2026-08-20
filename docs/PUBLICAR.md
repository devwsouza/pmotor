# Como publicar o PreçoPro no GitHub

## Antes de tudo: onde o push acontece

Este ambiente de construção **compila e exibe o app — ele não tem integração com Git/GitHub**.
Publicar significa rodar os comandos **no seu computador** (ou via GitHub Desktop).
Portanto: primeiro baixe/exporte o projeto daqui (procure a opção de download/export do
ambiente) e depois siga abaixo.

## Pré-requisitos

- Git instalado: <https://git-scm.com/downloads> (abra um terminal novo depois de instalar)
- Conta no GitHub
- GitHub CLI (opcional, mas resolve 90% dos erros de autenticação): <https://cli.github.com>

## Passo a passo (terminal, na pasta do projeto)

### 1. Crie o repositório no GitHub VAZIO

Sem README, sem .gitignore, sem licença. (Esses arquivos extras são a causa nº 1 de erro
no primeiro push.)

### 2. Publique

```bash
git init -b main
git add .
git commit -m "feat: MVP PreçoPro Nails — Pricing Engine core (SPEC-001)"
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

## Erros comuns e soluções

| Erro | Causa | Solução |
| --- | --- | --- |
| `'git' não é reconhecido` | Git não instalado / terminal antigo | Instale e **reabra** o terminal |
| `not a git repository` | Faltou inicializar | `git init -b main` |
| `remote origin already exists` | Remote já apontado | `git remote set-url origin URL` |
| `failed to push / non-fast-forward` | Repositório criado com README | `git pull origin main --rebase --allow-unrelated-histories` e depois `git push -u origin main` |
| `Authentication failed` ou pediu senha | GitHub não aceita mais senha desde 2021 | `gh auth login` (GitHub CLI) ou chave SSH |
| `could not read Username for 'github.com'` | Sem credencial salva | `gh auth login` |

## Sem terminal: GitHub Desktop

1. Instale: <https://desktop.github.com>
2. **File → Add Local Repository** → selecione a pasta do projeto
3. Se avisar que não é repositório, clique em **"create a repository"** (mantenha o caminho)
4. **Repository → Publish** → desmarque "Keep this code private" se quiser público → **Publish**

## Depois do primeiro push (rotina)

```bash
git checkout -b feat/minha-mudanca   # nunca trabalhe direto na main
git add .
git commit -m "feat: descrição curta"
git push -u origin feat/minha-mudanca
# → abra o Pull Request no GitHub; o CI (typecheck → testes → build) roda sozinho
```

## Trava de segurança (2 minutos)

GitHub → **Settings → Rules → Add branch rules** → branch `main` →
marque **"Require status checks to pass"** e selecione `quality`.
Merge com motor quebrado fica bloqueado automaticamente.
