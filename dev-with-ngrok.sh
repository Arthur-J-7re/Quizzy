#!/bin/bash
# Mode jeu local : lance la DB (docker), le serveur, le client, et un tunnel ngrok
# sur le client (port 5180). Le proxy Vite relaie l'API/websockets vers le serveur,
# donc un seul tunnel ngrok suffit (limite du plan gratuit).
#
# Les joueurs distants utilisent le lien ngrok affiché ci-dessous (et dans l'écran
# de salon du jeu, via RoomLink) ; l'hôte peut lui continuer à utiliser localhost.

set -e
cd "$(dirname "$0")"

if ! command -v ngrok &> /dev/null; then
    echo "[ERREUR] ngrok n'est pas installé ou pas dans le PATH."
    echo "Installation : https://ngrok.com/download, puis 'ngrok config add-authtoken <TOKEN>'"
    exit 1
fi

PIDS=()
cleanup() {
    echo ""
    echo "[INFO] Arrêt en cours..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    echo "[INFO] Terminé."
}
trap cleanup EXIT INT TERM

if command -v docker &> /dev/null; then
    echo "[1/4] Démarrage de MongoDB (docker compose)..."
    docker compose up -d mongo || echo "[WARN] Impossible de démarrer mongo via docker, vérifie qu'il tourne déjà."
else
    echo "[1/4] docker introuvable : vérifie que MongoDB est joignable via MONGO_URI (server/.env)."
fi

echo "[2/4] Démarrage du serveur (port 3000)..."
(cd server && npm run dev) &
PIDS+=($!)

echo "[3/4] Démarrage du client (port 5180)..."
(cd client && npm run dev) &
PIDS+=($!)

echo "[4/4] Démarrage du tunnel ngrok sur le client (port 5180)..."
pkill -f "ngrok http 5180" 2>/dev/null || true
sleep 1
NGROK_LOG="/tmp/quizzy-ngrok.log"
ngrok http 5180 --log=stdout --log-level=error > "$NGROK_LOG" 2>&1 &
PIDS+=($!)

echo "    En attente du tunnel..."
sleep 3
for _ in $(seq 1 10); do
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
if [ -n "$NGROK_URL" ]; then
    echo "==============================================================="
    echo " Lien à partager avec les joueurs distants :"
    echo "   $NGROK_URL"
    echo "==============================================================="
else
    echo "[WARN] Impossible de récupérer l'URL ngrok (voir $NGROK_LOG)."
fi
echo ""
echo "Ctrl+C pour tout arrêter (serveur, client, tunnel)."
echo ""

wait
