# Test: tools/data/schabloner.csv och referens.csv (Del 2 Steg 0). Fel -> exit 1, varningar stoppar inte. Inga nätverksanrop.
#   1 format  2 sökord  3 enhet/densitet  4 märken  5 makron  6 antal referenser  7 g per enhet (varning)  8 median (varning)  9 val  10 densitet
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$tools = Split-Path $PSScriptRoot -Parent; $root = Split-Path $tools -Parent; $d = Join-Path $tools 'data'
$inv = [Globalization.CultureInfo]::InvariantCulture
$script:fel = 0; $script:varn = 0
function Fel($t) { Write-Output "AVVIKER: $t"; $script:fel++ }
function Varn($t) { Write-Output "VARNING: $t"; $script:varn++ }
function IsNum($s) { $x = 0.0; ([double]::TryParse(("$s".Trim() -replace ',', '.'), [Globalization.NumberStyles]::Float, $inv, [ref]$x)) -and $x -ge 0 }
function Num($s) { [double]::Parse(("$s".Trim() -replace ',', '.'), $inv) }
function Header($f) { ([IO.File]::ReadAllLines($f, [Text.Encoding]::UTF8)[0]).TrimStart([char]0xFEFF) }
$colS = 'id;typ;namn;val;undertext;sökord;enhet;g_per_enhet;densitet;kcal;P;K;F;källa'
$colR = 'schablon_id;namn;kcal;P;K;F;portion_g;källa;säker'

# 1 format: kolumner, tal, unika id
if ((Header "$d\schabloner.csv") -ne $colS) { Fel 'schabloner.csv: fel kolumner' }
if ((Header "$d\referens.csv") -ne $colR) { Fel 'referens.csv: fel kolumner' }
$sch = @(Import-Csv "$d\schabloner.csv" -Delimiter ';' -Encoding UTF8)
$ref = @(Import-Csv "$d\referens.csv" -Delimiter ';' -Encoding UTF8)
$ids = @{}
foreach ($s in $sch) {
  if (-not $s.id -or $ids.ContainsKey($s.id)) { Fel "schablon-id saknas/dubblett: '$($s.id)'" }; $ids[$s.id] = $s
  if ($s.typ -notin 'produkt', 'rätt') { Fel "$($s.id): typ '$($s.typ)'" }
  if (-not $s.namn) { Fel "$($s.id): namn saknas" }
  foreach ($c in 'g_per_enhet', 'kcal', 'P', 'K', 'F') { if (-not (IsNum $s.$c)) { Fel "$($s.id): $c '$($s.$c)' är inte ett tal" } }
  if ($s.densitet -and -not (IsNum $s.densitet)) { Fel "$($s.id): densitet '$($s.densitet)'" }
  if ((IsNum $s.g_per_enhet) -and (Num $s.g_per_enhet) -le 0) { Fel "$($s.id): g_per_enhet måste vara > 0" }
}
foreach ($r in $ref) {
  if (-not $ids.ContainsKey($r.schablon_id)) { Fel "referens '$($r.namn)': okänt schablon_id '$($r.schablon_id)'" }
  foreach ($c in 'kcal', 'P', 'K', 'F') { if (-not (IsNum $r.$c)) { Fel "referens '$($r.namn)': $c '$($r.$c)'" } }
  if ($r.portion_g -and -not (IsNum $r.portion_g)) { Fel "referens '$($r.namn)': portion_g '$($r.portion_g)'" }
  if ($r.'säker' -notin 'ja', 'nej') { Fel "referens '$($r.namn)': säker måste vara ja/nej" }
}

# 2 sökord: inga dubbletter, ingen krock med FOODS_CORE
$core = @{}
$js = [IO.File]::ReadAllText("$root\data\foods.js", [Text.Encoding]::UTF8)
$start = $js.IndexOf('const FOODS_CORE'); $coreJs = $js.Substring($start, $js.IndexOf('];', $start) - $start)
foreach ($m in [regex]::Matches($coreJs, 'q:\[([^\]]*)\]')) { foreach ($w in [regex]::Matches($m.Groups[1].Value, '"([^"]*)"')) { $core[$w.Groups[1].Value.ToLower()] = 1 } }
if ($core.Count -lt 50) { Fel "FOODS_CORE-sökord kunde inte läsas ($($core.Count))" }
$seen = @{}
foreach ($s in $sch) {
  $own = @{}
  foreach ($w in ($s.'sökord' -split ',' | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ })) {
    if ($own.ContainsKey($w)) { Fel "$($s.id): sökord '$w' två gånger" }; $own[$w] = 1
    if ($seen.ContainsKey($w) -and $ids[$seen[$w]].namn -ne $s.namn) { Fel "sökord '$w' i både $($seen[$w]) och $($s.id)" }; $seen[$w] = $s.id
    if ($core.ContainsKey($w)) { Fel "$($s.id): sökord '$w' krockar med FOODS_CORE" }
  }
}

# 3 enhet tillåten; flytande har densitet
$enheter = 'g', 'ml', 'st', 'skiva', 'bit', 'dl', 'glas', 'kopp', 'tsk'
foreach ($s in $sch) {
  if ($s.enhet -notin $enheter) { Fel "$($s.id): enhet '$($s.enhet)' inte tillåten" }
  elseif ($s.enhet -in 'ml', 'glas', 'kopp' -and -not $s.densitet) { Fel "$($s.id): flytande ($($s.enhet)) utan densitet" }
}

