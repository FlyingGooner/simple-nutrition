# Jämför per portion: allmän uppskattning (est_*-kolumner) mot databanken (karna.json / lmv-id). Inga nätverksanrop.
param([double]$Tolerans = 10, [string]$Fil = 'test-maltider.csv')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$k = ([IO.File]::ReadAllText("$root\data\byggt\karna.json", [Text.Encoding]::UTF8) | ConvertFrom-Json).varor
$all = ([IO.File]::ReadAllText("$root\data\indata\livsmedelsverket.json", [Text.Encoding]::UTF8) | ConvertFrom-Json).livsmedel
$byId = @{}; foreach ($x in $all) { $byId[[string]$x.id] = $x }
$idx = @{}; foreach ($v in $k) { foreach ($x in $v.varianter) { $idx["$($v.vara)|$($x.etikett)"] = $x } }
$inv = [Globalization.CultureInfo]::InvariantCulture
$fel = 0; $sumE = 0; $sumD = 0
foreach ($g in (Import-Csv "$root\data\test\$Fil" -Delimiter ';' -Encoding UTF8 | Group-Object ratt)) {
  $e = @{ kcal = 0; prot = 0; kolh = 0; fett = 0 }; $d = @{ kcal = 0; prot = 0; kolh = 0; fett = 0 }
  foreach ($r in $g.Group) {
    $f = [double]$r.gram / 100
    $e.kcal += [double]::Parse($r.est_kcal, $inv) * $f; $e.prot += [double]::Parse($r.est_p, $inv) * $f
    $e.kolh += [double]::Parse($r.est_k, $inv) * $f; $e.fett += [double]::Parse($r.est_f, $inv) * $f
    $x = if ($r.db -eq '-') { [pscustomobject]@{ kcal = 0; prot = 0; kolh = 0; fett = 0 } }
         elseif ($r.db -like 'lmv:*') { $byId[$r.db.Substring(4)] } else { $idx[$r.db] }
    if (-not $x) { Write-Host "SAKNAS i databanken: $($r.db)" -ForegroundColor Yellow; $fel++; continue }
    foreach ($n in 'kcal', 'prot', 'kolh', 'fett') { $d[$n] += [double]$x.$n * $f }
  }
  $p = [double]$g.Group[0].portioner; $sumE += $e.kcal / $p; $sumD += $d.kcal / $p
  $diff = ($d.kcal - $e.kcal) / $e.kcal * 100
  $ok = [math]::Abs($diff) -le $Tolerans; if (-not $ok) { $fel++ }
  Write-Host ("{0} ({1} port)" -f $g.Name, $p)
  Write-Host ("  Uppskattning: {0,5:N0} kcal  P {1,5:N1}  K {2,5:N1}  F {3,5:N1}" -f ($e.kcal / $p), ($e.prot / $p), ($e.kolh / $p), ($e.fett / $p))
  Write-Host ("  Databanken:   {0,5:N0} kcal  P {1,5:N1}  K {2,5:N1}  F {3,5:N1}   {4:+0.0;-0.0}%  {5}" -f ($d.kcal / $p), ($d.prot / $p), ($d.kolh / $p), ($d.fett / $p), $diff, $(if ($ok) { 'OK' } else { 'AVVIKER' })) -ForegroundColor $(if ($ok) { 'Gray' } else { 'Red' })
}
Write-Host ("Summa (1 portion av varje): uppskattning {0:N0} kcal, databanken {1:N0} kcal" -f $sumE, $sumD)
Write-Host "Tolerans ±$Tolerans % kcal per portion. Avvikelser: $fel"
if ($fel) { exit 1 }
