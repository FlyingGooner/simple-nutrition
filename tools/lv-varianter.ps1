# Listar Livsmedelsverkets rader som matchar ett sökord: id, kcal, P, K, F per 100 g. Inga nätverksanrop.
#   powershell -ExecutionPolicy Bypass -File tools\lv-varianter.ps1 pannkaka
param([Parameter(Mandatory)][string]$Sokord)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$root = Split-Path $PSScriptRoot -Parent
$all = ([IO.File]::ReadAllText("$root\data\indata\livsmedelsverket.json", [Text.Encoding]::UTF8) | ConvertFrom-Json).livsmedel
$hit = @($all | Where-Object { $_.namn -like "*$Sokord*" })
Write-Output ("{0,6} {1,5} {2,5} {3,5} {4,5}  {5}" -f 'id', 'kcal', 'P', 'K', 'F', 'namn')
foreach ($x in $hit) { Write-Output ("{0,6} {1,5} {2,5} {3,5} {4,5}  {5}" -f $x.id, $x.kcal, $x.prot, $x.kolh, $x.fett, $x.namn) }
Write-Output "$($hit.Count) träffar"
