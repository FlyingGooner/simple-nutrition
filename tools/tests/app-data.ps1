# Test: appens data som användaren möter den. Läser data/foods.js (FOODS_PRODUCTS, FOODS_CORE, FOODS_MORE),
# söker som appen (exakt sökord: schablon före kärna, sedan början av ord, sist Livsmedelsverket), räknar enheter som
# views/add.js unitsOf (naturlig enhet, flytande dl/ml via densitet, annars g) och jämför mot oberoende referenser.
#   tools/data/scenarier.csv  en loggning per rad: väntad träff + kcal mot referens (förpackning/LV), ±tolerans %
#   tools/data/recept.csv     rätter byggda av ingredienser: kcal/100 g tillagat mot LV-rätt och schablon
# Fel -> exit 1. Inga nätverksanrop.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$tools = Split-Path $PSScriptRoot -Parent; $root = Split-Path $tools -Parent; $d = Join-Path $tools 'data'
$inv = [Globalization.CultureInfo]::InvariantCulture
function Num($s) { [double]::Parse(("$s".Trim() -replace ',', '.'), $inv) }
$script:fel = 0
function Fel($t) { Write-Output "AVVIKER: $t"; $script:fel++ }

# foods.js -> objekt (nycklarna citeras så att texten blir JSON)
$js = [IO.File]::ReadAllText("$root\data\foods.js", [Text.Encoding]::UTF8)
function Arr($name) {
  $i = $js.IndexOf("const $name = ["); $s = $js.IndexOf('[', $i); $e = $js.IndexOf("`n];", $s)
  $txt = $js.Substring($s, $e - $s + 2) -replace '([{,])([a-z]+):', '$1"$2":' -replace ',\s*\]$', ']' -replace ",`r?`n\]", ']'
  , ($txt | ConvertFrom-Json)
}
$foods = @()
foreach ($f in (Arr 'FOODS_PRODUCTS')) { $foods += [pscustomobject]@{ name = $f.name; words = @($f.name.ToLower()) + @($f.q); v = $f.v; src = 'schablon' } }
foreach ($f in (Arr 'FOODS_CORE')) { $foods += [pscustomobject]@{ name = $f.name; words = @($f.name.ToLower()) + @($f.q); v = $f.v; src = 'kärna' } }
foreach ($r in (Arr 'FOODS_MORE')) { $foods += [pscustomobject]@{ name = $r[1]; words = @($r[1].ToLower()); v = @([pscustomobject]@{ l = ''; n = @($r[2], $r[3], $r[4], $r[5]) }); src = 'LV' } }

function Find($q) {
  $q = $q.ToLower()
  $hit = $foods | Where-Object { $_.src -ne 'LV' -and $_.words -contains $q } | Select-Object -First 1
  if (-not $hit) { $hit = $foods | Where-Object { $_.src -ne 'LV' -and ($_.words | Where-Object { $_.StartsWith($q) }) } | Select-Object -First 1 }
  if (-not $hit) { $hit = $foods | Where-Object { $_.words[0] -like "*$q*" } | Select-Object -First 1 }
  $hit
}
function Units($v) {   # som views/add.js unitsOf
  $out = [ordered]@{}
  if ($v.u) { $out[$v.u[0]] = [double]$v.u[1] }
  if ($v.d) { if (-not $out.Contains('dl')) { $out['dl'] = [double]$v.d * 100 }; $out['ml'] = [double]$v.d } else { $out['g'] = 1.0 }
  $out
}
# En loggning -> @{ g; kcal; food; v } eller text med felet
function Log($sok, $val, $mangd, $enhet) {
  if ($sok -eq '-') { return @{ g = (Num $mangd); kcal = 0.0; food = [pscustomobject]@{ name = 'vatten'; src = '-' } } }
  $f = Find $sok; if (-not $f) { return "'$sok' ger ingen träff" }
  $v = if ($val) { $f.v | Where-Object { $_.l -like "$val*" } | Select-Object -First 1 } else { $f.v[0] }
  if (-not $v) { return "'$sok' ($($f.name)) saknar varianten '$val'" }
  $u = Units $v
  if (-not $u.Contains($enhet)) { return "'$sok' ($($f.name)) saknar enheten $enhet (har $($u.Keys -join ', '))" }
  $g = (Num $mangd) * $u[$enhet]
  @{ g = $g; kcal = [double]$v.n[0] * $g / 100; food = $f; v = $v }
}

