# TMSM Volunteer Hours Tracker

A static, accessible volunteer-hours dashboard for Tuscaloosa Magnet Middle School. The campaign runs from **September 1, 2026 to May 1, 2027**, with a **385-hour goal**. No backend, installation, or build step is required to publish.

## Update the total each week

1. Ask the vice principal for the **cumulative volunteer hours since September 1**, and the date that total covers.
2. In your GitHub repository, open `data/progress.csv` and click the pencil icon to edit.
3. Add one row: `YYYY-MM-DD,cumulative_hours`. Keep the header and the `2026-09-01,0` starting baseline.
4. Commit the change to `main`. GitHub Pages publishes the update; reload the page after deployment completes.

For example, **if** the first reported total is 12.5 hours and the next is 25 hours, the file would be:

```csv
date,cumulative_hours
2026-09-01,0
2026-09-08,12.5
2026-09-15,25
```

These numbers are illustrative, not actual school reports. Enter **25**, not 12.5, for the second report in this example. Use the report’s actual date, even if it is not Tuesday. Missing weeks are fine; do not invent entries. The chart connects known reports and stops at the latest one.

### Correct a mistake

Edit the original row rather than adding another row with the same date. If a historical total was overstated, correct all affected rows so totals remain nondecreasing in date order. All dates must fall within the campaign. Use nonnegative numbers without commas, quotes, units, or thousands separators, such as `1234.5`. Blank lines, a UTF-8 BOM, and Windows line endings are accepted. Export a spreadsheet as UTF-8 comma-separated CSV, not semicolon-delimited CSV.

The baseline must remain zero on the start date. The initial page explicitly waits for the first report and does not claim the baseline is a reported total. The tracker contains school-wide totals only; no student names are needed.

## Publish on GitHub Pages

1. Create a GitHub repository and upload this project, retaining its folder structure and dotfiles. Use a public repository if required by your GitHub plan.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and **/ (root)**, then save.
5. Wait for the Pages deployment, then open the URL shown in Settings → Pages.

If your branch has another name, select that branch instead. `.nojekyll` keeps this a plain static site. All application assets and data use relative paths, including for `https://username.github.io/repository-name/` URLs. There is no secret, server, or API key to configure. No remote repository or deployment is created by these files.

[GitHub’s publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Preview locally

From this folder, run:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Stop the server with Ctrl+C. Use an HTTP server rather than double-clicking `index.html`, because browsers restrict fetching the CSV from local file URLs. The Google Fonts stylesheet is optional; system fonts work without it. The chart and calculations have no third-party JavaScript dependencies.

## Configuration and files

- `config.json`: school name, goal hours, start date, end date. When changing campaigns, reset the CSV baseline to the new start date.
- `data/progress.csv`: the only file needed for ordinary weekly updates.
- `index.html`, `styles.css`, `app.js`: page, styling, SVG chart, and interactions.
- `model.js`: data validation and date/pace calculations.
- `tests/model.test.js`: calculation and validation tests.

## Calculation rules

All calendar weeks count, including breaks. There are 242 elapsed days, or 34 weeks plus 4 days. The start date represents zero elapsed days. The baseline pace is `385 × 7 ÷ 242 = 11.14 hours/week`. Weekly planned points begin on September 1 and repeat every seven days, with a prorated endpoint on May 1.

All dashboard calculations use the **latest report date**, not today. The notice for reports more than seven days old uses the current date in America/Chicago, only during the campaign. An old report does not silently move forward to today. To record the final outcome, add a May 1 report, even if the total is unchanged.

Each reported volunteer hour contributes one hour of earned value (EV). Planned value (PV) is the goal multiplied by the fraction of the campaign elapsed. `SV = EV − PV`, and `SPI = EV ÷ PV`. Positive SV means ahead, negative means behind; status uses SV rounded to two decimals. SPI is unavailable at the zero baseline. Goal achievement takes priority over schedule status.

Required remaining weekly pace is `max(goal − EV, 0) ÷ (remaining days ÷ 7)`. This is a planning calculation, not a cost-based EVM measure. It becomes zero once the goal is reached; if the deadline report falls short, the page shows the shortfall without dividing by zero. Totals above the goal remain visible, and the chart expands to fit them. The progress bar fills to 100%, while the numerical completion percentage may exceed 100%.

“Behind the numbers” shows all formulas, substituted values, interpretations, and an accessible report table. Chart markers expose date and hours on focus, hover, or tap; Escape dismisses the tooltip. Date calculations use UTC calendar days to avoid daylight-saving offsets. Values are rounded for display only.

[PMI’s EVM formula reference](https://www.pmi.org/blog/earned-value-management)

## Run tests

With Node.js 20 or later installed:

```sh
npm test
```

No dependency installation is needed. Tests cover baseline and stale data, missing weeks, ahead/on-track/behind states, the midpoint example, goal exceeded, deadline outcomes, invalid dates, and malformed CSV.
