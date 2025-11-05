import { Hono } from "hono";
import { Env } from './core-utils';
import type { DemoItem, ApiResponse, AnalysisRequest, AnalysisData, ChartDataPoint } from '@shared/types';
import { z } from 'zod';
import { differenceInMinutes } from 'date-fns';
const GITHUB_API_BASE = 'https://api.github.com';
const urlSchema = z.string().url().regex(/https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+/);
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // --- Existing Demo Routes ---
    app.get('/api/test', (c) => c.json({ success: true, data: { name: 'CF Workers Demo' }}));
    app.get('/api/demo', async (c) => {
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.getDemoItems();
        return c.json({ success: true, data } satisfies ApiResponse<DemoItem[]>);
    });
    app.get('/api/counter', async (c) => {
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.getCounterValue();
        return c.json({ success: true, data } satisfies ApiResponse<number>);
    });
    app.post('/api/counter/increment', async (c) => {
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.increment();
        return c.json({ success: true, data } satisfies ApiResponse<number>);
    });
    app.post('/api/demo', async (c) => {
        const body = await c.req.json() as DemoItem;
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.addDemoItem(body);
        return c.json({ success: true, data } satisfies ApiResponse<DemoItem[]>);
    });
    app.put('/api/demo/:id', async (c) => {
        const id = c.req.param('id');
        const body = await c.req.json() as Partial<Omit<DemoItem, 'id'>>;
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.updateDemoItem(id, body);
        return c.json({ success: true, data } satisfies ApiResponse<DemoItem[]>);
    });
    app.delete('/api/demo/:id', async (c) => {
        const id = c.req.param('id');
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const data = await durableObjectStub.deleteDemoItem(id);
        return c.json({ success: true, data } satisfies ApiResponse<DemoItem[]>);
    });
    // --- New CodePulse Route ---
    app.post('/api/analyze', async (c) => {
        try {
            const body = await c.req.json<AnalysisRequest>();
            const validation = urlSchema.safeParse(body.url);
            if (!validation.success) {
                return c.json({ success: false, error: 'Invalid GitHub repository URL format.' }, 400);
            }
            const url = new URL(validation.data);
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length < 2) {
                return c.json({ success: false, error: 'Invalid GitHub repository URL path.' }, 400);
            }
            const [owner, repo] = pathParts;
            const headers = { 'User-Agent': 'CodePulse-App' };
            const commitsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=30`;
            const commitsRes = await fetch(commitsUrl, { headers });
            if (commitsRes.status === 404) {
                return c.json({ success: false, error: 'Repository not found. Please check the URL or ensure it is public.' }, 404);
            }
            if (commitsRes.status === 403) {
                return c.json({ success: false, error: 'GitHub API rate limit exceeded. Please try again later.' }, 403);
            }
            if (!commitsRes.ok) {
                throw new Error(`GitHub API error: ${commitsRes.statusText}`);
            }
            const commitsList = await commitsRes.json() as any[];
            if (commitsList.length < 2) {
                return c.json({ success: false, error: 'Not enough commits to analyze. A repository needs at least two commits.' }, 400);
            }
            const commitDetailsPromises = commitsList.map(commit => 
                fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${commit.sha}`, { headers })
                .then(res => res.json())
            );
            const detailedCommits = await Promise.all(commitDetailsPromises);
            const analysisData: AnalysisData = [];
            for (let i = 0; i < detailedCommits.length - 1; i++) {
                const currentCommit = detailedCommits[i];
                const previousCommit = detailedCommits[i + 1];
                const currentDate = new Date(currentCommit.commit.author.date);
                const previousDate = new Date(previousCommit.commit.author.date);
                const timeDiffMinutes = differenceInMinutes(currentDate, previousDate);
                // Prevent division by zero and handle rapid commits
                const interval = Math.max(timeDiffMinutes, 1);
                const additions = currentCommit.stats.additions;
                const deletions = currentCommit.stats.deletions;
                const totalChanges = additions + deletions;
                const velocity = totalChanges / interval;
                analysisData.push({
                    sha: currentCommit.sha,
                    date: currentDate.toISOString(),
                    velocity: parseFloat(velocity.toFixed(2)),
                    author: currentCommit.commit.author.name,
                    message: currentCommit.commit.message.split('\n')[0], // First line only
                    additions,
                    deletions,
                });
            }
            return c.json({ success: true, data: analysisData.reverse() } satisfies ApiResponse<AnalysisData>);
        } catch (error) {
            console.error('[ANALYZE ERROR]', error);
            return c.json({ success: false, error: 'An unexpected error occurred during analysis.' }, 500);
        }
    });
}