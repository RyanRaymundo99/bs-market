$files = Get-ChildItem -Path "scripts\debug\*.ts" -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace 'from "\./src/', 'from "../../src/'
    $newContent = $newContent -replace 'from "\./prisma/', 'from "../../prisma/'
    if ($content -ne $newContent) {
        $newContent | Set-Content $file.FullName
        Write-Host "Fixed: $($file.FullName)"
    }
}

$rootFiles = Get-ChildItem -Path "scripts\*.ts"
foreach ($file in $rootFiles) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace 'from "\./src/', 'from "../src/'
    $newContent = $newContent -replace 'from "\./prisma/', 'from "../prisma/'
    if ($content -ne $newContent) {
        $newContent | Set-Content $file.FullName
        Write-Host "Fixed: $($file.FullName)"
    }
}
