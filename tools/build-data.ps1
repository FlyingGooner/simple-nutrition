# Bygger kärnlista ur Livsmedelsverkets data + data/varugrupper.csv. Inga nätverksanrop.
# Ut: data/karna.json (varor med varianter), data/kandidater.csv (allt efter filtrering, för granskning i Excel).
param([int]$Exempel = 20)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object Text.UTF8Encoding $false
$db = [IO.File]::ReadAllText("$root\data\indata\livsmedelsverket.json", [Text.Encoding]::UTF8) | ConvertFrom-Json
$all = $db.livsmedel
$byName = @{}; foreach ($x in $all) { $byName[$x.namn.Trim()] = $x }

# 1. Filtrera bort rätter, såser, sötsaker, barnmat
$bort = 'rätt|Sås i|Soppa|Dessert|pizza|Barnmat|Choklad|Bageriprodukter|Godis|Glass|Cerealierätter|Matpaj|Smörgås'
$kand = @($all | Where-Object { $_.grupp -notmatch $bort -and $_.namn -notmatch 'hemlagad|restaurang|smaksatt|m\. socker' })

# 2. Kärnlista från regelfilen
$rader = Import-Csv "$root\data\indata\varugrupper.csv" -Delimiter ';' -Encoding UTF8
$varor = [ordered]@{}; $fel = @()
foreach ($r in $rader) {
  if (-not $varor.Contains($r.vara)) { $varor[$r.vara] = [ordered]@{ vara = $r.vara; sok = @(); varianter = @() } }
  $v = $varor[$r.vara]
  if ($r.sokord) { $v.sok += ($r.sokord -split ',' | ForEach-Object { $_.Trim().ToLower() }) }
  $hit = $null
  if ($r.lmv_namn -like '=*') {
    # Beräknad variant: '=mål-fett|post A|post B' – linjärt mellan A och B efter fetthalt (bara kött/mejeri + fett)
    $pp = $r.lmv_namn.Substring(1) -split '\|'; $mal = [double]($pp[0] -replace ',', '.')
    $a = $byName[$pp[1].Trim()]; $b = if ($pp.Count -gt 2) { $byName[$pp[2].Trim()] } else { $null }
    if ($a -and $pp.Count -eq 2) {
      # En post: fettjustering av samma produkt (9 kcal per g fett)
      $hit = [pscustomobject]@{ id = "b$($a.id)-$mal"; namn = "Fettjusterad: $($a.namn)"; beraknad = $true
        kcal = [math]::Round($a.kcal - ($a.fett - $mal) * 9); prot = $a.prot; kolh = $a.kolh; fett = $mal }
      Write-Host "  = $($r.vara) / $($r.etikett) -> $($hit.kcal) kcal, $($hit.prot) prot, $($hit.fett) fett"
    }
    elseif ($a -and $b) {
      $k = ($mal - $a.fett) / ($b.fett - $a.fett)
      $iv = { param($x, $y) [math]::Round($x + ($y - $x) * $k, 1) }
      $hit = [pscustomobject]@{ id = "b$($a.id)-$($b.id)-$mal"; namn = "Beräknad ur: $($a.namn) + $($b.namn)"; beraknad = $true
        kcal = [math]::Round((& $iv $a.kcal $b.kcal)); prot = (& $iv $a.prot $b.prot); kolh = (& $iv $a.kolh $b.kolh); fett = $mal }
      Write-Host "  = $($r.vara) / $($r.etikett) -> $($hit.kcal) kcal, $($hit.prot) prot, $($hit.fett) fett"
    }
  }
  elseif ($r.lmv_namn -like '~*') { $hit = $all | Where-Object { $_.namn -match $r.lmv_namn.Substring(1) } | Select-Object -First 1 }
  elseif ($r.lmv_namn) { $hit = $byName[$r.lmv_namn.Trim()] }
  if (-not $hit) {
    $q = if ($r.lmv_namn) { ($r.lmv_namn.TrimStart('~^') -split ' ')[0] } else { $r.vara }
    $f = @($kand | Where-Object { $_.namn -like "$q *" } | Select-Object -First 6 | ForEach-Object { $_.namn })
    $fel += "SAKNAS: $($r.vara) / $($r.etikett) -> '$($r.lmv_namn)'. Kandidater: $($f -join ' | ')"
    continue
  }
  if ($r.lmv_namn -like '~*') { Write-Host "  ~ $($r.vara) / $($r.etikett) -> $($hit.namn) ($($hit.kcal))" }
  $v.varianter += [ordered]@{ etikett = $r.etikett; exempel = $r.exempel; id = $hit.id; lmv = $hit.namn; dold = [bool]$r.dold; beraknad = [bool]$hit.beraknad; kcal = $hit.kcal; prot = $hit.prot; kolh = $hit.kolh; fett = $hit.fett }
}
# Mått (styckvikt, dl, msk) – egna uppskattningar, ätlig del. Tom variant = gäller alla varianter.
foreach ($m in (Import-Csv "$root\data\indata\matt.csv" -Delimiter ';' -Encoding UTF8)) {
  $v = $varor[$m.vara]
  if (-not $v) { $fel += "MÅTT: okänd vara '$($m.vara)'"; continue }
  $traff = @($v.varianter | Where-Object { -not $m.variant -or $_.etikett -eq $m.variant })
  if (-not $traff) { $fel += "MÅTT: okänd variant '$($m.vara) / $($m.variant)'"; continue }
  foreach ($x in $traff) { if (-not $x.Contains('matt')) { $x['matt'] = @{ e = $m.enhet; g = [double]$m.gram; d = $m.densitet } } elseif (-not $x.Contains('matt2')) { $x['matt2'] = @{ e = $m.enhet; g = [double]$m.gram } } }
}
$fel | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
$over = @($varor.Values | Where-Object { $_.varianter.Count -gt 5 })
if ($over) { Write-Host "FEL: fler än 5 varianter: $($over.vara -join ', ')" -ForegroundColor Red }

