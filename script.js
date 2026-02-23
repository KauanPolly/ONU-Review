// CONFIGURAÇÃO DO GRÁFICO APEXCHARTS
var options = {
    series: [{ name: 'Stress ONU', data: [] }, { name: 'Internet v4', data: [] }, { name: 'Internet v6', data: [] }],
    chart: { height: 250, type: 'line', animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 100 } }, toolbar: { show: false } },
    colors: ['#06b6d4', '#8b5cf6', '#ec4899'],
    stroke: { curve: 'smooth', width: 3 },
    xaxis: { labels: { show: false }, tooltip: { enabled: false } },
    theme: { mode: 'dark' },
    grid: { borderColor: '#1e293b' },
    legend: { position: 'bottom', horizontalAlign: 'center' }
};

var chart = new ApexCharts(document.querySelector("#chartPing"), options);
chart.render();

// VARIÁVEIS GLOBAIS
let pingsData = { 'STRESS_ONU': [], 'INTERNET_V4': [], 'INTERNET_V6': [] };
let ws = new WebSocket("ws://127.0.0.1:8000/ws");

// FUNÇÃO PARA INICIAR OS TESTES
function start() {
    // Resetar UI
    document.getElementById('dnsV4').innerHTML = "";
    document.getElementById('dnsV6').innerHTML = "";
    document.getElementById('tabelaResumo').innerHTML = "";
    document.getElementById('painelFinal').classList.add('hidden');
    document.getElementById('loader').classList.remove('hidden');

    for (let i = 1; i <= 3; i++) {
        document.getElementById(`sp${i}_d`).className = "text-xl font-bold text-white";
        document.getElementById(`sp${i}_u`).className = "text-xl font-bold text-white";
        document.getElementById(`sp${i}_d`).innerText = "--";
        document.getElementById(`sp${i}_u`).innerText = "--";
    }

    // Resetar Dados do Gráfico
    pingsData = { 'STRESS_ONU': [], 'INTERNET_V4': [], 'INTERNET_V6': [] };
    chart.updateSeries([{ data: [] }, { data: [] }, { data: [] }]);

    // Enviar comando para o Python
    ws.send("start");

    // Atualizar Botão
    let btn = document.getElementById('btn');
    btn.disabled = true;
    btn.innerText = "TESTANDO...";
    btn.classList.add("cursor-not-allowed", "opacity-50");
}

// OUVINTE DE MENSAGENS DO WEBSOCKET
ws.onmessage = (e) => {
    let msg = JSON.parse(e.data);

    if (msg.type === "status") {
        document.getElementById('status').innerText = msg.msg;
    }

    if (msg.type === "dns_row") {
        let colorV4 = msg.data.v4 === "FALHA" ? "text-rose-500 font-bold" : "text-slate-400 font-mono";
        let colorV6 = msg.data.v6 === "FALHA" ? "text-rose-500 font-bold" : "text-purple-400 font-mono";

        document.getElementById('dnsV4').innerHTML += `<tr><td class="py-1 font-medium">${msg.data.dom}</td><td class="text-right ${colorV4}">${msg.data.v4}</td></tr>`;
        document.getElementById('dnsV6').innerHTML += `<tr><td class="py-1 font-medium">${msg.data.dom}</td><td class="text-right ${colorV6}">${msg.data.v6}</td></tr>`;
    }

    if (msg.type === "ping_data") {
        pingsData[msg.fase].push(msg.ms);
        chart.updateSeries([
            { data: pingsData['STRESS_ONU'] },
            { data: pingsData['INTERNET_V4'] },
            { data: pingsData['INTERNET_V6'] }
        ]);
    }

    if (msg.type === "speed_step") {
        let elD = document.getElementById(`sp${msg.index}_d`);
        let elU = document.getElementById(`sp${msg.index}_u`);
        elD.innerText = msg.down;
        elU.innerText = msg.up;

        if (msg.down === "ERRO") elD.className = "text-xl font-black text-rose-500";
        if (msg.up === "ERRO") elU.className = "text-xl font-black text-rose-500";
    }

    if (msg.type === "final") {
        document.getElementById('status').innerText = "Testes concluídos com sucesso!";
        document.getElementById('loader').classList.add('hidden');

        let btn = document.getElementById('btn');
        btn.disabled = false;
        btn.innerText = "REFAZER REVIEW";
        btn.classList.remove("cursor-not-allowed", "opacity-50");

        document.getElementById('painelFinal').classList.remove('hidden');
        document.getElementById('finalDown').innerText = msg.avg_down;
        document.getElementById('finalUp').innerText = msg.avg_up;

        // Selos de Qualidade
        let selo = document.getElementById('selo');
        if (msg.avg_down > 200) {
            selo.innerText = "✅ APTO PARA 4K / GIGABIT";
            selo.className = "mt-2 inline-block px-4 py-2 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
        } else if (msg.avg_down === 0) {
            selo.innerText = "❌ FALHA NO TESTE DE REDE";
            selo.className = "mt-2 inline-block px-4 py-2 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30";
        } else {
            selo.innerText = "⚠️ PERFORMANCE LIMITADA";
            selo.className = "mt-2 inline-block px-4 py-2 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30";
        }

        let seloIpv6 = document.getElementById('seloIpv6');
        if (msg.ipv6_ativo) {
            seloIpv6.innerText = "🌐 IPV6 ATIVO";
            seloIpv6.className = "mt-2 inline-block px-4 py-2 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30";
        } else {
            seloIpv6.innerText = "🚫 SEM IPV6";
            seloIpv6.className = "mt-2 inline-block px-4 py-2 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30";
        }

        // Tabela de Resumo Técnico
        msg.pings.forEach(p => {
            let statusIcon = "✅";
            let rowClass = "text-emerald-400";
            let medText = `${p.med}ms`;
            let jitText = `${p.jit}ms`;

            if (p.loss === 100) {
                statusIcon = "❌";
                rowClass = "text-rose-500 font-bold bg-rose-500/5";
                medText = "---";
                jitText = "---";
            } else if (p.loss > 0 || p.jit > 20) {
                statusIcon = "❌";
                rowClass = "text-rose-400 font-bold";
            } else if (p.jit > 5 || p.med > 30) {
                statusIcon = "⚠️";
                rowClass = "text-amber-400 font-bold";
            }

            document.getElementById('tabelaResumo').innerHTML += `
                <tr class="${rowClass}">
                    <td class="py-3 font-bold px-2">${p.nome}</td>
                    <td class="py-3 font-mono">${medText}</td>
                    <td class="py-3 font-mono">${jitText}</td>
                    <td class="py-3 font-mono">${p.loss}%</td>
                    <td class="py-3 text-center text-lg">${statusIcon}</td>
                </tr>`;
        });
    }
};