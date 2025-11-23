import { Router } from "express";
import Conversations from "../../mongodb/Conversations";
import { analyzeConversations, calculateTrends, Conversation } from "../../modules/analytics";
import ms from 'ms';
import { validateQuery } from "../../middlewares/validate";
import { AnalyticsQuery } from "../../models/AnalyticsModels";

const router = Router();

router.get('/', validateQuery(AnalyticsQuery), async (req, res) => {
    const { span } = req.query;
    const timeSpan = ms(span?.toString() as ms.StringValue ?? '7d');

    const now = new Date();
    const timestamp = new Date(now.getTime() - timeSpan);
    const previous = new Date(timestamp.getTime() - timeSpan);

    const conversations = await Conversations.find({
        user: req.user!._id,
        createdAt: { $gte: timestamp }
    });

    const previousConversations = await Conversations.find({
        user: req.user!._id,
        createdAt: { $gte: previous, $lt: timestamp }
    });

    const previousAnalytics = analyzeConversations(previousConversations as unknown as Conversation[]);
    const currentAnalytics = analyzeConversations(conversations as unknown as Conversation[]);

    const trends = calculateTrends(previousAnalytics, currentAnalytics);

    const allConversations = await Conversations.find({
        user: req.user!._id
    }).sort({ createdAt: -1 });

    let currentStreak = 0;
    let lastDate: Date | null = null;

    for (const conversation of allConversations) {
        const date = new Date(conversation.createdAt);
        date.setHours(0, 0, 0, 0);

        if (!lastDate) {        
            const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            if (diff > 1) return;
            lastDate = date;
            currentStreak = 1;
            continue;
        }

        const diff = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diff == 1) {
            currentStreak++;
            lastDate = date;
        } else if (diff > 1) {
            break;
        }
    }

    res.send({
        trends,
        currentStreak,
        analytics: currentAnalytics,
    });
});

export default router;