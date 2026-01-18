from flask import Flask, render_template_string, request, session, redirect, url_for, jsonify
from flask_session import Session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import uuid
import time

app = Flask(__name__)
app.secret_key = "clave_super_segura_cambiala"
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# SocketIO (CORS abierto para pruebas; ajusta en producción)
socketio = SocketIO(app, cors_allowed_origins="*")

# Usuarios (simulados; usa BD en producción)
USERS = {
    "admin": generate_password_hash("1234"),
    "daniel": generate_password_hash("mi_pass")
}

# Estado del servidor (en memoria)
PLAYERS = {}  # player_id -> {name, x, y, hp, sid, ts}
ROOM = "mundo"

# HTML mínimo para probar (puedes servir tu juego real en /game)
INDEX_HTML = """
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Caritas Exploradoras</title></head>
<body>
  {% if 'user' not in session %}
    <h1>Caritas Exploradoras</h1>
    <form method="post" action="{{ url_for('login') }}">
      <input name="username" placeholder="Usuario">
      <input name="password" type="password" placeholder="Contraseña">
      <button type="submit">Iniciar sesión</button>
    </form>
    <form method="post" action="{{ url_for('guest') }}">
      <button type="submit">Jugar sin cuenta</button>
    </form>
  {% else %}
    <h2>Bienvenido {{ session['user'] }} (rol: {{ session.get('role','user') }})</h2>
    <a href="{{ url_for('game') }}">Entrar al juego</a> |
    <a href="{{ url_for('logout') }}">Cerrar sesión</a>
  {% endif %}
</body>
</html>
"""

GAME_HTML = """
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"><title>Juego</title>
  <style>body{font-family:sans-serif} #log{height:160px;overflow:auto;border:1px solid #ccc;padding:8px}</style>
</head>
<body>
  <h2>Juego en tiempo real</h2>
  <div>Jugador: <b id="me"></b></div>
  <div>Posición: <span id="pos">0,0</span></div>
  <button onclick="move(1,0)">→</button>
  <button onclick="move(-1,0)">←</button>
  <button onclick="move(0,1)">↓</button>
  <button onclick="move(0,-1)">↑</button>
  <div id="log"></div>
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
  <script>
    const log = (t)=>{ const el=document.getElementById('log'); el.innerHTML += t+'<br>'; el.scrollTop = el.scrollHeight; };
    const meEl = document.getElementById('me');
    const posEl = document.getElementById('pos');
    const socket = io();

    socket.on('connect', ()=> log('Conectado: '+socket.id));
    socket.on('joined', (data)=>{ meEl.textContent = data.name; posEl.textContent = data.x+','+data.y; log('Unido como '+data.name); });
    socket.on('state', (s)=>{ log('Estado jugadores: '+Object.keys(s).length); });
    socket.on('moved', (p)=>{ if(p.me) posEl.textContent = p.x+','+p.y; log('Movimiento: '+p.name+' -> '+p.x+','+p.y); });
    socket.on('kicked', (msg)=>{ alert(msg.reason); log('Expulsado: '+msg.reason); socket.disconnect(); });

    function move(dx,dy){ socket.emit('move', {dx,dy}); }
    window.addEventListener('beforeunload', ()=> socket.emit('leave'));
  </script>
</body>
</html>
"""

# Rutas web
@app.route("/")
def index():
    return render_template_string(INDEX_HTML)

@app.route("/login", methods=["POST"])
def login():
    u = request.form.get("username","").strip()
    p = request.form.get("password","")
    if u in USERS and check_password_hash(USERS[u], p):
        session["user"] = u
        session["role"] = "admin" if u == "admin" else "user"
        return redirect(url_for("index"))
    return "Credenciales incorrectas", 401

@app.route("/guest", methods=["POST"])
def guest():
    session["user"] = "Invitado"
    session["role"] = "user"
    return redirect(url_for("index"))

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))

@app.route("/game")
def game():
    if "user" not in session:
        return redirect(url_for("index"))
    return render_template_string(GAME_HTML)

# API admin segura
def require_admin():
    return session.get("role") == "admin"

@app.route("/admin/players")
def admin_players():
    if not require_admin():
        return jsonify({"error":"no autorizado"}), 403
    return jsonify(PLAYERS)

@app.route("/admin/kill", methods=["POST"])
def admin_kill():
    if not require_admin():
        return jsonify({"error":"no autorizado"}), 403
    player_id = request.json.get("player_id")
    if not player_id or player_id not in PLAYERS:
        return jsonify({"error":"jugador no existe"}), 404
    # Expulsar del servidor (desconectar su socket)
    sid = PLAYERS[player_id]["sid"]
    try:
        socketio.emit("kicked", {"reason":"Has sido expulsado por el administrador."}, to=sid)
        disconnect(sid=sid)
    except Exception:
        pass
    del PLAYERS[player_id]
    socketio.emit("state", PLAYERS, to=ROOM)
    return jsonify({"ok":True, "killed":player_id})

# Socket.IO eventos
@socketio.on("connect")
def on_connect():
    # No creamos jugador hasta que envíe 'join'
    emit("state", PLAYERS)

@socketio.on("join")
def on_join(data=None):
    name = session.get("user", "Invitado")
    pid = str(uuid.uuid4())[:8]
    PLAYERS[pid] = {"name": name, "x": 0, "y": 0, "hp": 20, "sid": request.sid, "ts": time.time()}
    join_room(ROOM)
    emit("joined", {"id": pid, "name": name, "x": 0, "y": 0}, to=request.sid)
    socketio.emit("state", PLAYERS, to=ROOM)

@socketio.on("move")
def on_move(payload):
    # Seguridad básica: validar jugador por SID
    pid = None
    for k,v in PLAYERS.items():
        if v["sid"] == request.sid:
            pid = k
            break
    if not pid:
        return
    dx = int(payload.get("dx",0))
    dy = int(payload.get("dy",0))
    p = PLAYERS[pid]
    p["x"] = max(0, min(15, p["x"] + dx))
    p["y"] = max(0, min(11, p["y"] + dy))
    # Broadcast del movimiento
    socketio.emit("moved", {"id": pid, "name": p["name"], "x": p["x"], "y": p["y"], "me": True}, to=request.sid)
    socketio.emit("moved", {"id": pid, "name": p["name"], "x": p["x"], "y": p["y"]}, to=ROOM)

@socketio.on("leave")
def on_leave():
    # Eliminar jugador al salir
    pid = None
    for k,v in list(PLAYERS.items()):
        if v["sid"] == request.sid:
            pid = k
            del PLAYERS[k]
            break
    leave_room(ROOM)
    socketio.emit("state", PLAYERS, to=ROOM)

@socketio.on("disconnect")
def on_disconnect():
    # Limpieza al desconectar
    pid = None
    for k,v in list(PLAYERS.items()):
        if v["sid"] == request.sid:
            pid = k
            del PLAYERS[k]
            break
    socketio.emit("state", PLAYERS, to=ROOM)

if __name__ == "__main__":
    # En producción usa un servidor WSGI/ASGI y HTTPS
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)