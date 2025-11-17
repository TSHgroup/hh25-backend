import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import "dotenv/config";

import passport from "passport";
import './auth/jwt';
import './auth/google'

import routes from './routes';

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import cors from "cors";

import { MJMLTemplates } from "./mail/template";

dotenv.config();

const app = express();
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
            { url: "https://odpalgadke.q1000q.cc/api/" }
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});