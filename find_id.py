import speedtest

def buscar_id_global():
    print("Obtendo a lista GLOBAL de servidores (isso pode levar alguns segundos)...")
    try:
        st = speedtest.Speedtest()
        # Passar uma lista vazia [] força o download de todos os servidores do mundo
        all_servers = st.get_servers([]) 
        
        encontrado = False
        print("Pesquisando por 'Wip' ou 'Arealva'...")
        
        for server_list in all_servers.values():
            for s in server_list:
                # Verificamos tanto o patrocinador quanto o nome da cidade
                sponsor = str(s.get('sponsor', '')).lower()
                name = str(s.get('name', '')).lower()
                
                if "wip" in sponsor or "arealva" in name:
                    print(f"ID: {s['id']} | Patrocinador: {s['sponsor']} | Local: {s['name']}")
                    encontrado = True
        
        if not encontrado:
            print("Não encontramos nenhum servidor com 'Wip' ou 'Arealva' na lista atual.")
            
    except Exception as e:
        print(f"Erro ao conectar com o Speedtest: {e}")

if __name__ == "__main__":
    buscar_id_global()