import { Router } from "express";
import aiRouter from "./aiRouter"

const router = Router();

router.use("/ai", aiRouter);

export default router;