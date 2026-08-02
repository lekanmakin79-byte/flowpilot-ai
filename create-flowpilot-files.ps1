# FlowPilot AI Landing Page Structure Generator

Write-Host "Creating FlowPilot AI structure..." -ForegroundColor Green

# Create folders
New-Item -ItemType Directory -Force -Path "components\landing" | Out-Null
New-Item -ItemType Directory -Force -Path "lib" | Out-Null

# Landing components
$components = @(
    "Navbar.tsx",
    "Hero.tsx",
    "Problems.tsx",
    "Solution.tsx",
    "HowItWorks.tsx",
    "Features.tsx",
    "Waitlist.tsx",
    "Footer.tsx"
)

foreach ($file in $components) {

    $path = "components\landing\$file"

    if (!(Test-Path $path)) {
        New-Item -ItemType File -Path $path | Out-Null
        Write-Host "Created $path" -ForegroundColor Cyan
    }
    else {
        Write-Host "$path already exists" -ForegroundColor Yellow
    }
}


# Library files
$libFiles = @(
    "lib\supabase.ts"
)

foreach ($file in $libFiles) {

    if (!(Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "Created $file" -ForegroundColor Cyan
    }
}


Write-Host ""
Write-Host "FlowPilot AI folders created successfully 🚀" -ForegroundColor Green