# 1. Loggningar
$n1 = 0
foreach ($s in (Import-Csv "$d\scenarier.csv" -Delimiter ';' -Encoding UTF8)) {
  $n1++; $r = Log $s.'sök' $s.val $s.'mängd' $s.enhet
  if ($r -is [string]) { Fel "$($s.id): $r"; continue }
  if ($s.'väntad' -and $r.food.name -ne $s.'väntad') { Fel "$($s.id): '$($s.'sök')' ger $($r.food.name) ($($r.food.src)), väntat $($s.'väntad')" }
  $ref = Num $s.ref_kcal; $tol = Num $s.tolerans
  $diff = $r.kcal - $ref; $pct = if ($ref) { $diff / $ref * 100 } else { 0 }
  $ok = [math]::Abs($diff) -le [math]::Max($ref * $tol / 100, 10)
  $line = '{0,-22} {1,6} {2,-6} -> {3,-28} {4,5:N0} g {5,5:N0} kcal  ref {6,5:N0} ({7:+0;-0} %)  {8}' -f $s.id, $s.'mängd', $s.enhet, "$($r.food.name) [$($r.food.src)]", $r.g, $r.kcal, $ref, $pct, $s.'källa'
  if ($ok) { Write-Output "  ok  $line" } else { Fel $line }
}

# 2. Rätter byggda av ingredienser
$n2 = 0
foreach ($grp in (Import-Csv "$d\recept.csv" -Delimiter ';' -Encoding UTF8 | Group-Object 'rätt')) {
  $n2++; $kcal = 0.0; $raw = 0.0; $bad = $false
  foreach ($x in $grp.Group) {
    $r = Log $x.'sök' $x.val $x.'mängd' $x.enhet
    if ($r -is [string]) { Fel "$($grp.Name): $r"; $bad = $true; continue }
    $kcal += $r.kcal; $raw += $r.g
  }
  if ($bad) { continue }
  $h = $grp.Group[0]; $cooked = Num $h.tillagad_g; $per100 = $kcal / $cooked * 100
  Write-Output ('  {0}: {1:N0} g råvaror, {2:N0} g tillagat, {3:N0} kcal = {4:N0} kcal/100 g' -f $grp.Name, $raw, $cooked, $kcal, $per100)
  foreach ($j in ($h.'jämför' -split ',')) {
    $j = $j.Trim(); $tol = Num $h.tolerans
    if ($j -like 'lv:*') { $id = $j.Substring(3); $ref = (Arr 'FOODS_MORE' | Where-Object { [string]$_[0] -eq $id } | Select-Object -First 1)
      if (-not $ref) { $all = ([IO.File]::ReadAllText("$root\data\indata\livsmedelsverket.json", [Text.Encoding]::UTF8) | ConvertFrom-Json).livsmedel; $x = $all | Where-Object { [string]$_.id -eq $id }; $refK = [double]$x.kcal; $nm = $x.namn } else { $refK = [double]$ref[2]; $nm = $ref[1] } }
    elseif ($j -like 'p:*') { $id = $j.Substring(2); $p = (Arr 'FOODS_PRODUCTS') | ForEach-Object { $_.v } | Where-Object { $_.id -eq $id } | Select-Object -First 1; $refK = [double]$p.n[0]; $nm = "schablon $id" }
    $pct = ($per100 - $refK) / $refK * 100
    $line = '      mot {0,-55} {1,4:N0} kcal/100 g ({2:+0;-0} %)' -f $nm, $refK, $pct
    if ([math]::Abs($pct) -le $tol) { Write-Output "  ok$line" } else { Fel "$($grp.Name)$line" }
  }
}
Write-Output "$n1 loggningar, $n2 rätter byggda. Avvikelser: $($script:fel)"
if ($script:fel) { exit 1 }
