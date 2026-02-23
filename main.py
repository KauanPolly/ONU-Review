import asyncio
import json
import platform
import re
import socket
import time
import os
import sys
import threading
import webview
import uvicorn
import subprocess # Adicionado para usar as flags de janela
from fastapi import FastAPI, WebSocket
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# --- CONFIGURAÇÕES DO SISTEMA ---
CONFIG = {
    "GW": "192.168.1.1",
    "STABILITY_V4": "1.1.1.1",
    "IPV6_TARGET": "2606:4700:4700::1111",
    "ID_SERVIDOR_WIP": 25529,
    "DOMINIOS": ["uol.com.br", "google.com", "facebook.com", "netflix.com"]
}

# --- FUNÇÃO DE CAMINHO SEGURO (Para o PyInstaller) ---
def get_path(filename):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, filename)
    return os.path.join(os.path.abspath("."), filename)

if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# --- ROTAS DE ARQUIVOS ---
@app.get("/")
async def get_html():
    return FileResponse(get_path("index.html"))

@app.get("/script.js")
async def get_script():
    return FileResponse(get_path("script.js"))

# --- LÓGICA DE DIAGNÓSTICO ---
async def run_diagnostico(websocket: WebSocket):
    # 1. DNS
    await websocket.send_json({"type": "status", "msg": "Analisando Tabelas DNS..."})
    for dom in CONFIG["DOMINIOS"]:
        res = {"dom": dom, "v4": "FALHA", "v6": "FALHA"}
        try:
            start = time.time()
            socket.getaddrinfo(dom, None, socket.AF_INET)
            res["v4"] = f"{(time.time() - start)*1000:.1f}ms"
        except: pass
        try:
            start = time.time()
            socket.getaddrinfo(dom, None, socket.AF_INET6)
            res["v6"] = f"{(time.time() - start)*1000:.1f}ms"
        except: pass
        await websocket.send_json({"type": "dns_row", "data": res})

    # 2. PINGS RÍGIDOS
    fases = [
        (CONFIG["GW"], "STRESS_ONU", True, False),
        (CONFIG["STABILITY_V4"], "INTERNET_V4", False, False),
        (CONFIG["IPV6_TARGET"], "INTERNET_V6", False, True)
    ]
    resumo_pings = []
    for target, name, stress, ipv6 in fases:
        await websocket.send_json({"type": "status", "msg": f"Testando Latência Rígida: {name}..."})
        lats, perdas = [], 0
        for i in range(30):
            param = "-n" if platform.system().lower() == "windows" else "-c"
            cmd = ["ping", param, "1"]
            if stress: cmd.extend(["-l", "1400"])
            if ipv6: cmd.append("-6")
            cmd.append(target)
            try:
                # LOGICA PARA OCULTAR JANELA DO PING
                proc = await asyncio.create_subprocess_exec(
                    *cmd, 
                    stdout=asyncio.subprocess.PIPE,
                    creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == 'Windows' else 0
                )
                stdout, _ = await proc.communicate()
                out = stdout.decode('cp850', errors='ignore')
                match = re.search(r"(\d+)ms", out)
                if match:
                    ms = int(match.group(1))
                    lats.append(ms)
                    await websocket.send_json({"type": "ping_data", "ms": ms, "fase": name})
                else: perdas += 1
            except: perdas += 1
            await asyncio.sleep(0.05)
        med = round(sum(lats)/len(lats), 1) if lats else 0
        jit = (max(lats) - min(lats)) if lats else 0
        loss_pct = round((perdas/30)*100, 1)
        resumo_pings.append({"nome": name, "med": med, "jit": jit, "loss": loss_pct})

    # 3. SPEEDTEST TRIPLO
    downs, ups = [], []
    for i in range(3):
        await websocket.send_json({"type": "status", "msg": f"Speedtest Wip Telecom: Rodada {i+1}/3..."})
        try:
            exe_path = get_path("speedtest.exe")
            cmd = [exe_path, "--server-id", str(CONFIG["ID_SERVIDOR_WIP"]), "--format", "json", "--accept-license", "--accept-gdpr"]
            
            # LOGICA PARA OCULTAR JANELA DO SPEEDTEST
            proc = await asyncio.create_subprocess_exec(
                *cmd, 
                stdout=asyncio.subprocess.PIPE, 
                stderr=asyncio.subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == 'Windows' else 0
            )
            stdout, _ = await proc.communicate()
            if not stdout: raise Exception("Falha de rede")
            data = json.loads(stdout.decode('utf-8'))
            d = (data["download"]["bandwidth"] * 8) / 10**6
            u = (data["upload"]["bandwidth"] * 8) / 10**6
            downs.append(d)
            ups.append(u)
            await websocket.send_json({"type": "speed_step", "down": round(d, 2), "up": round(u, 2), "index": i+1})
        except:
            await websocket.send_json({"type": "speed_step", "down": "ERRO", "up": "ERRO", "index": i+1})

    ipv6_ativo = any(p["nome"] == "INTERNET_V6" and p["loss"] < 100 for p in resumo_pings)
    avg_d = round(sum(downs)/len(downs), 2) if downs else 0
    avg_u = round(sum(ups)/len(ups), 2) if ups else 0
    await websocket.send_json({
        "type": "final", "avg_down": avg_d, "avg_up": avg_u, "pings": resumo_pings, "ipv6_ativo": ipv6_ativo
    })

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        try:
            data = await websocket.receive_text()
            if data == "start": await run_diagnostico(websocket)
        except: break

# --- EXECUÇÃO ---
def run_fastapi():
    # Roda o servidor FastAPI silenciosamente
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

if __name__ == "__main__":
    # 1. Inicia o servidor em uma thread separada
    server_thread = threading.Thread(target=run_fastapi, daemon=True)
    server_thread.start()

    # 2. Cria a janela do aplicativo
    print("[!] ONU Review Pro: Iniciando interface nativa...")
    webview.create_window(
        'ONU Review Pro', 
        'http://127.0.0.1:8000',
        width=1200, 
        height=850,
        background_color='#0b1120'
    )
    
    # 3. Inicia a janela
    webview.start()