# Test: räknar kcal/100 g för typiska recept (data/test-ratter.csv) ur vår data och jämför med
# Livsmedelsverkets värde för samma färdiga rätt. Inga nätverksanrop. Exit 1 vid avvikelse > tolerans.
param([double]$Tolerans = 20)
# Kända avvikelser: vattnet som kokar bort finns i Livsmedelsverkets färdiga rätt men inte i vårt recept (råvikt). Räknas inte som fel.
$Kanda = @('Spagetti och köttfärssås', 'Kycklinggryta med grädde')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$k = ([IO.File]::ReadAllText("$root\data\byggt\karna.json", [Text.Encoding]::UTF8) | ConvertFrom-Json).varor
$all = ([IO.File]::ReadAllText("$root\data\indata\livsmedelsverket.json", [Text.Encoding]::UTF8) | ConvertFrom-Json).livsmedel
$byId = @{}; foreach ($x in $all) { $byId[[string]$x.id] = $x }
$idx = @{}; foreach ($v in $k) { foreach ($x in $v.varianter) { $idx["$($v.vara)|$($x.etikett)"] = $x } }
$rows = Import-Csv "$root\data\test\test-ratter.csv" -Delimiter ';' -Encoding UTF8
$fel = 0
Write-Host ("{0,-28} {1,15} {2,15} {3,7}  {4}" -f 'Rätt', 'Vår kcal/P/K/F', 'LV kcal/P/K/F', 'Diff', 'Resultat')
foreach ($g in ($rows | Group-Object ratt)) {
  $t = @{ g = 0; kcal = 0; prot = 0; kolh = 0; fett = 0 }
  foreach ($r in $g.Group) {
    $x = if ($r.vara -eq 'Vatten') { [pscustomobject]@{ kcal = 0; prot = 0; kolh = 0; fett = 0 } }
         elseif ($r.variant -like 'lmv:*') { $byId[$r.variant.Substring(4)] }
         else { $idx["$($r.vara)|$($r.variant)"] }
    if (-not $x) { Write-Host "SAKNAS: $($g.Name): $($r.vara) / $($r.variant)" -ForegroundColor Yellow; $fel++; continue }
    $f = [double]$r.gram / 100; $t.g += [double]$r.gram
    foreach ($n in 'kcal', 'prot', 'kolh', 'fett') { $t[$n] += [double]$x.$n * $f }
  }
  $per = @{}; foreach ($n in 'kcal', 'prot', 'kolh', 'fett') { $per[$n] = $t[$n] / $t.g * 100 }
  $lv = $byId[[string]$g.Group[0].lmv_ratt]
  $diff = ($per.kcal - $lv.kcal) / $lv.kcal * 100
  $ok = [math]::Abs($diff) -le $Tolerans; $known = -not $ok -and $Kanda -contains $g.Name; if (-not $ok -and -not $known) { $fel++ }
  Write-Host ("{0,-28} {1,15} {2,15} {3,6:+0;-0}%  {4}" -f $g.Name,
    ("{0:N0}/{1:N1}/{2:N1}/{3:N1}" -f $per.kcal, $per.prot, $per.kolh, $per.fett),
    ("{0:N0}/{1:N1}/{2:N1}/{3:N1}" -f $lv.kcal, $lv.prot, $lv.kolh, $lv.fett),
    $diff, $(if ($ok) { 'OK' } elseif ($known) { 'KÄND (vattenförlust)' } else { 'AVVIKER' })) -ForegroundColor $(if ($ok -or $known) { 'Gray' } else { 'Red' })
}
Write-Host "Tolerans ±$Tolerans % på kcal/100 g. Avvikelser: $fel"
if ($fel) { exit 1 }
