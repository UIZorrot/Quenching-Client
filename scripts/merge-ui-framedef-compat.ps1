param(
    [Parameter(Mandatory = $true)][string]$StagingRoot,
    [Parameter(Mandatory = $true)][string]$UpdatedUiRoot
)

$ErrorActionPreference = 'Stop'

function Get-TopLevelDefinitions {
    param([string]$Path, [string[]]$Names)

    $lines = [System.IO.File]::ReadAllLines($Path)
    $wanted = @{}
    foreach ($name in $Names) { $wanted[$name] = $true }
    $result = New-Object System.Collections.Generic.List[string]
    $i = 0
    while ($i -lt $lines.Length) {
        if ($lines[$i] -match '^\s*(Frame|String|Texture)\s+(?:"[^"]+"\s+)?"([^"]+)"') {
            $name = $Matches[2]
            $start = $i
            $depth = 0
            $seenBrace = $false
            while ($i -lt $lines.Length) {
                $line = $lines[$i]
                $opens = ([regex]::Matches($line, '\{')).Count
                $closes = ([regex]::Matches($line, '\}')).Count
                if ($opens -gt 0) { $seenBrace = $true }
                $depth += $opens - $closes
                $i++
                if ($seenBrace -and $depth -le 0) { break }
            }
            if ($wanted.ContainsKey($name)) {
                if ($result.Count -gt 0) { $result.Add('') }
                for ($j = $start; $j -lt $i; $j++) { $result.Add($lines[$j]) }
            }
            continue
        }
        $i++
    }
    return $result.ToArray()
}

function Append-MissingDefinitions {
    param([string]$CurrentPath, [string]$UpdatedPath, [string[]]$Names)

    $current = [System.IO.File]::ReadAllText($CurrentPath)
    $existing = @{}
    foreach ($m in [regex]::Matches($current, '(?m)^\s*(?:Frame|String|Texture)\s+(?:"[^"]+"\s+)?"([^"]+)"')) {
        $existing[$m.Groups[1].Value] = $true
    }
    $toAppend = @($Names | Where-Object { -not $existing.ContainsKey($_) })
    if ($toAppend.Count -eq 0) { return }

    $blocks = Get-TopLevelDefinitions -Path $UpdatedPath -Names $toAppend
    if ($blocks.Count -eq 0) { throw "No requested definitions found in $UpdatedPath" }
    $text = $current.TrimEnd("`r", "`n") + "`r`n`r`n" + ($blocks -join "`r`n") + "`r`n"
    [System.IO.File]::WriteAllText($CurrentPath, $text, [System.Text.UTF8Encoding]::new($false))
}

$inventoryNames = @(
    'SimpleEquipmentInventoryPanel', 'EquipmentButtonTemplate', 'TitleTextTemplate',
    'SimpleEquipmentPanel', 'EquipmentPanelBackdrop', 'TalentTextTemplate',
    'SimpleTalentsPanel', 'TalentPanelBackdrop'
)
$infoNames = @(
    'SimpleInfoPanelObserverValueTextTemplate', 'SimpleObserverInfoPanelCargoDetail',
    'SimpleObserverInfoPanelBuildingDetail', 'SimpleObserverInfoPanelItemDetail',
    'SimpleObserverInfoPanelIconDamage', 'SimpleObserverInfoPanelIconArmor',
    'SimpleObserverInfoPanelIconFood', 'SimpleObserverInfoPanelIconGold',
    'SimpleObserverInfoPanelIconHero'
)

$targets = @(
    (Join-Path $StagingRoot 'framedef\ui'),
    (Join-Path $StagingRoot 'ui-que\framedef\ui'),
    (Join-Path $StagingRoot 'ui-blz\framedef\ui')
)
foreach ($target in $targets) {
    Append-MissingDefinitions (Join-Path $target 'inventorybar.fdf') (Join-Path $UpdatedUiRoot 'inventorybar.fdf') $inventoryNames
    Append-MissingDefinitions (Join-Path $target 'simpleinfopanel.fdf') (Join-Path $UpdatedUiRoot 'simpleinfopanel.fdf') $infoNames
}
