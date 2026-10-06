# Señor Barriga

A web application for managing Adolfo and Kari's shared finances: recording expenses, splitting costs based on income, tracking debt between them, and keeping dated snapshots of their savings accounts.

The frontend uses React and TypeScript, runs in the browser, relies on Supabase for authentication and persistence, and is published as a static site on GitHub Pages.

The public URL configured in `package.json` is https://fitogt.github.io/senorbarriga/.

## Features

### Dashboard

Displays the current month's income and expenses, each person's share, outstanding debt, and the latest savings snapshot. It also includes an expense entry form.

### Expenses

Create, view, edit, and delete expenses with a date, description, category, amount, splitting rule, and payer. The form supports EUR and USD; expenses are stored with their amount converted to EUR.

| Splitting rule | Calculation |
| --- | --- |
| `percentage` | Each person contributes according to their income percentage. |
| `shared` | The amount is split equally. |
| `kari` | Kari is responsible for the full amount. |
| `adolfo` | Adolfo is responsible for the full amount. |

Categories include rent, supermarket, food, transportation, health insurance, pharmacy, pets, subscriptions, purchases, cellphone, and other. `src/interfaces/CategoryTypeMap.tsx` defines the suggested splitting rule for each category.

When loading a month, the service requests recurring expense generation through the `ensure_monthly_expenses` SQL function. Recurring templates are stored in `recurring_expenses`.

### Income and debt

The income screen saves both people's income for a given month and displays their contribution percentages. Monthly records use a `YYYY-MM` key.

To calculate proportional expenses, the service selects the latest income record whose monthly key is earlier than or equal to the selected month. Monthly income initialization depends on the `ensure_monthly_income` function in Supabase.

Kari's monthly balance is calculated as:

```text
Kari's balance = her allocated expenses - expenses paid by Kari
```

A positive balance means Kari owes Adolfo; a negative balance means Adolfo owes Kari. The debt screen shows the net outstanding balance, monthly history, and recorded payments between them. Payments can include a note and can be deleted from the history.

### Savings

Save a snapshot of account balances for a specific date. Records are grouped by day, and the dashboard uses the latest snapshot.

| Person | Accounts in the entry form | Initial currency |
| --- | --- | --- |
| Adolfo | Cash, Ocean Bank | USD |
| Adolfo | N26 | EUR |
| Kari | Cash, Wise, Deel Card, Ocean Bank | USD |
| Kari | Sabadell | EUR |

The form reuses the latest available balance and currency for each account, even if the newest snapshot does not include that account. Currency codes are normalized to uppercase when reading and saving records. New accounts require an amount; zero is allowed. Saving again for the same date updates the existing account balances and adds any missing accounts. Records from other dates and historical accounts excluded from the form are preserved.

Facebank remains a supported type and display label for historical records, but is excluded from new snapshot forms. Removing an account from the form does not delete its historical records.

Savings totals are displayed in EUR using the current exchange rate from Frankfurter, including when viewing older snapshots. Historical exchange rates are not stored with snapshots.

### Authentication

Users sign in with email and password through Supabase Auth. Financial screens are protected by `PrivateRoute`. There is no user registration screen; accounts must already exist in the connected Supabase project.

## Technology and architecture

- React 19 and TypeScript, built with Create React App (`react-scripts` 5).
- Material UI and Emotion for components, styling, and the dark theme.
- React Router with `HashRouter` for navigation on GitHub Pages.
- TanStack Query for the queries and mutations that use it.
- React Hook Form and Zod for forms and validation.
- Supabase JavaScript SDK for authentication, tables, and SQL functions.
- Day.js and date-fns for date handling.
- Frankfurter for EUR/USD exchange rates.
- ESLint and Prettier for code and formatting checks.
- Bash and Git for publishing the production build through `deploy.sh`.

There is no application server in this repository. The browser communicates directly with Supabase and with `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD`.

## Repository structure

