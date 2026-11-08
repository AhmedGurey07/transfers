$ErrorActionPreference = "Stop"
$workbookPath = if ($env:ORDER_DESK_WORKBOOK_PATH) {
    $env:ORDER_DESK_WORKBOOK_PATH
} else {
    "C:\Users\User\OneDrive\Desktop\Ware house 200 last update 04-07-2026.xlsm"
}
$calculatorPath = "C:\Users\User\OneDrive\Desktop\AHMED FOLDER\calculator"
$invariant = [Globalization.CultureInfo]::InvariantCulture

function Get-RequiredNumber {
    param([string]$Text, [string]$Name)
    $escapedName = [regex]::Escape($Name)
    $match = [regex]::Match($Text, "(?is)(?:const|let|var)\s+$escapedName\s*=\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)")
    if (-not $match.Success) {
        throw "Could not read '$Name' from the original converter source."
    }
    return [double]::Parse($match.Groups[1].Value, $invariant)
}

function Get-PropertyNumber {
    param([string]$Text, [string]$ObjectName, [string]$PropertyName)
    $objectPattern = "(?is)(?:const|let|var)\s+$([regex]::Escape($ObjectName))\s*=\s*\{(.*?)\}"
    $objectMatch = [regex]::Match($Text, $objectPattern)
    if (-not $objectMatch.Success) {
        throw "Could not read '$ObjectName' from the original converter source."
    }
    $propertyMatch = [regex]::Match($objectMatch.Groups[1].Value, "(?i)\b$([regex]::Escape($PropertyName))\s*:\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)")
    if (-not $propertyMatch.Success) {
        throw "Could not read '$PropertyName' from '$ObjectName'."
    }
    return [double]::Parse($propertyMatch.Groups[1].Value, $invariant)
}

function Get-BlockNumber {
    param([string]$Text, [string]$PropertyName)
    $propertyMatch = [regex]::Match($Text, "(?i)\b$([regex]::Escape($PropertyName))\s*:\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)")
    if (-not $propertyMatch.Success) {
        throw "Could not read '$PropertyName' from the original converter source."
    }
    return [double]::Parse($propertyMatch.Groups[1].Value, $invariant)
}

function Read-TileConverter {
    param([string]$Key, [string]$Label, [string]$FileName, [bool]$UsesWeights = $false, [string]$SourcePath = "")
    $path = if ($SourcePath) { $SourcePath } else { Join-Path $calculatorPath $FileName }
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Converter source file is missing: $path"
    }
    $text = [IO.File]::ReadAllText($path)
    if ($UsesWeights) {
        $falakad = Get-PropertyNumber $text "PRICE_WEIGHTS" "Falakad"
        $cartoon = Get-PropertyNumber $text "PRICE_WEIGHTS" "Cartoon"
        $firi = Get-PropertyNumber $text "PRICE_WEIGHTS" "Firi"
    } else {
        $falakad = Get-RequiredNumber $text "METERS_PER_FALAKAD"
        $cartoon = Get-RequiredNumber $text "METERS_PER_CARTOON"
        $firi = Get-RequiredNumber $text "METERS_PER_FIRI"
    }
    if ($falakad -le 0 -or $cartoon -le 0 -or $firi -le 0) {
        throw "Converter values in '$FileName' must be greater than zero."
    }
    return [ordered]@{
        key = $Key
        label = $Label
        falakad = $falakad
        cartoon = $cartoon
        firi = $firi
    }
}

