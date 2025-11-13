# CodePulse

CodePulse is a minimalist and visually elegant web application that analyzes the development velocity of any public GitHub repository. Users provide a GitHub URL, and the application fetches the commit history, calculates the rate of change (additions and deletions) per minute between consecutive commits, and visualizes this data on a stunning, interactive line chart. The application is designed with a 'less is more' philosophy, focusing on clarity, performance, and a delightful user experience. It provides key insights at a glance, such as peak velocity and average cadence, presented in clean, modern UI components. The entire experience is contained within a single, responsive page.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adam0white/codepulse)

## Key Features

-   **GitHub Repository Analysis**: Input any public GitHub repository URL to begin the analysis.
-   **Commit Velocity Visualization**: An interactive line chart displays the lines of code changed (additions + deletions) per minute between commits.
-   **Summary Statistics**: At-a-glance cards show key metrics like peak velocity, average changes, and total commits analyzed.
-   **Minimalist UI/UX**: A clean, single-page interface built with a focus on typography, whitespace, and user experience.
-   **Responsive Design**: Flawless performance and layout across all device sizes, from mobile to desktop.
-   **Graceful State Handling**: Elegant skeleton loaders for loading states and clear, non-intrusive alerts for errors.

## Technology Stack

-   **Frontend**:
    -   [React](https://reactjs.org/)
    -   [Vite](https://vitejs.dev/)
    -   [Tailwind CSS](https://tailwindcss.com/)
    -   [shadcn/ui](https://ui.shadcn.com/)
    -   [Recharts](https://recharts.org/) for charting
    -   [Framer Motion](https://www.framer.com/motion/) for animations
-   **Backend**:
    -   [Cloudflare Workers](https://workers.cloudflare.com/)
    -   [Hono](https://hono.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Package Manager**: [Bun](https://bun.sh/)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [Bun](https://bun.sh/)
-   [Git](https://git-scm.com/)
-   A Cloudflare account and the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
-   A GitHub Personal Access Token (optional but recommended for higher rate limits)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/codepulse.git
    cd codepulse
    ```

2.  **Install dependencies:**
    This project uses Bun for package management.
    ```bash
    bun install
    ```

3.  **Set up GitHub API Token (Optional but Recommended):**
    
    Without a token, the app uses unauthenticated GitHub API requests with a rate limit of 60 requests per hour. With a token, you get 5,000 requests per hour.
    
    To set up a token:
    
    a. **Create a GitHub Personal Access Token:**
       - Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
       - Click "Generate new token (classic)"
       - Give it a descriptive name (e.g., "CodePulse")
       - Select the `public_repo` scope (for public repositories)
       - Click "Generate token"
       - **Copy the token immediately** (you won't be able to see it again)
    
    b. **Configure for local development:**
       - Copy the example file: `cp .dev.vars.example .dev.vars`
       - Open `.dev.vars` and replace `your_github_token_here` with your actual token
       - The `.dev.vars` file is already in `.gitignore` and won't be committed
    
    c. **Configure for production (Cloudflare Workers):**
       - Use Wrangler to set the secret: `wrangler secret put GITHUB_TOKEN`
       - Enter your token when prompted
       - The secret will be securely stored and available to your worker

4.  **Run the development server:**
    This command starts the Vite frontend development server and the Wrangler development server for the backend worker simultaneously.
    ```bash
    bun run dev
    ```
    The application will be available at `http://localhost:3000`.

## Project Structure

-   `src/`: Contains all the frontend React application code.
    -   `pages/`: Main application pages.
    -   `components/`: Reusable React components.
    -   `lib/`: Utility functions.
-   `worker/`: Contains the backend Cloudflare Worker code.
    -   `index.ts`: The main entry point for the worker.
    -   `userRoutes.ts`: Hono route definitions for the API.
-   `shared/`: Contains TypeScript types shared between the frontend and backend.

## Development

### Frontend

-   The main application view is located in `src/pages/HomePage.tsx`.
-   Reusable UI components are built using `shadcn/ui` and can be found in `src/components/ui`.
-   Custom components are located in `src/components`.

### Backend

-   The API is built with Hono and runs on Cloudflare Workers.
-   To add a new API endpoint, define a new route in `worker/userRoutes.ts`.
-   Shared types between the client and worker should be defined in `shared/types.ts` to ensure type safety.

## Available Scripts

-   `bun run dev`: Starts the local development server for both frontend and backend.
-   `bun run build`: Builds the frontend application for production.
-   `bun run deploy`: Deploys the application to Cloudflare Workers.
-   `bun run lint`: Lints the codebase using ESLint.

## Deployment

This project is designed for seamless deployment to Cloudflare Pages with a Functions backend.

1.  **Login to Wrangler:**
    Authenticate the Wrangler CLI with your Cloudflare account.
    ```bash
    npx wrangler login
    ```

2.  **Set up GitHub API Token (if not already done):**
    For production, set the GitHub token as a Cloudflare Workers secret:
    ```bash
    wrangler secret put GITHUB_TOKEN
    ```
    Enter your GitHub Personal Access Token when prompted. This securely stores the token and makes it available to your worker in production.

3.  **Deploy the application:**
    Run the deploy script. This will build the frontend and deploy both the static assets and the worker function to Cloudflare.
    ```bash
    bun run deploy
    ```

Alternatively, you can deploy directly from your GitHub repository using the button below.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adam0white/codepulse)

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.