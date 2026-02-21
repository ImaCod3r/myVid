# 🚀 Guia de Implantação — myVid (Ubuntu VPS)

Este guia fornece instruções passo a passo para hospedar o **myVid** em uma VPS Ubuntu, utilizando **PM2** para gerenciamento de processos, **Nginx** como proxy reverso e **Certbot** para SSL (HTTPS).

---

## 🏗️ 1. Preparação do Sistema

Acesse sua VPS via SSH e atualize os pacotes:

```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar Node.js e NPM

Recomendamos o Node.js 18 ou superior:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Instalar Python e FFmpeg (Essenciais)

O `yt-dlp` requer Python e o processamento de vídeo requer FFmpeg:

```bash
sudo apt install -y python3 ffmpeg
```

---

## 📂 2. Clonando o Projeto

Vá para o diretório web e clone seu repositório:

```bash
cd /var/www
# Substitua pela URL do seu repositório
git clone https://github.com/Imacod3r/myVid.git
cd myVid
npm install
```

---

## ⚙️ 3. Configurando o PM2

O PM2 manterá sua aplicação rodando 24/7.

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar a aplicação
pm2 start server.js --name "myvid"

# Configurar para iniciar automaticamente no boot do servidor
pm2 startup
# (Siga as instruções que aparecerão na tela para copiar e colar um comando)
pm2 save
```

---

## 🌐 4. Configurando Nginx e Domínio

Crie um arquivo de configuração para o seu domínio:

```bash
sudo nano /etc/nginx/sites-available/meudominio.com
```

Cole o conteúdo abaixo (substituindo `meudominio.com` pelo seu domínio real):

```nginx
server {
    listen 80;
    server_name meudominio.com www.meudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Aumentar timeout para downloads longos
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
```

Ative a configuração:

```bash
sudo ln -s /etc/nginx/sites-available/meudominio.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 5. Ativando SSL (HTTPS) com Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d meudominio.com -d www.meudominio.com
```

Siga as instruções na tela e escolha a opção de **Redirecionar HTTP para HTTPS**.

---

## 🛠️ Manutenção Útil

- **Ver logs**: `pm2 logs myvid`
- **Reiniciar app**: `pm2 restart myvid`
- **Status dos processos**: `pm2 status`
- **Verificar erros do Nginx**: `sudo tail -f /var/log/nginx/error.log`

---

**Dica Pro:** Como o projeto baixa o binário `yt-dlp` automaticamente, certifique-se de que o usuário que executa o PM2 tem permissão de escrita na pasta do projeto.