function Read-GypsumConverter {
    param([string]$Key, [string]$Label, [string]$FileName)
    $path = Join-Path $calculatorPath $FileName
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Converter source file is missing: $path"
    }
    $text = [IO.File]::ReadAllText($path)
    $structuralMatch = [regex]::Match($text, "(?is)(?:const|let|var)\s+structuralFiriPerSqm\s*=\s*\{(.*?)\}")
    if (-not $structuralMatch.Success) {
        throw "Could not read structural conversion values from '$FileName'."
    }
    $structural = @(
        [ordered]@{
            name = "Angle"
            factor = Get-BlockNumber $structuralMatch.Groups[1].Value "angle"
            piecesPerCarton = Get-RequiredNumber $text "FIRI_PER_CARTOON_ANGLE"
        },
        [ordered]@{
            name = "Main Tee"
            factor = Get-BlockNumber $structuralMatch.Groups[1].Value "mainTee"
            piecesPerCarton = Get-RequiredNumber $text "FIRI_PER_CARTOON_MAIN_TEE"
        },
        [ordered]@{
            name = "Bir 120"
            factor = Get-BlockNumber $structuralMatch.Groups[1].Value "bir120"
            piecesPerCarton = Get-RequiredNumber $text "FIRI_PER_CARTOON_BIR_120"
        },
        [ordered]@{
            name = "Bir 60"
            factor = Get-BlockNumber $structuralMatch.Groups[1].Value "bir60"
            piecesPerCarton = Get-RequiredNumber $text "FIRI_PER_CARTOON_BIR_60"
        }
    )
    $cartonArea = Get-RequiredNumber $text "CARTOON_AREA"
    $firiArea = Get-RequiredNumber $text "FIRI_AREA"
    if ($cartonArea -le 0 -or $firiArea -le 0 -or @($structural | Where-Object { $_.factor -lt 0 -or $_.piecesPerCarton -le 0 }).Count -gt 0) {
        throw "Gypsum conversion values in '$FileName' are invalid."
    }
    return [ordered]@{
        key = $Key
        label = $Label
        panelCartonArea = $cartonArea
        firiArea = $firiArea
        structural = $structural
    }
}

function Convert-CellText {
    param($Value)
    if ($null -eq $Value) { return "" }
    if ($Value -is [double] -or $Value -is [decimal] -or $Value -is [int]) {
        return ([double]$Value).ToString("0.###############", $invariant)
    }
    return ([string]$Value).Trim()
}

function Format-CatalogNumber {
    param([string]$Value)
    $number = 0.0
    if ([double]::TryParse($Value, [Globalization.NumberStyles]::Any, $invariant, [ref]$number)) {
        return $number.ToString("0.##", $invariant)
    }
    return $Value
}

function Get-HeaderColumn {
    param([object]$Values, [int]$Row, [int]$FirstColumn, [int]$LastColumn, [string[]]$Names, [int]$FallbackOffset)
    $headers = @{}
    for ($column = $FirstColumn; $column -le $LastColumn; $column++) {
        $header = (Convert-CellText $Values[$Row, $column]).ToLowerInvariant() -replace "[^a-z0-9]", ""
        $headers[$column] = $header
    }
    foreach ($column in $headers.Keys) {
        if ($Names -contains $headers[$column]) {
            return $column
        }
    }
    foreach ($column in $headers.Keys) {
        if ($Names | Where-Object { $headers[$column] -like "*$_*" }) {
            return $column
        }
    }
    $fallback = $FirstColumn + $FallbackOffset
    if ($fallback -le $LastColumn) { return $fallback }
    throw "The SalesData sheet is missing a required column."
}

