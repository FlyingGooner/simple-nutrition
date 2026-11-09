# Räknar näring per portion för data/recept-exempel.csv ur data/karna.json. Inga nätverksanrop.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$k = ([IO.File]::ReadAllText("$root\data\karna.json", [Text.Encoding]::UTF8) | ConvertFrom-Json).varor
$idx = @{}; foreach ($v in $k) { foreach ($x in $v.varianter) { $idx["$($v.vara)|$($x.etikett)"] = $x } }
$rows = Import-Csv "$root\data\recept-exempel.csv" -Delimiter ';' -Encoding UTF8
$fel = 0
Write-Host ("{0,-26} {1,4} {2,7} | per portion: {3,5} {4,6} {5,6} {6,6}" -f 'Rätt', 'port', 'g tot', 'kcal', 'prot', 'kolh', 'fett')
foreach ($g in ($rows | Group-Object ratt)) {
  $t = @{ g = 0; kcal = 0; prot = 0; kolh = 0; fett = 0 }
  foreach ($r in $g.Group) {
    $x = $idx["$($r.vara)|$($r.variant)"]
    if (-not $x) { Write-Host "SAKNAS: $($g.Name): $($r.vara) / $($r.variant)" -ForegroundColor Yellow; $fel++; continue }
    $f = [double]$r.gram / 100; $t.g += [double]$r.gram
    $t.kcal += $x.kcal * $f; $t.prot += $x.prot * $f; $t.kolh += $x.kolh * $f; $t.fett += $x.fett * $f
  }
  $n = [double]$g.Group[0].portioner
  Write-Host ("{0,-26} {1,4} {2,7} | {3,17:N0} {4,6:N1} {5,6:N1} {6,6:N1}" -f $g.Name, $n, $t.g, ($t.kcal / $n), ($t.prot / $n), ($t.kolh / $n), ($t.fett / $n))
}
if ($fel) { exit 1 }
