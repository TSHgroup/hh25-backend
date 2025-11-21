import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import "dotenv/config";
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import passport from "passport";
import './auth/jwt';
import './auth/google'

import routes from './routes';

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import cors from "cors";

import { MJMLTemplates } from "./mail/template";
import { handleChatWebSocket } from './routes/ai/chat';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/v1/ai/chat' });

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URL as string)

app.use(cors());

app.set('trust proxy', true);

app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());

MJMLTemplates.getInstance().populate('templates');

const options = {
    definition: {
        openapi: "3.1.0",
        info: {
            title: "OdpalGadkę Express API with Swagger",
            version: "1.0.0",
            description: "OdpalGadkę API documented with Swagger"
        },
        servers: [
            { url: "https://odpalgadke.q1000q.cc/api/" },
            { url: `http://localhost:${PORT}/` }
        ]
    },
    apis: ["./docs/*.yaml"],
};

const specs = swaggerJsdoc(options);
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs)
);

app.use("/v1/", routes);

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    // Extract JWT token from query string or headers
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers['sec-websocket-protocol'];

    if (!token) {
        ws.send(JSON.stringify({ type: 'error', content: 'Authentication required' }));
        ws.close();
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
        handleChatWebSocket(ws, decoded.userId);
    } catch (error) {
        ws.send(JSON.stringify({ type: 'error', content: 'Invalid token' }));
        ws.close();
    }
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/v1/ai/chat`);
});