```text
src/
  App.tsx                 Routes, providers, and theme
  index.tsx               React entry point and QueryClient
  api/                    Query and mutation hooks
  components/
    Auth/                 Sign-in screen
    Dashboard/            Summary and expense entry
    Expense/              Expense form
    Expenses/             Expense history
    Savings/              Savings entry and history
    Settlement/           Income, debt, and payments
    Navbar/               Navigation
    Loader/               Loading indicators
  constants/              Routes, query keys, and labels
  context/                Authentication, notifications, and theme
  interfaces/             TypeScript models and enums
  routes/PrivateRoute/    Route protection
  services/Supabase/      Tables, Auth, and SQL function access
  utils/                  Dates, decimals, currencies, and savings
public/                   HTML and static assets
db/                       Database reference files and data
package.json              Dependencies, scripts, and publishing URL
package-lock.json         Resolved dependency versions
```

Inside `db/`:

- `tables/tables.sql`: declarative definitions of the current tables and indexes.
- `dumps/` and `march/`: existing data and SQL files. These are not a migration system and are not loaded automatically when the app starts.
- `backups/`: local backups, excluded from Git by `.gitignore`.

## Local development requirements

- Node.js and npm. The repository does not pin a Node version through `engines` or `.nvmrc`; use a version compatible with the dependencies in `package-lock.json`.
- Git for cloning and publishing.
- A Supabase project configured with the required tables, SQL functions, permissions, and a sign-in account.
- Internet access for Supabase and exchange rate requests.

On Windows, if the repository is stored inside WSL, run Node/npm commands from a WSL terminal in `/home/adolfo/senorbarriga`. Avoid running npm from a UNC path such as `\\wsl.localhost\Ubuntu\...`, because some Windows tools do not support that working directory.

## Supabase setup

You can connect the frontend to an existing development project or prepare a separate Supabase project.

[db/tables/tables.sql](db/tables/tables.sql) defines the following tables:

| Table | Purpose |
| --- | --- |
| `expenses` | Individual expenses. |
| `recurring_expenses` | Recurring expense templates. |
| `income` | Monthly income and contribution percentages. |
| `total_expenses` | Calculated monthly expense totals. |
| `debt` | Monthly debt records. |
| `debt_payments` | Payments between Adolfo and Kari. |
| `savings` | Balances by person, account, currency, and date. |

**The table definitions are not a complete backend installation.** The service also calls these SQL functions through `rpc`:

| Function | Arguments sent by the frontend |
| --- | --- |
| `ensure_monthly_income` | `target_month` |
| `ensure_monthly_expenses` | `target_month` |
| `get_net_debt` | No arguments. |
| `record_debt_payment` | `payment_amount`, `payment_note` |
| `delete_income_snapshot` | `target_month` |

Function definitions, RLS policies, and any backend triggers are not included in `db/tables/tables.sql`. For a new project, obtain that configuration from the existing backend before using the financial screens. The table file uses `create table`: it is a reference for an empty database, not a script to run repeatedly against an existing database.

Enable email/password authentication in Supabase Auth and create the account you will use to sign in. Table and function permissions must allow the required operations for authenticated users. Frontend route protection does not replace backend access policies.

## Running locally

### 1. Clone and install dependencies

```bash
git clone https://github.com/fitogt/senorbarriga.git
cd senorbarriga
npm ci
```

If you already have the repository, run `npm ci` from its root directory. This installs the dependency versions resolved in `package-lock.json`.

### 2. Configure environment variables

Create `.env.local` in the repository root:

```dotenv
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
REACT_APP_SUPABASE_KEY=YOUR_SUPABASE_PUBLIC_KEY
```

These are the two variables read by `src/services/Supabase/SupabaseService.tsx`. Use the project's public client key, such as its `anon` key. Do not use a `service_role` key or another secret key.

`REACT_APP_*` variables are embedded into the browser JavaScript during compilation and are visible to users of the site. `.env` and local environment files are excluded from Git.

The repository does not include an `.env.example`. Restart the development server after changing environment variables. For production, rebuild and redeploy.

### 3. Start the application

```bash
npm start
```

Open `http://localhost:3000/` and sign in with your Supabase account. The development server reloads the page when you edit the source code.

Local development connects to the Supabase project specified in your environment variables. If you point it at production, creating, editing, or deleting records will modify production data.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the development server. |
| `npm run build` | Generate the production build in `build/`. |
| `npm run lint` | Run ESLint over `src/`. |
| `npm run lint:fix` | Apply automatic ESLint fixes. |
| `npm run format` | Check source formatting with Prettier. |
| `npm run format:fix` | Apply Prettier formatting. |
| `npm run deploy` | Execute `bash ./deploy.sh` to build and publish to `gh-pages`. |

