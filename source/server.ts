import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class Server {
    server: http.Server;
    wss: WebSocket.Server;
    clients: Map<string, WebSocket.WebSocket>;

    constructor(port: number = 3000, messageCallback: (message: any) => void) {
        this.clients = new Map<string, WebSocket.WebSocket>();

        this.server = http.createServer((req, res) => {
            let filePath = '.' + req.url!;
            if (filePath === './') {
                filePath = './index.html'; // Если в корне запрашивается пустой URL, откройте index.html
            }

            const extname = String(path.extname(filePath)).toLowerCase();
            const contentType: { [key: string]: string } = {
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
                    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                        // Если файл не найден, вернуть ошибку 404
                        fs.readFile('./404.html', (err, content) => {
                            res.writeHead(404, { 'Content-Type': 'text/html' });
                            res.end(content, 'utf-8');
                        });
                    } else {
                        // Необработанная ошибка
                        res.writeHead(500);
                        res.end(`Server Error: ${(err as NodeJS.ErrnoException).code}`);
                    }
                } else {
                    // Успешное чтение файла
                    res.writeHead(200, { 'Content-Type': contentType[extname] || 'application/octet-stream' });
                    res.end(content, 'utf-8');
                }
            });
        });

        this.wss = new WebSocket.Server({ server: this.server });

        this.wss.on('connection', (ws) => {
            const clientId = uuidv4();
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

        const PORT: number = port;

        this.server.listen(PORT, () => {
            console.log(`Сервер запущен! \n http://localhost:${PORT}`);
        });
    }

    async sendToClient(clientId: string, obj: any) {
        const client = this.clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(obj));
        }
    }
}