$ut = [ordered]@{ kalla = $db.meta; varor = @($varor.Values) }
[IO.File]::WriteAllText("$root\data\byggt\karna.json", ($ut | ConvertTo-Json -Depth 6), $utf8)

# 3. Kandidater till Excel (fetthalt och tillagning utlästa ur namnet)
$iKarna = @{}; foreach ($v in $varor.Values) { foreach ($x in $v.varianter) { $iKarna[[string]$x.id] = $v.vara } }
$csv = $kand | ForEach-Object {
  $m = [regex]::Match($_.namn, 'fett (ca )?(\d+(,\d+)?)\s?%')
  [pscustomobject]@{
    id = $_.id; namn = $_.namn; grupp = $_.grupp; kcal = $_.kcal; prot = $_.prot; kolh = $_.kolh; fett = $_.fett
    fetthalt = if ($m.Success) { $m.Groups[2].Value } else { '' }
    tillagning = if ($_.namn -match '\b(rå|okokt)\b') { 'rå' } elseif ($_.namn -match 'kokt|stekt|ugnsstekt|grillad|bakad') { 'tillagad' } else { '' }
    i_karna = $iKarna[[string]$_.id]; ta_med = ''; vardagsnamn = ''
  }
}
$csv | Export-Csv "$root\data\byggt\kandidater.csv" -Delimiter ';' -NoTypeInformation -Encoding UTF8

