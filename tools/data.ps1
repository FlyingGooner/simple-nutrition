<#
.SYNOPSIS
  Bygger livsmedelsdatan och jämför den mot standardvärden – kör regelbundet (release.ps1 kör den när data ändrats).
.DESCRIPTION
  1. build-data.ps1: data/indata/* -> data/foods.js (appen) + data/byggt/* (mellanfiler, inte i git).
  2. test-maltider.ps1: 30 vanliga rätter med allmänna standardvärden per ingrediens (data/test/test-maltider.csv, kolumnerna est_*)
     mot vår databank, per portion, ±10 % kcal.
  3. test-maltider.ps1 -Fil test-dag.csv: en hel dag (frukost–kväll) på samma sätt.
  4. test-data.ps1: typiska recept (data/test/test-ratter.csv) mot Livsmedelsverkets egna färdiga rätter, kcal/100 g ±20 %.
     Två kända avvikelser (vattenförlust vid kokning) räknas inte.
  5. test-maltider.ps1 -Fil test-ratter50.csv: 61 blandade rätter med grova standardvärden, ±20 % (fångar felkopplingar,
     t.ex. lätt kokosmjölk som Normal; 10–16 % skillnad mot Livsmedelsverket för tofu, falafel, sidfläsk m.fl. är normalt).
  Skriver en rad per test; -Full visar hela tabellerna. Exit 1 om något test avviker. Inga nätverksanrop.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\data.ps1
  powershell -ExecutionPolicy Bypass -File tools\data.ps1 -Full
#>
param([switch]$Full)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$dir = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force (Join-Path $dir 'data\byggt') | Out-Null

function Run([string]$label, [string]$script, [string[]]$extra = @()) {
  $out = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot $script) @extra 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  if ($Full) { $out | ForEach-Object { Write-Host "    $_" } }
  else { $out | Where-Object { $_ -cmatch 'AVVIKER|SAKNAS' } | ForEach-Object { Write-Host "    $_" } }
  $sum = ($out | Where-Object { $_ -match 'Avvikelser:|foods\.js:' } | Select-Object -Last 1)
  Write-Host "  $(if ($code) { 'FEL ' } else { 'ok  ' }) $label – $sum"
  return $code
}

$codes = @()
$codes += Run 'Bygg datan' 'build-data.ps1'
$codes += Run 'Rätter mot standardvärden' 'test-maltider.ps1'
$codes += Run 'En hel dag mot standardvärden' 'test-maltider.ps1' @('-Fil', 'test-dag.csv')
$codes += Run 'Recept mot Livsmedelsverkets rätter' 'test-data.ps1'
$codes += Run '61 blandade rätter mot standardvärden (bred, ±20 %)' 'test-maltider.ps1' @('-Fil', 'test-ratter50.csv', '-Tolerans', '20')
$fail = @($codes | Where-Object { $_ }).Count
Write-Host "=== Data: $(if ($fail) { "$fail FEL" } else { 'allt ok' })"
if ($fail) { exit 1 }
