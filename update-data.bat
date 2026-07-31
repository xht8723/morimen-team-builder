@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "EXIT_CODE=0"
set "NO_PAUSE=0"
set "PUSHD_DONE=0"
set "TEMP_REPO="
set "REPOSITORY_URL=https://github.com/dansa/SKeyDB.git"

if /I "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    shift /1
)

if not "%~1"=="" (
    echo ERROR: Unknown argument "%~1".
    echo Usage: %~nx0 [--no-pause]
    set "EXIT_CODE=2"
    goto :finish
)

pushd "%~dp0" >nul
if errorlevel 1 (
    echo ERROR: Could not open the script directory "%~dp0".
    set "EXIT_CODE=1"
    goto :finish
)
set "PUSHD_DONE=1"

where git >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is required but was not found in PATH.
    set "EXIT_CODE=1"
    goto :cleanup
)

where robocopy >nul 2>&1
if errorlevel 1 (
    echo ERROR: Robocopy is required but was not found in PATH.
    set "EXIT_CODE=1"
    goto :cleanup
)

if not defined TEMP (
    echo ERROR: The TEMP environment variable is not defined.
    set "EXIT_CODE=1"
    goto :cleanup
)

:choose_temp_directory
set "TEMP_REPO=%TEMP%\SKeyDB-update-%RANDOM%-%RANDOM%"
if exist "%TEMP_REPO%" goto :choose_temp_directory

echo Downloading the latest SKeyDB data from the main branch...
git clone --quiet --depth 1 --filter=blob:none --sparse --branch main --single-branch "%REPOSITORY_URL%" "%TEMP_REPO%"
if errorlevel 1 (
    echo ERROR: Failed to clone SKeyDB.
    set "EXIT_CODE=1"
    goto :cleanup
)

git -C "%TEMP_REPO%" sparse-checkout set src/assets src/data/public-v3
if errorlevel 1 (
    echo ERROR: Failed to download the requested SKeyDB folders.
    set "EXIT_CODE=1"
    goto :cleanup
)

if not exist "%TEMP_REPO%\src\assets\" (
    echo ERROR: The downloaded repository does not contain src/assets.
    set "EXIT_CODE=1"
    goto :cleanup
)

if not exist "%TEMP_REPO%\src\data\public-v3\records\" (
    echo ERROR: The downloaded repository does not contain src/data/public-v3/records.
    set "EXIT_CODE=1"
    goto :cleanup
)

if not exist "%TEMP_REPO%\src\data\public-v3\manifest.json" (
    echo ERROR: The downloaded repository does not contain the public-v3 manifest.
    set "EXIT_CODE=1"
    goto :cleanup
)

if not exist "%TEMP_REPO%\src\data\public-v3\indexes\assets.json" (
    echo ERROR: The downloaded repository does not contain the public-v3 asset index.
    set "EXIT_CODE=1"
    goto :cleanup
)

if not exist "%TEMP_REPO%\src\data\public-v3\indexes\builder-catalog.json" (
    echo ERROR: The downloaded repository does not contain the builder catalog.
    set "EXIT_CODE=1"
    goto :cleanup
)

set "UPSTREAM_COMMIT="
for /f "delims=" %%I in ('git -C "%TEMP_REPO%" rev-parse --short HEAD 2^>nul') do set "UPSTREAM_COMMIT=%%I"
if not defined UPSTREAM_COMMIT (
    echo ERROR: Could not determine the downloaded SKeyDB commit.
    set "EXIT_CODE=1"
    goto :cleanup
)

if not exist "data\assets\" mkdir "data\assets"
if not exist "data\assets\" (
    echo ERROR: Could not create data\assets.
    set "EXIT_CODE=1"
    goto :cleanup
)

if not exist "data\records\" mkdir "data\records"
if not exist "data\records\" (
    echo ERROR: Could not create data\records.
    set "EXIT_CODE=1"
    goto :cleanup
)

if not exist "data\meta\" mkdir "data\meta"
if not exist "data\meta\" (
    echo ERROR: Could not create data\meta.
    set "EXIT_CODE=1"
    goto :cleanup
)

echo Downloaded SKeyDB commit %UPSTREAM_COMMIT%.
echo.
echo Updating data\assets...
robocopy "%TEMP_REPO%\src\assets" "data\assets" /E /IS /COPY:DAT /DCOPY:DAT /R:2 /W:1 /XJ /NFL /NDL /NP
set "ROBOCOPY_RESULT=%ERRORLEVEL%"
if %ROBOCOPY_RESULT% GEQ 8 (
    echo ERROR: Robocopy failed while updating data\assets ^(exit code %ROBOCOPY_RESULT%^).
    set "EXIT_CODE=1"
    goto :cleanup
)

echo.
echo Updating data\records...
robocopy "%TEMP_REPO%\src\data\public-v3\records" "data\records" /E /IS /COPY:DAT /DCOPY:DAT /R:2 /W:1 /XJ /NFL /NDL /NP
set "ROBOCOPY_RESULT=%ERRORLEVEL%"
if %ROBOCOPY_RESULT% GEQ 8 (
    echo ERROR: Robocopy failed while updating data\records ^(exit code %ROBOCOPY_RESULT%^).
    set "EXIT_CODE=1"
    goto :cleanup
)

echo.
echo Updating data metadata...
copy /Y "%TEMP_REPO%\src\data\public-v3\manifest.json" "data\meta\manifest.json" >nul
if errorlevel 1 (
    echo ERROR: Failed to update data\meta\manifest.json.
    set "EXIT_CODE=1"
    goto :cleanup
)

copy /Y "%TEMP_REPO%\src\data\public-v3\indexes\assets.json" "data\meta\assets.json" >nul
if errorlevel 1 (
    echo ERROR: Failed to update data\meta\assets.json.
    set "EXIT_CODE=1"
    goto :cleanup
)

copy /Y "%TEMP_REPO%\src\data\public-v3\indexes\builder-catalog.json" "data\meta\builder-catalog.json" >nul
if errorlevel 1 (
    echo ERROR: Failed to update data\meta\builder-catalog.json.
    set "EXIT_CODE=1"
    goto :cleanup
)

echo.
echo Update completed successfully at SKeyDB commit %UPSTREAM_COMMIT%.

:cleanup
if defined TEMP_REPO if exist "%TEMP_REPO%\" (
    rmdir /S /Q "%TEMP_REPO%"
    if exist "%TEMP_REPO%\" (
        echo ERROR: Could not remove temporary directory "%TEMP_REPO%".
        set "EXIT_CODE=1"
    )
)

:finish
if "%PUSHD_DONE%"=="1" popd

if "%NO_PAUSE%"=="0" (
    echo.
    pause
)

endlocal & exit /B %EXIT_CODE%