# 4 märken: första ordet i en förpackningsreferens får inte stå i namn/undertext
$marken = @($ref | Where-Object { $_.'källa' -match '^förpackning' } | ForEach-Object { ($_.namn.Trim() -split '\s+')[0] } | Where-Object { $_.Length -ge 3 } | Sort-Object -Unique)
foreach ($s in $sch) { foreach ($m in $marken) { if ("$($s.namn) $($s.undertext)" -match "(?i)(^|\W)$([regex]::Escape($m))(\W|$)") { Fel "$($s.id): märket '$m' i namn/undertext" } } }

# 5 makron: 4P+4K+9F inom 10 % av kcal (alkohol undantas)
foreach ($s in $sch) {
  if ("$($s.namn) $($s.val)" -match '(?i)(^|\W)(öl|vin)(\W|$)') { continue }
  if (-not ((IsNum $s.kcal) -and (IsNum $s.P) -and (IsNum $s.K) -and (IsNum $s.F))) { continue }
  $k = Num $s.kcal; $c = 4 * (Num $s.P) + 4 * (Num $s.K) + 9 * (Num $s.F)
  if ($k -gt 0 -and [math]::Abs($c - $k) / $k -gt 0.10) { Fel ("$($s.id): makron ger {0:N0} kcal, angivet {1}" -f $c, $k) }
}

# 6 minst 4 referenser per produktval, 2 per rätt
foreach ($s in $sch) {
  $n = @($ref | Where-Object { $_.schablon_id -eq $s.id }).Count; $min = if ($s.typ -eq 'produkt') { 4 } else { 2 }
  if ($n -lt $min) { Fel "$($s.id): $n referenser, minst $min" }
}

# 9 fler än ett val bara för läsk och öl/vin
foreach ($g in ($sch | Group-Object namn)) { if ($g.Count -gt 1 -and $g.Name -notmatch '(?i)^(läsk|öl)') { Fel "$($g.Name): $($g.Count) val, bara läsk och öl/vin får ha flera" } }

# 7, 8 varningar via jämförelsen (bara när formatet är rätt)
if (-not $script:fel) {
  foreach ($r in @(& (Join-Path $tools 'compare-schabloner.ps1') -PassThru)) {
    if (-not $r.g_ok) { Varn "$($r.id): g per enhet utanför referensernas min–max" }
    if (-not $r.median_ok) { Varn "$($r.id): median $($r.median_kcal) kcal mot $($r.schablon_kcal) ($($r.diff_pct) %), max avvikelse $($r.max_avvik_kcal) kcal" }
  }
}
# A1 FOODS_PRODUCTS i foods.js stämmer med schabloner.csv (id, namn, kcal, gram per enhet – ingen handändring)
$ps = $js.IndexOf('const FOODS_PRODUCTS')
if ($ps -lt 0) { Fel 'FOODS_PRODUCTS saknas i foods.js – kör tools\build-data.ps1' }
else {
  $pjs = $js.Substring($ps, $js.IndexOf('];', $ps) - $ps)
  $got = @([regex]::Matches($pjs, '\{l:"[^"]*",id:"([^"]+)",n:\[([^,\]]+),[^\]]*\],u:\["[^"]+",([^\]]+)\](,d:[^}]+)?\}') | ForEach-Object { "$($_.Groups[1].Value)|$($_.Groups[2].Value)|$($_.Groups[3].Value)" })
  $want = @($sch | ForEach-Object { "$($_.id)|$((Num $_.kcal).ToString([Globalization.CultureInfo]::InvariantCulture))|$((Num $_.g_per_enhet).ToString([Globalization.CultureInfo]::InvariantCulture))" })
  $diff = @(Compare-Object $want $got)
  if ($diff.Count) { Fel "FOODS_PRODUCTS skiljer sig från schabloner.csv: $(($diff | Select-Object -First 3 | ForEach-Object { $_.InputObject }) -join ', ')" }
  foreach ($g in ($sch | Group-Object namn)) { if ($pjs -notmatch [regex]::Escape("{name:`"$($g.Name)`"")) { Fel "FOODS_PRODUCTS saknar $($g.Name)" } }
}
# 10 densitet: varje flytande vara (schabloner.csv och data/indata/matt.csv) har referens i densitet.csv, inom 3 %
$dref = @{}; foreach ($x in (Import-Csv "$d\densitet.csv" -Delimiter ';' -Encoding UTF8)) { $dref[$x.nyckel] = Num $x.densitet }
$liq = @($sch | Where-Object { $_.densitet } | ForEach-Object { @{ k = $_.id; d = Num $_.densitet } })
$liq += @(Import-Csv "$root\data\indata\matt.csv" -Delimiter ';' -Encoding UTF8 | Where-Object { $_.densitet } | ForEach-Object { @{ k = if ($_.variant) { "$($_.vara)|$($_.variant)" } else { $_.vara }; d = Num $_.densitet } })
foreach ($x in $liq) {
  if (-not $dref.ContainsKey($x.k)) { Fel "densitet: $($x.k) saknar referens i densitet.csv" }
  elseif ([math]::Abs($x.d - $dref[$x.k]) / $dref[$x.k] -gt 0.03) { Fel "densitet: $($x.k) $($x.d) mot referens $($dref[$x.k])" }
}
Write-Output "$($sch.Count) schabloner, $($ref.Count) referenser, $($liq.Count) densiteter. Avvikelser: $($script:fel) fel, $($script:varn) varningar"
if ($script:fel) { exit 1 }