$excel = $null
$book = $null
$sheet = $null
$used = $null
try {
    if (-not (Test-Path -LiteralPath $workbookPath -PathType Leaf)) {
        throw "Warehouse workbook was not found: $workbookPath"
    }
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AutomationSecurity = 3
    $book = $excel.Workbooks.Open($workbookPath, 0, $true)
    try {
        $sheet = $book.Worksheets.Item("SalesData")
    } catch {
        throw "The warehouse workbook does not contain the expected SalesData sheet."
    }
    $used = $sheet.UsedRange
    $values = $used.Value2
    if ($null -eq $values -or $values.Rank -ne 2) {
        throw "The SalesData sheet does not contain a readable product table."
    }
    $firstRow = $values.GetLowerBound(0)
    $lastRow = $values.GetUpperBound(0)
    $firstColumn = $values.GetLowerBound(1)
    $lastColumn = $values.GetUpperBound(1)
    if ($lastRow -le $firstRow) {
        throw "The SalesData sheet does not contain a product table."
    }
    $productColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("product", "description", "productdescription") 1
    $quantityColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("quantity", "qty") 2
    $qtyItemColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("qitem", "qtyitem", "quantityitem") 3
    $takenColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("taken") 4
    $rQuantityColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("rquantity", "rqty", "requiredquantity") 5
    $uomNColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("uomn", "uomnumber") 6
    $unitColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("uom", "unit") 7
    $statusColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("sts", "status") 8
    $products = [Collections.Generic.List[object]]::new()
    $productIndexes = [Collections.Generic.Dictionary[string,int]]::new([StringComparer]::OrdinalIgnoreCase)
    for ($row = $firstRow + 1; $row -le $lastRow; $row++) {
        $name = Convert-CellText $values[$row, $productColumn]
        if (-not $name) { continue }
        $quantity = Convert-CellText $values[$row, $quantityColumn]
        $unit = Convert-CellText $values[$row, $unitColumn]
        if (-not $unit) { $unit = "PCS" }
        $qtyItem = Convert-CellText $values[$row, $qtyItemColumn]
        $taken = Convert-CellText $values[$row, $takenColumn]
        $rQuantity = Convert-CellText $values[$row, $rQuantityColumn]
        $uomN = Convert-CellText $values[$row, $uomNColumn]
        $status = Convert-CellText $values[$row, $statusColumn]
        $quantity = Format-CatalogNumber $quantity
        $qtyItem = Format-CatalogNumber $qtyItem
        $taken = Format-CatalogNumber $taken
        $rQuantity = Format-CatalogNumber $rQuantity
        $uomN = Format-CatalogNumber $uomN
        $quantityNumber = 0.0
        $takenNumber = 0.0
        $rQuantityNumber = 0.0
        $qtyItemNumber = 0.0
        if (([double]::TryParse($quantity, [Globalization.NumberStyles]::Any, $invariant, [ref]$quantityNumber)) -and
            ([double]::TryParse($taken, [Globalization.NumberStyles]::Any, $invariant, [ref]$takenNumber))) {
            $rQuantity = ($quantityNumber - $takenNumber).ToString("0.##", $invariant)
        }
        if (([double]::TryParse($rQuantity, [Globalization.NumberStyles]::Any, $invariant, [ref]$rQuantityNumber)) -and
            ([double]::TryParse($qtyItem, [Globalization.NumberStyles]::Any, $invariant, [ref]$qtyItemNumber)) -and
            ($qtyItemNumber -ne 0)) {
            $uomN = ($rQuantityNumber / $qtyItemNumber).ToString("0.##", $invariant)
        }
        if (-not $productIndexes.ContainsKey($name)) {
            $entry = [pscustomobject]@{
                product = $name
                unit = $unit
                quantities = [Collections.Generic.List[string]]::new()
                qtyItems = [Collections.Generic.List[string]]::new()
                taken = [Collections.Generic.List[string]]::new()
                rQuantities = [Collections.Generic.List[string]]::new()
                uomNs = [Collections.Generic.List[string]]::new()
                statuses = [Collections.Generic.List[string]]::new()
            }
            $productIndexes.Add($name, $products.Count)
            $products.Add($entry)
        }
        $entry = $products[$productIndexes[$name]]
        if ($entry.unit -eq "PCS" -and $unit -ne "PCS") { $entry.unit = $unit }
        if ($quantity -and -not $entry.quantities.Contains($quantity)) { $entry.quantities.Add($quantity) }
        if ($qtyItem -and -not $entry.qtyItems.Contains($qtyItem)) { $entry.qtyItems.Add($qtyItem) }
        if ($taken -and -not $entry.taken.Contains($taken)) { $entry.taken.Add($taken) }
        if ($rQuantity -and -not $entry.rQuantities.Contains($rQuantity)) { $entry.rQuantities.Add($rQuantity) }
        if ($uomN -and -not $entry.uomNs.Contains($uomN)) { $entry.uomNs.Add($uomN) }
        if ($status -and -not $entry.statuses.Contains($status)) { $entry.statuses.Add($status) }
    }
    if ($products.Count -eq 0) {
        throw "No products were found in the SalesData sheet."
    }
    $productData = @($products | ForEach-Object {
        [ordered]@{
            productBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_.product))
            unitBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_.unit))
            quantitiesBase64 = @($_.quantities.ToArray() | ForEach-Object { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_)) })
            qtyItemsBase64 = @($_.qtyItems.ToArray() | ForEach-Object {
                [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_))
            })
            takenBase64 = @($_.taken.ToArray() | ForEach-Object { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_)) })
            rQuantitiesBase64 = @($_.rQuantities.ToArray() | ForEach-Object {
                [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_))
            })
            uomNsBase64 = @($_.uomNs.ToArray() | ForEach-Object {
                [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_))
            })
            statusesBase64 = @($_.statuses.ToArray() | ForEach-Object { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_)) })
        }
    })
} finally {
    if ($book) { $book.Close($false) }
    if ($excel) { $excel.Quit() }
    foreach ($comObject in @($used, $sheet, $book, $excel)) {
        if ($comObject -and [Runtime.InteropServices.Marshal]::IsComObject($comObject)) {
            [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject)
        }
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

$tileDefinitions = @(
    @{ key = "tile-40-normal"; label = "40x40 Normal"; file = "40x40.html"; weights = $true },
    @{ key = "tile-40-outdoor"; label = "40x40 Outdoor"; file = "40x40outdoor.html" },
    @{ key = "tile-40-new"; label = "40x40 New"; file = "40x40 new.html"; weights = $true },
    @{ key = "tile-30-30"; label = "30x30"; file = "30x30.html" },
    @{ key = "tile-30-45"; label = "30x45 Normal"; file = "30X45.html" },
    @{ key = "tile-30-45-88"; label = "30x45 88 CRT"; file = "30X4588crt.html" },
    @{ key = "tile-30-60-marble"; label = "30x60 Marble"; file = "30X60marmardhagax.html" },
    @{ key = "tile-30-60-other"; label = "30x60 Other"; file = "30X60others.html" },
    @{ key = "tile-60-60-porcelain"; label = "60x60 Porcelain"; file = "60x60.html" },
    @{ key = "tile-60-60-46-crt"; label = "60x60 Porcelain 46 CRT"; file = "60x6046crt.html"; sourcePath = "C:\Users\User\OneDrive\Desktop\lessons\calculator\60x6046crt.html" },
    @{ key = "tile-60-60-ceramic"; label = "60x60 Ceramic"; file = "60X60ceramic.html" },
    @{ key = "tile-60-60-thick"; label = "60x60 High thickness"; file = "60X60highthickness.html" },
    @{ key = "tile-60-60-outdoor"; label = "60x60 Outdoor"; file = "60x60outdoor.html" },
    @{ key = "tile-60-120-large"; label = "60x120 Large"; file = "60x120large.html" },
    @{ key = "tile-60-120-small"; label = "60x120 Small"; file = "60X120small.html" },
    @{ key = "tile-20-120"; label = "20x120"; file = "20X120.html" },
    @{ key = "tile-37-25"; label = "37x25"; file = "37x25.html" }
)
$converterData = [ordered]@{}
foreach ($definition in $tileDefinitions) {
    $converter = Read-TileConverter $definition.key $definition.label $definition.file ([bool]$definition.weights) $definition.sourcePath
    $converterData[$converter.key] = [ordered]@{
        label = $converter.label
        falakad = $converter.falakad
        cartoon = $converter.cartoon
        firi = $converter.firi
    }
}
$gypsumData = [ordered]@{}
$gypsumData["gypsum-caag"] = Read-GypsumConverter "gypsum-caag" "Gypsum Caag" "gypsumcaag.html"
$gypsumData["gypsum-saafi"] = Read-GypsumConverter "gypsum-saafi" "Gypsum Saafi" "gypsumsaafi.html"

$payload = [ordered]@{
    products = $productData
    converters = $converterData
    gypsumConverters = $gypsumData
}
Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = 16777216
[Console]::Write($serializer.Serialize($payload))
