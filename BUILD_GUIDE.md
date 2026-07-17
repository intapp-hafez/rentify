# Rentify App Distribution Guide

This guide explains how to package the Rentify web application into a standalone folder that can be distributed to users to run locally without needing a terminal or developer tools.

## 1. Automated Build (Recommended)
You can automatically build, copy, and compress the app in a single step using the provided PowerShell script.

Open your terminal and run:
```powershell
.\build-rentify-app.ps1
```
What this script does:
1. Runs `npm run build` to generate a fresh production bundle in `.output`.
2. Clears out the old `.output` from the `Rentify-App` folder.
3. Copies the newly generated `.output` directly into `Rentify-App`.
4. Compresses the `Rentify-App` folder into a distributable `Rentify-App-Latest.zip` file.

## 2. Manual Steps
If you prefer to do it manually, follow these steps:

1. **Build the Application**
   Run the build command to generate the production bundle.
   ```bash
   npm run build
   ```
2. **Transfer Output**
   Delete the old `.output` folder inside `Rentify-App`. Then, copy the newly generated `.output` folder (from your project root) into the `Rentify-App` folder.
   
3. **Zip and Distribute**
   Zip the entire `Rentify-App` folder. You can distribute this zip file.

## How to Run the App
To run the app, the end-user simply extracts the zip file and double-clicks the `start-rentify.bat` file. It will automatically start the lightweight production server and open the app in their default web browser.
