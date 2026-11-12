# Jämför schabloner (tools/data/schabloner.csv) mot referenser (tools/data/referens.csv) per portion.
# Detaljer -> tools/data/jämförelse.csv; sammanfattning en rad per schablon. -PassThru: returnerar raderna (för testet), skriver ingen fil.
#   powershell -ExecutionPolicy Bypass -File tools\compare-schabloner.ps1
param([switch]$PassThru, [double]$Tolerans = 10, [double]$MaxKcal = 100)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$d = Join-Path $PSScriptRoot 'data'
$sch = @(Import-Csv "$d\schabloner.csv" -Delimiter ';' -Encoding UTF8)
$ref = @(Import-Csv "$d\referens.csv" -Delimiter ';' -Encoding UTF8)
$inv = [Globalization.CultureInfo]::InvariantCulture
function Num($s) { if ("$s".Trim() -eq '') { return $null }; [double]::Parse(("$s".Trim() -replace ',', '.'), $inv) }
function Median([double[]]$a) { $s = @($a | Sort-Object); $n = $s.Count; if (-not $n) { return $null }; if ($n % 2) { $s[[int](($n - 1) / 2)] } else { ($s[$n / 2 - 1] + $s[$n / 2]) / 2 } }
$detail = @(); $sum = @()
foreach ($s in $sch) {
  $g = Num $s.g_per_enhet; $skcal = (Num $s.kcal) * $g / 100
  $rs = @($ref | Where-Object { $_.schablon_id -eq $s.id })
  $port = @()
  foreach ($r in $rs) {
    $pg = Num $r.portion_g; if ($null -eq $pg) { $pg = $g }
    $pk = (Num $r.kcal) * $pg / 100; $port += $pk
    $detail += [pscustomobject]@{ schablon_id = $s.id; referens = $r.namn; portion_g = $pg; portion_kcal = [math]::Round($pk); schablon_kcal = [math]::Round($skcal); diff_kcal = [math]::Round($pk - $skcal); 'säker' = $r.'säker'; 'källa' = $r.'källa' }
  }
  $grams = @($rs | ForEach-Object { Num $_.portion_g } | Where-Object { $null -ne $_ })
  $med = Median $port
  $medDiff = if ($med) { ($skcal - $med) / $med * 100 } else { $null }
  $maxAbs = if ($port.Count) { ($port | ForEach-Object { [math]::Abs($_ - $skcal) } | Measure-Object -Maximum).Maximum } else { $null }
  $gOk = -not $grams.Count -or ($g -ge ($grams | Measure-Object -Minimum).Minimum -and $g -le ($grams | Measure-Object -Maximum).Maximum)
  $mOk = $null -eq $med -or ([math]::Abs($medDiff) -le $Tolerans -and $maxAbs -le $MaxKcal)
  $sum += [pscustomobject]@{
    id = $s.id; namn = "$($s.namn)$(if ($s.val) { " ($($s.val))" })"; refs = $rs.Count; schablon_kcal = [math]::Round($skcal)
    median_kcal = $(if ($null -ne $med) { [math]::Round($med) }); diff_pct = $(if ($null -ne $medDiff) { [math]::Round($medDiff, 1) })
    max_avvik_kcal = $(if ($null -ne $maxAbs) { [math]::Round($maxAbs) }); g_ok = $gOk; median_ok = $mOk
    status = $(if ($gOk -and $mOk) { 'OK' } else { 'VARNING' }); 'föreslaget_kcal_100g' = $(if ($med -and $g) { [math]::Round($med / $g * 100) })
  }
}
if ($PassThru) { return $sum }
$detail | Export-Csv "$d\jämförelse.csv" -Delimiter ';' -Encoding UTF8 -NoTypeInformation
if ($sum.Count) { $sum | Format-Table -AutoSize | Out-String -Width 200 | Write-Output }
Write-Output "$($sum.Count) schabloner, $(@($sum | Where-Object status -ne 'OK').Count) varningar. Detaljer: tools\data\jämförelse.csv"
