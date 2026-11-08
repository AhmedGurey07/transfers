$ErrorActionPreference = "Stop"
$workbookPath = if ($env:ORDER_DESK_WORKBOOK_PATH) {
    $env:ORDER_DESK_WORKBOOK_PATH
} else {
    "C:\Users\User\OneDrive\Desktop\Ware house 200 last update 04-07-2026.xlsm"
}
$payloadPath = $env:ORDER_DESK_CATALOG_PAYLOAD
$invariant = [Globalization.CultureInfo]::InvariantCulture

function Convert-CellText {
    param($Value)
    if ($null -eq $Value) { return "" }
    return ([string]$Value).Trim()
}

function Get-HeaderColumn {
    param([object]$Values, [int]$Row, [int]$FirstColumn, [int]$LastColumn, [string[]]$Names, [int]$FallbackOffset)
    for ($column = $FirstColumn; $column -le $LastColumn; $column++) {
        $header = (Convert-CellText $Values[$Row, $column]).ToLowerInvariant() -replace "[^a-z0-9]", ""
        if ($Names -contains $header) { return $column }
    }
    for ($column = $FirstColumn; $column -le $LastColumn; $column++) {
        $header = (Convert-CellText $Values[$Row, $column]).ToLowerInvariant() -replace "[^a-z0-9]", ""
        if ($Names | Where-Object { $header -like "*$_*" }) { return $column }
    }
    $fallback = $FirstColumn + $FallbackOffset
    if ($fallback -le $LastColumn) { return $fallback }
    throw "The SalesData sheet is missing a required column."
}

function First-Value {
    param($Values)
    if ($Values -is [array]) {
        if ($Values.Count -eq 0) { return "" }
        return [string]$Values[0]
    }
    return [string]$Values
}

if (-not (Test-Path -LiteralPath $workbookPath -PathType Leaf)) {
    throw "Warehouse workbook was not found: $workbookPath"
}
if (-not (Test-Path -LiteralPath $payloadPath -PathType Leaf)) {
    throw "Catalog update payload was not found."
}

$payload = Get-Content -LiteralPath $payloadPath -Raw | ConvertFrom-Json
if (-not $payload.products -or $payload.products.Count -eq 0) {
    throw "The catalog update contains no products."
}

$excel = $null
$book = $null
$sheet = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AutomationSecurity = 3
    $book = $excel.Workbooks.Open($workbookPath, 0, $false)
    $sheet = $book.Worksheets.Item("SalesData")
    $used = $sheet.UsedRange
    $values = $used.Value2
    $firstRow = $values.GetLowerBound(0)
    $lastRow = $values.GetUpperBound(0)
    $firstColumn = $values.GetLowerBound(1)
    $lastColumn = $values.GetUpperBound(1)
    $productColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("product", "description", "productdescription") 1
    $quantityColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("quantity", "qty") 2
    $qtyItemColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("qitem", "qtyitem", "quantityitem") 3
    $takenColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("taken") 4
    $rQuantityColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("rquantity", "rqty", "requiredquantity") 5
    $uomNColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("uomn", "uomnumber") 6
    $unitColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("uom", "unit") 7
    $statusColumn = Get-HeaderColumn $values $firstRow $firstColumn $lastColumn @("sts", "status") 8
    $rowsByProduct = @{}
    for ($row = $firstRow + 1; $row -le $lastRow; $row++) {
        $name = Convert-CellText $values[$row, $productColumn]
        if ($name -and -not $rowsByProduct.ContainsKey($name)) { $rowsByProduct[$name] = $row }
    }
    $nextRow = $lastRow + 1
    foreach ($product in $payload.products) {
        $name = Convert-CellText $product.product
        if (-not $name) { continue }
        $row = $rowsByProduct[$name]
        if (-not $row) {
            $row = $nextRow
            $nextRow++
            $sheet.Cells.Item($row, $productColumn).Value2 = $name
            $rowsByProduct[$name] = $row
        }
        $sheet.Cells.Item($row, $productColumn).Value2 = $name
        $sheet.Cells.Item($row, $quantityColumn).Value2 = First-Value $product.quantities
        $sheet.Cells.Item($row, $qtyItemColumn).Value2 = First-Value $product.qtyItems
        $sheet.Cells.Item($row, $takenColumn).Value2 = First-Value $product.taken
        $sheet.Cells.Item($row, $rQuantityColumn).Value2 = First-Value $product.rQuantities
        $sheet.Cells.Item($row, $uomNColumn).Value2 = First-Value $product.uomNs
        $sheet.Cells.Item($row, $unitColumn).Value2 = Convert-CellText $product.unit
        $sheet.Cells.Item($row, $statusColumn).Value2 = First-Value $product.statuses
    }
    $book.Save()
} finally {
    if ($book) { $book.Close($true) }
    if ($excel) { $excel.Quit() }
    foreach ($comObject in @($sheet, $book, $excel)) {
        if ($comObject -and [Runtime.InteropServices.Marshal]::IsComObject($comObject)) {
            [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject)
        }
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