To check TypeScript without generating files:

```bash
npx tsc --noEmit
```

There is no `test` script in `package.json`, although Testing Library dependencies are installed.

## Deploying to GitHub Pages

The configured workflow runs `deploy.sh` through Bash from your machine. It publishes the static frontend; Supabase remains the remote backend. Bash must be available; on Windows, run this command inside WSL or Git Bash.

### 1. Verify the destination repository

You need write access to the GitHub repository and Git authentication configured through SSH or HTTPS.

```bash
git remote -v
```

Confirm that `origin` points to the repository where you want to publish. Keep source changes committed on the appropriate development branch before deployment. The `gh-pages` branch contains compiled output and does not replace the source history.

### 2. Verify the public URL

The current `package.json` setting is:

```json
"homepage": "https://fitogt.github.io/senorbarriga"
```

For a fork or a renamed repository, update it to:

```text
https://USERNAME.github.io/REPOSITORY
```

`react-scripts` uses this setting to generate static asset paths.

### 3. Configure the production environment

Supabase variables must be available when compiling. You can create `.env.production.local` with the public values for the production project:

```dotenv
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
REACT_APP_SUPABASE_KEY=YOUR_SUPABASE_PUBLIC_KEY
```

This file is excluded from Git and is used during production builds. GitHub Pages does not inject environment variables into an already compiled application.

### 4. Validate and deploy

From the repository root:

```bash
npm ci
npx tsc --noEmit
npm run lint
npm run deploy
```

`npm run deploy` executes `bash ./deploy.sh`. The script:

1. Checks out `main`.
2. Deletes the existing local `gh-pages` branch, if present, and creates a new one.
3. Runs `npm run build`.
4. Copies the contents of `build/` into the repository root.
5. Stages files and commits with the message `deploy`.
6. Force-pushes `gh-pages` to `origin` and returns to `main`.

There is no `predeploy` lifecycle script; compilation happens inside `deploy.sh`. Commit your source changes before running it: the script starts from `main`, stages files with `git add .`, and replaces the remote deployment branch history through a force-push.

### 5. Configure GitHub Pages

In the GitHub repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select **gh-pages** and **/(root)**, and save. If the branch is not available yet, complete the first deployment before selecting it.

See the [official GitHub Pages publishing source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

### 6. Verify the published site

Once GitHub finishes publishing, open:

```text
https://fitogt.github.io/senorbarriga/
```

Check sign-in, the dashboard, and navigation to expenses, income, debt, and savings. The application uses hash routes, for example:

```text
https://fitogt.github.io/senorbarriga/#/savings/
```

`HashRouter` handles navigation in the browser and allows these routes to be reloaded on static hosting.

To publish subsequent updates, run `npm run deploy` again with the production environment configured.

### About `deploy.sh`

`deploy.sh` is the deployment entry point referenced by `package.json` and is no longer excluded by `.gitignore`, so it can be included in the repository. You can invoke it through `npm run deploy` or directly with `bash ./deploy.sh`.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Supabase client initialization fails or the app does not load | Both `REACT_APP_SUPABASE_*` variables; restart development or rebuild production after changing them. |
| Sign-in fails | The account exists in Supabase Auth, the password is correct, and the selected project is the intended one. |
| Permission errors when reading or saving | RLS policies, table permissions, and permissions to execute SQL functions. |
| A required RPC function is missing | The backend needs the functions listed above; the table file does not create them. |
| Income percentages or expense allocation fail | Monthly income configuration and the `ensure_monthly_income` function. |
| Static assets return 404 on Pages | `homepage` matches the published username and repository; rebuild and redeploy. |
| The deployment does not appear | The `gh-pages` publishing branch, `/(root)` folder, and GitHub publication status. |
| Unexpected USD/EUR conversion | Frankfurter connectivity and response. Without a valid rate, the converter returns the original amount, so verify the rate before interpreting totals. |
| npm reports a UNC path error on Windows | Run commands inside WSL from the repository's Linux path. |
