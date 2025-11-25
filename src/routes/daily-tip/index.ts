import { Router } from "express";
import DailyTips from "../../mongodb/DailyTips";

const router = Router();

router.get('/', async (_, res) => {
    try {
        const total = await DailyTips.countDocuments();
        
        if (total === 0) {
            return res.status(404).json({
                error: "No daily tips available"
            });
        }

        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        
        const randomIndex = dayOfYear % total;

        const tip = (await DailyTips.find().skip(randomIndex).limit(1))[0];

        if (!tip) {
            return res.status(404).json({
                error: "Daily tip not found"
            });
        }

        res.json({
            tip: tip.tip
        });
    } catch (error) {
        console.error('Error fetching daily tip:', error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});

export default router;