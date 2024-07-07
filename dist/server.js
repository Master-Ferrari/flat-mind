"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const WebSocket = __importStar(require("ws"));
const uuid_1 = require("uuid");
class Server {
    constructor(port = 3000, messageCallback) {
        this.clients = new Map();
        this.server = http.createServer((req, res) => {
            let filePath = '.' + req.url;
            if (filePath === './') {
                filePath = './index.html'; // Если в корне запрашивается пустой URL, откройте index.html
            }
            const extname = String(path.extname(filePath)).toLowerCase();
            const contentType = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'text/javascript',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpg',
                '.jpeg': 'image/jpeg',
                '.wav': 'audio/wav',
                '.mp3': 'audio/mp3',
                '.svg': 'image/svg+xml',
                '.pdf': 'application/pdf',
                '.doc': 'application/msword'
            };
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        // Если файл не найден, вернуть ошибку 404
                        fs.readFile('./404.html', (err, content) => {
                            res.writeHead(404, { 'Content-Type': 'text/html' });
                            res.end(content, 'utf-8');
                        });
                    }
                    else {
                        // Необработанная ошибка
                        res.writeHead(500);
                        res.end(`Server Error: ${err.code}`);
                    }
                }
                else {
                    // Успешное чтение файла
                    res.writeHead(200, { 'Content-Type': contentType[extname] || 'application/octet-stream' });
                    res.end(content, 'utf-8');
                }
            });
        });
        this.wss = new WebSocket.Server({ server: this.server });
        this.wss.on('connection', (ws) => {
            const clientId = (0, uuid_1.v4)();
            this.clients.set(clientId, ws);
            console.log(`Соединение установлено! Клиент ID: ${clientId}`);
            ws.on('message', (message) => {
                const data = JSON.parse(message.toString());
                data.clientId = clientId; // Добавляем clientId к сообщению
                messageCallback(data); // Вызов колбека с сообщением
            });
            ws.on('close', () => {
                this.clients.delete(clientId);
                console.log(`Соединение закрыто! Клиент ID: ${clientId}`);
            });
            ws.send(JSON.stringify({ type: 'connection', clientId: clientId }));
        });
        const PORT = port;
        this.server.listen(PORT, () => {
            console.log(`Сервер запущен! \n http://localhost:${PORT}`);
        });
    }
    async sendToClient(clientId, obj) {
        const client = this.clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(obj));
        }
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map