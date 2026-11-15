<#
.SYNOPSIS
  Bygger Hjälp i appen (<template id="help-tpl"> och "help-tpl-en" i index.html) från docs/MANUAL.md och MANUAL.en.md, så att texten bara skrivs en gång.
.DESCRIPTION
  "## Rubrik" -> <details><summary>, "- text" och vanliga rader -> <p>, "![alt](manual/x.png)" -> <img class="shot">.
  **fetstil** tas bort. All text HTML-kodas. Ändrar bara mallen i index.html. Inga nätverksanrop.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\build-help.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object Text.UTF8Encoding $false
# Svenska (MANUAL.md → help-tpl) och engelska (MANUAL.en.md → help-tpl-en), 2026-11-15.
$idxPath = Join-Path $root 'index.html'
$idx = [IO.File]::ReadAllText($idxPath, [Text.Encoding]::UTF8)
$orig = $idx
# Escape only the HTML specials; Swedish letters stay as text (index.html is UTF-8).
$enc = { param($t) (($t -replace '\*\*', '').Trim()).Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;') }
foreach ($l in @(@{ file = 'MANUAL.md'; id = 'help-tpl'; title = 'Hjälp' }, @{ file = 'MANUAL.en.md'; id = 'help-tpl-en'; title = 'Help' })) {
  $md = [IO.File]::ReadAllLines((Join-Path $root ('docs\' + $l.file)), [Text.Encoding]::UTF8)
  $out = New-Object System.Collections.Generic.List[string]
  $out.Add('    <section class="card help">')
  $out.Add("      <h2>$($l.title)</h2>")
  $open = $false
  foreach ($line in $md) {
    if ($line -match '^## (.+)$') {
      if ($open) { $out.Add('      </details>') }
      $out.Add("      <details><summary>$(& $enc $Matches[1])</summary>")
      $open = $true; continue
    }
    if (-not $open -or -not $line.Trim()) { continue }
    if ($line -match '^\s*!\[([^\]]*)\]\((manual/[a-z0-9-]+\.png)\)\s*$') {
      $out.Add("        <img class=`"shot`" src=`"docs/$($Matches[2])`" alt=`"$(& $enc $Matches[1])`" width=`"390`" loading=`"lazy`">"); continue
    }
    $out.Add("        <p>$(& $enc ($line -replace '^\s*-\s+', ''))</p>")
  }
  if ($open) { $out.Add('      </details>') }
  $out.Add('    </section>')
  $re = '(?s)(<template id="' + $l.id + '">\r?\n).*?(\r?\n\s*</template>)'
  if ($idx -notmatch $re) {
    if ($l.id -eq 'help-tpl') { throw 'Hittar inte <template id="help-tpl"> i index.html' }
    $idx = [regex]::Replace($idx, '(?s)(<template id="help-tpl">.*?</template>)', { param($m) $m.Groups[1].Value + "`n  <template id=`"$($l.id)`">`n`n  </template>" }, 'None')
  }
  $idx = [regex]::Replace($idx, $re, { param($m) $m.Groups[1].Value + ($out -join "`n") + $m.Groups[2].Value })
}
if ($idx -ne $orig) { [IO.File]::WriteAllText($idxPath, $idx, $utf8); 'Hjälp uppdaterad från docs/MANUAL.md och MANUAL.en.md' } else { 'Hjälp oförändrad' }
