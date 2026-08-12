#!/bin/bash
# Démarre uniquement le tunnel ngrok (pointe vers le client, port 5180).
# Le proxy Vite se charge de relayer l'API et les websockets vers le serveur (port 3000).

set -e

if ! command -v ngrok &> /dev/null; then
    echo "[ERREUR] ngrok n'est pas installé ou pas dans le PATH."
    echo "Installation : https://ngrok.com/download, puis 'ngrok config add-authtoken <TOKEN>'"
    exit 1
fi

echo "Le lien à partager s'affichera ici, et directement dans l'écran de salon (RoomLink)."
echo ""

pkill -f "ngrok http 5180" 2>/dev/null || true
sleep 1

ngrok http 5180
