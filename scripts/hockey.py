#!/usr/bin/env python3

import requests
import json
import time
from datetime import datetime

# =========================
# CONFIG
# =========================

NHL_BASE = "https://api-web.nhle.com/v1"

# 🔴 PASTE YOUR DISCORD WEBHOOK URL HERE
DISCORD_WEBHOOK = "https://discordapp.com/api/webhooks/1450686600018268223/IgY-TOmnzhlwkx0Uu1qawgbNRnIddrLIvhjpbIEFjWpHS4GbBXXwOrpugSwKfL9cef_G"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (hockey-signal-bot)"
}

CHECK_INTERVAL = 30  # seconds between checks


# =========================
# DISCORD ALERT
# =========================

def send_discord(message: str):
    payload = {
        "content": message
    }

    try:
        r = requests.post(
            DISCORD_WEBHOOK,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=10
        )
        if r.status_code == 204:
            print("📨 Discord alert sent")
        else:
            print("⚠️ Discord error:", r.text)
    except Exception as e:
        print("⚠️ Discord send failed:", e)


# =========================
# NHL HELPERS
# =========================

def get_live_games():
    url = f"{NHL_BASE}/schedule/now"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            print("⚠️ NHL API non-200 response")
            return []
        return r.json().get("games", [])
    except requests.exceptions.RequestException as e:
        print("🌐 Network issue fetching live games:", e)
        return []


def fetch_game(game_id):
    url = f"{NHL_BASE}/gamecenter/{game_id}/live"
    r = requests.get(url, headers=HEADERS, timeout=10)

    if r.status_code != 200 or not r.text.strip():
        return None

    return r.json()


# =========================
# BET SIGNAL LOGIC
# =========================

def check_signal(game):
    period = game["periodDescriptor"]["number"]
    time_remaining = game["clock"]["timeRemaining"]

    home = game["homeTeam"]["name"]["default"]
    away = game["awayTeam"]["name"]["default"]

    home_score = game["homeTeam"]["score"]
    away_score = game["awayTeam"]["score"]

    mins, secs = map(int, time_remaining.split(":"))
    seconds_left = mins * 60 + secs
    score_diff = abs(home_score - away_score)

    print(f"{home} {home_score} — {away_score} {away} | P{period} {time_remaining}")

    # 🎯 YOUR BETTING RULE
    if period == 2 and seconds_left <= 180 and score_diff == 1:
        losing_team = home if home_score < away_score else away

        message = (
            f"⚡️ **BET SIGNAL** ⚡️\n\n"
            f"🏒 {home} {home_score} — {away_score} {away}\n"
            f"⏱ Period 2 — {time_remaining} remaining\n\n"
            f"📉 Losing Team Likely to Score Next:\n"
            f"➡️ **{losing_team}**\n\n"
            f"🧠 Reason: Late 2nd-period pressure with close score\n"
            f"🕒 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )

        send_discord(message)
        return True

    return False


# =========================
# MAIN LOOP
# =========================

def main():
    print("🏒 Hockey signal bot started\n")

    triggered_games = set()

    while True:
        games = get_live_games()

        if not games:
            print("No live games.")
            time.sleep(CHECK_INTERVAL)
            continue

        for g in games:
            game_id = g["id"]

            # Prevent duplicate alerts per game
            if game_id in triggered_games:
                continue

            game_data = fetch_game(game_id)
            if not game_data:
                continue

            triggered = check_signal(game_data)
            if triggered:
                triggered_games.add(game_id)

        time.sleep(CHECK_INTERVAL)


# =========================
# ENTRY
# =========================

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped by user.")
