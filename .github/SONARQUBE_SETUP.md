# SonarQube GitHub Actions Setup Guide

This guide explains how to configure GitHub to automatically run SonarQube scans on every push.

## What Was Created

1. **`.github/workflows/sonarqube.yml`** - GitHub Actions workflow file
2. **`sonar-project.properties`** - SonarQube project configuration
3. This setup guide

## GitHub Secrets Configuration

You need to add two secrets to your GitHub repository for the workflow to function:

### Step-by-Step Instructions:

1. **Go to your GitHub repository**
   - Navigate to: https://github.com/Delta-Pay/Delta-Pay-app

2. **Open Settings**
   - Click on **Settings** tab (top right of your repo)

3. **Navigate to Secrets and Variables**
   - In the left sidebar, click **Secrets and variables** > **Actions**

4. **Add SONAR_TOKEN**
   - Click **New repository secret**
   - Name: `SONAR_TOKEN`
   - Value: `sqp_82a8233b9980225c63a5287e2b51fa1bad752bf0`
   - Click **Add secret**

5. **Add SONAR_HOST_URL**
   - Click **New repository secret** again
   - Name: `SONAR_HOST_URL`
   - Value: `https://sonarcube.samsaraserver.space`
   - Click **Add secret**

## How It Works

### Trigger Events
The workflow runs automatically on:
- Every push to `main` branch
- Every push to `develop` branch
- Every pull request to `main` or `develop` branches

### Workflow Steps
1. **Checkout code** - Downloads your repository code
2. **Set up Deno** - Installs Deno runtime for backend
3. **Set up Node.js** - Installs Node.js for frontend
4. **Install dependencies** - Installs frontend npm packages
5. **Run Deno lint** - Lints backend code (continues even if errors found)
6. **Run Deno tests** - Runs backend tests (continues even if tests fail)
7. **SonarQube Scan** - Runs the actual code analysis
8. **Quality Gate Check** - Validates code quality standards (continues even if fails)

### What Gets Scanned
- All TypeScript/JavaScript files in `src/backend`
- All files in `src/frontend`
- Excludes: `node_modules`, test files, build artifacts

## Verifying the Setup

### After Pushing Code:

1. **Go to Actions Tab**
   - Visit: https://github.com/Delta-Pay/Delta-Pay-app/actions
   
2. **Check Workflow Status**
   - You should see "SonarQube Analysis" workflow running
   - Click on the workflow run to see detailed logs

3. **View SonarQube Results**
   - After the scan completes, visit: https://sonarcube.samsaraserver.space
   - Log in and navigate to the `delta-pay` project
   - View code quality metrics, bugs, vulnerabilities, and code smells

## Troubleshooting

### Workflow Fails with "SONAR_TOKEN not found"
- Make sure you added the secrets correctly in GitHub Settings
- Secret names must be EXACTLY: `SONAR_TOKEN` and `SONAR_HOST_URL`

### SonarQube Server Unreachable
- Verify the SonarQube server is running at https://sonarcube.samsaraserver.space
- Check if your token is still valid

### Quality Gate Fails
- This is set to `continue-on-error: true`, so it won't block your pipeline
- Review the issues in SonarQube dashboard and fix code quality problems

## Manual Scan (Local)

You can still run SonarQube scans manually:

```bash
sonar-scanner \
  -Dsonar.projectKey=delta-pay \
  -Dsonar.sources=. \
  -Dsonar.host.url=https://sonarcube.samsaraserver.space \
  -Dsonar.token=sqp_82a8233b9980225c63a5287e2b51fa1bad752bf0
```

## Security Notes

- Never commit the `SONAR_TOKEN` directly in code
- Always use GitHub Secrets for sensitive credentials
- The token in this guide should only be added as a GitHub secret
- Consider rotating the token periodically for better security
