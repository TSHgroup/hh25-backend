import express, {Request, Response} from "express";
import { gemini } from "../../modules/ai";
import voices from '../../../data/voices.json';

const router = express.Router();

router.get('/voices', async (req, res) => {
    res.send(voices);
});

export default router;