# 4. foods.js för appen: kärna (med varianter) + övriga råvaror (skarpare filter, ej redan i kärnan)
$skarp = 'hemlagad|restaurang|tillagad på|värmd|smaksatt|sötningsm|m\. socker|m\. sås|m\. dressing|Barnmat|konc\. drickf|typ .*(burgare|nugget)'
$bortGrupp = 'Kötträtt|Fisk- och skaldjursrätt|Grönsaksrätt|Potatisrätt|Baljväxträtt|Äggrätt|Soppa|Sås i|Dessert|Matpaj|pizza|Cerealierätter|Bageriprodukter|Choklad|Godis|Glass|Alkohol|Kosttillskott|Barn|Snacks|Sylt|Smörgås|Sallad'
$ovr = @($kand | Where-Object { -not $iKarna.ContainsKey([string]$_.id) -and $_.namn -notmatch $skarp -and $_.grupp -notmatch $bortGrupp })
function Js([string]$s) { '"' + ($s -replace '\\', '\\' -replace '"', '\"') + '"' }
function N($x) { if ($null -eq $x) { 0 } else { ([double]$x).ToString([Globalization.CultureInfo]::InvariantCulture) } }
function Dn([string]$s) { N ([double]::Parse(($s -replace ',', '.'), [Globalization.CultureInfo]::InvariantCulture)) }
$sb = New-Object Text.StringBuilder
[void]$sb.AppendLine("// Genererad av tools/build-data.ps1 – redigera inte. Källa: Livsmedelsverkets livsmedelsdatabas (hämtad $($db.meta.hamtad)). Värden per 100 g: [kcal, protein, kolhydrater, fett].")
[void]$sb.AppendLine("const FOODS_SOURCE = { name: 'Livsmedelsverkets livsmedelsdatabas', fetched: '$($db.meta.hamtad)' };")
[void]$sb.AppendLine('const FOODS_CORE = [')
foreach ($v in $varor.Values) {
  $vs = ($v.varianter | ForEach-Object { "{l:$(Js $_.etikett)$(if ($_.exempel) { ",ex:$(Js $_.exempel)" }),id:$(Js ([string]$_.id)),n:[$(N $_.kcal),$(N $_.prot),$(N $_.kolh),$(N $_.fett)]$(if ($_.beraknad) { ',calc:1' })$(if ($_.dold) { ',hide:1' })$(if ($_.matt2) { ",u2:[$(Js $_.matt2.e),$(N $_.matt2.g)]" })$(if ($_.matt) { ",u:[$(Js $_.matt.e),$(N $_.matt.g)]$(if ($_.matt.d) { ",d:$(Dn $_.matt.d)" })" })}" }) -join ','
  [void]$sb.AppendLine("{name:$(Js $v.vara),q:[$((($v.sok | Select-Object -Unique) | ForEach-Object { Js $_ }) -join ',')],v:[$vs]},")
}
[void]$sb.AppendLine('];')
[void]$sb.AppendLine('const FOODS_MORE = [')
foreach ($x in $ovr) { [void]$sb.AppendLine("[$($x.id),$(Js $x.namn.Trim()),$(N $x.kcal),$(N $x.prot),$(N $x.kolh),$(N $x.fett)],") }
[void]$sb.AppendLine('];')
# Schabloner (Del 2 Steg A): tools/data/schabloner.csv → FOODS_PRODUCTS, en post per namn, val som varianter, ref p:<id>.
# Enhet g (tallriksrätt) visas som portion: g_per_enhet = portionen.
$sch = Import-Csv "$PSScriptRoot\data\schabloner.csv" -Delimiter ';' -Encoding UTF8
[void]$sb.AppendLine('const FOODS_PRODUCTS = [')
foreach ($g in ($sch | Group-Object namn)) {
  $r0 = $g.Group[0]
  $q = @($r0.'sökord' -split ',' | ForEach-Object { $_.Trim().ToLower() } | Where-Object { $_ } | Select-Object -Unique)
  $vs = ($g.Group | ForEach-Object { $e = if ($_.enhet -eq 'g') { 'portion' } else { $_.enhet }
    "{l:$(Js $_.val),id:$(Js $_.id),n:[$(Dn $_.kcal),$(Dn $_.P),$(Dn $_.K),$(Dn $_.F)],u:[$(Js $e),$(Dn $_.g_per_enhet)]$(if ($_.densitet) { ",d:$(Dn $_.densitet)" })}" }) -join ','
  [void]$sb.AppendLine("{name:$(Js $r0.namn),sub:$(Js $r0.undertext),q:[$(($q | ForEach-Object { Js $_ }) -join ',')],v:[$vs]},")
}
[void]$sb.AppendLine('];')
[IO.File]::WriteAllText("$root\data\foods.js", $sb.ToString(), $utf8)
$gr = $ovr | Group-Object grupp | Sort-Object Count -Descending | Select-Object -First 12 | ForEach-Object { "$($_.Name) $($_.Count)" }
Write-Host "foods.js: kärna $($varor.Count) | övriga $($ovr.Count) | $([int]((Get-Item "$root\data\foods.js").Length/1KB)) KB"
Write-Host "Största grupper i övriga: $($gr -join ', ')"

Write-Host "Totalt $($all.Count) | efter filter $($kand.Count) | kärnvaror $($varor.Count) med $(($varor.Values | ForEach-Object { $_.varianter.Count } | Measure-Object -Sum).Sum) varianter | saknas $($fel.Count)"
Write-Host "--- Exempel (per 100 g: kcal / protein / kolh / fett)"
$varor.Values | Where-Object { $_.varianter.Count -gt 0 } | Select-Object -First $Exempel | ForEach-Object {
  $rad = ($_.varianter | ForEach-Object { "$($_.etikett): $([math]::Round($_.kcal)) / $($_.prot) / $($_.kolh) / $($_.fett)" }) -join '  |  '
  Write-Host ("{0,-17} {1}" -f $_.vara, $rad)
}
