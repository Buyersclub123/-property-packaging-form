# Terminal Commands to Check Logs

**Copy and paste these commands into your terminal:**

---

## **Command 1: Navigate to Project Directory**

```powershell
cd "c:\Users\User\.cursor\extensions\property-review-system\form-app"
```

---

## **Command 2: Check if Log File Exists (for future tests)**

```powershell
if (Test-Path "server-api.log") { Write-Host "Log file found!" ; Get-Content "server-api.log" -Tail 50 } else { Write-Host "Log file not found - will be created on next API call" }
```

---

## **Command 3: Search Terminal History for Folder Creation Logs**

```powershell
Get-History | Where-Object { $_.CommandLine -like "*create-property-folder*" -or $_.CommandLine -like "*add-suburb*" } | Select-Object -Last 10
```

**Note:** This only works if the commands were run in PowerShell. If the logs are in the terminal output, you'll need to scroll up manually.

---

## **Command 4: Check Recent Log Files**

```powershell
Get-ChildItem -Filter "*.log" -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 5 FullName, LastWriteTime, Length
```

---

## **Command 5: Read Server API Log (if it exists)**

```powershell
Get-Content "server-api.log" -Tail 100
```

---

## **What to Do:**

1. **Copy Command 1** - Navigate to project
2. **Copy Command 2** - Check if log file exists
3. **If log file exists:** Copy Command 5 to read it
4. **If log file doesn't exist:** The previous test was before file logging was added
   - We'll need to use file logging for the next test
   - OR you can scroll up in the terminal to find the logs manually

---

**Start with Command 1, then Command 2, and share the output!**
