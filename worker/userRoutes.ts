import { Hono } from "hono";
import { Env } from './core-utils';
import type { DemoItem, ApiResponse, AnalysisRequest, AnalysisData } from '@shared/types';
import { z } from 'zod';
import { differenceInMinutes } from 'date-fns';
const GITHUB_API_BASE = 'https://api.github.com';
// Zod Schemas for GitHub API responses
const urlSchema = z.string().url().regex(/https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+/);
const commitListItemSchema = z.object({
  sha: z.string(),
});
const commitListSchema = z.array(commitListItemSchema);
const detailedCommitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    author: z.object({
      name: z.string().optional(),
      date: z.string().datetime(),
    }).nullable(),
    message: z.string(),
  }),
  stats: z.object({
    additions: z.number(),
    deletions: z.number(),
  }).optional(),
});
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
    // --- CodePulse Route ---
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
            const headers: { 'User-Agent': string; Authorization?: string } = { 'User-Agent': 'CodePulse-App' };
            if (c.env.GITHUB_TOKEN) {
                headers.Authorization = `token ${c.env.GITHUB_TOKEN}`;
            }
            const commitsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=100`;
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
            const commitsList = commitListSchema.parse(await commitsRes.json());
            if (commitsList.length < 2) {
                return c.json({ success: false, error: 'Not enough commits to analyze. A repository needs at least two commits.' }, 400);
            }
            const commitDetailsPromises = commitsList.map(commit =>
                fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${commit.sha}`, { headers })
                .then(res => res.json())
                .then(data => detailedCommitSchema.parse(data))
            );
            const detailedCommits = await Promise.all(commitDetailsPromises);
            const validCommits = detailedCommits.filter(
                (commit): commit is typeof commit & { stats: NonNullable<typeof commit['stats']>; commit: { author: NonNullable<typeof commit['commit']['author']> } & typeof commit['commit'] } =>
                    !!commit.stats && !!commit.commit.author
            );
            const analysisData: AnalysisData = [];
            for (let i = 0; i < validCommits.length - 1; i++) {
                const currentCommit = validCommits[i];
                const previousCommit = validCommits[i + 1];
                const currentDate = new Date(currentCommit.commit.author.date);
                const previousDate = new Date(previousCommit.commit.author.date);
                const timeDiffMinutes = differenceInMinutes(currentDate, previousDate);
                const interval = Math.max(timeDiffMinutes, 1);
                const additions = currentCommit.stats.additions;
                const deletions = currentCommit.stats.deletions;
                const totalChanges = additions + deletions;
                const velocity = totalChanges / interval;
                analysisData.push({
                    sha: currentCommit.sha,
                    date: currentDate.toISOString(),
                    velocity: parseFloat(velocity.toFixed(2)),
                    author: currentCommit.commit.author.name || 'Unknown Author',
                    message: currentCommit.commit.message.split('\n')[0],
                    additions,
                    deletions,
                });
            }
            return c.json({ success: true, data: analysisData.reverse() } satisfies ApiResponse<AnalysisData>);
        } catch (error) {
            console.error('[ANALYZE ERROR]', error);
            const errorMessage = error instanceof z.ZodError ? 'Invalid data structure from GitHub API.' : 'An unexpected error occurred during analysis.';
            return c.json({ success: false, error: errorMessage }, 500);
        }
    });
}