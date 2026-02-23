# 🚀 ONU Review Pro

![Dashboard ONU Review Pro](https://github.com/KauanPolly/ONU-Review/issues/1#issue-3978054778)

O **ONU Review Pro** é uma ferramenta de diagnóstico de rede de alta performance desenvolvida para técnicos e reviewers de hardware. O foco é extrair o máximo de detalhes sobre a estabilidade da conexão, latência em tempo real e performance Gigabit.

## 🛠️ Tecnologias Utilizadas
* **Backend:** Python com FastAPI e WebSockets para dados em tempo real.
* **Frontend:** HTML5, Tailwind CSS para interface moderna e ApexCharts para gráficos dinâmicos.
* **Desktop:** PyWebView para uma experiência de aplicativo nativo sem bordas de navegador.
* **Motor de Teste:** Integração direta com Speedtest CLI (Ookla).

## ✨ Funcionalidades Principais
* **Monitor de Latência em Tempo Real:** Gráficos simultâneos para Stress de Gateway (ONU), Internet v4 e v6.
* **DNS Checker:** Validação de tempo de resposta para domínios principais em IPv4 e IPv6.
* **Speedtest Triplo:** Realiza três rodadas consecutivas para gerar uma média precisa de Download e Upload.
* **Avaliação Rígida:** Tabela técnica que analisa Jitter e Perda de Pacotes com critérios de qualidade profissional.
* **Foco em IPv6:** Diagnóstico dedicado para confirmar a entrega de IPv6 nativo.

## 📦 Como rodar o projeto (Desenvolvimento)
1. Instale as dependências:
   ```bash
   pip install fastapi uvicorn webview pyinstaller
