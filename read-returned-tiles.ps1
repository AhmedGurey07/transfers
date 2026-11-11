$ErrorActionPreference = "Stop"

$workbookPath = $env:ORDER_DESK_RETURNS_WORKBOOK_PATH
if (-not $workbookPath -or -not (Test-Path -LiteralPath $workbookPath -PathType Leaf)) {
  throw "The returned-tiles workbook could not be found."
}

$excel = $null
$workbook = $null
$worksheet = $null
$usedRange = $null

function Get-CellValue($sheet, [int]$row, [int]$column) {
  if (-not $column) { return "" }
  $value = $sheet.Cells.Item($row, $column).Value2
  if ($null -eq $value) { return "" }
  $text = [string]$value
  if ($text.Trim() -match "^(?i)null$") { return "" }
  return $text.Trim()
}

function Get-HeaderColumn($headers, [string[]]$aliases) {
  foreach ($alias in $aliases) {
    $key = $alias.Trim().ToUpperInvariant()
    if ($headers.ContainsKey($key)) { return [int]$headers[$key] }
  }
  return 0
}

function Convert-WorkbookDate([string]$value) {
  if (-not $value) { return "" }
  $number = 0.0
  if ([double]::TryParse($value, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number) -and $number -gt 20000 -and $number -lt 100000) {
    return [DateTime]::FromOADate($number).ToString("yyyy-MM-dd", [Globalization.CultureInfo]::InvariantCulture)
  }
  $match = [regex]::Match($value, "(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})")
  if ($match.Success) {
    try {
      return [DateTime]::new(
        [int]$match.Groups[3].Value,
        [int]$match.Groups[2].Value,
        [int]$match.Groups[1].Value
      ).ToString("yyyy-MM-dd", [Globalization.CultureInfo]::InvariantCulture)
    } catch {
      return $value
    }
  }
  return $value
}

function Convert-WorkbookNumber([string]$value) {
  if (-not $value) { return 0 }
  $number = 0.0
  if ([double]::TryParse($value, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
    return $number
  }
  return 0
}

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.AutomationSecurity = 3
  $workbook = $excel.Workbooks.Open($workbookPath, 0, $true)
  try { $worksheet = $workbook.Worksheets.Item("SalesData") } catch { $worksheet = $workbook.Worksheets.Item(1) }
  $usedRange = $worksheet.UsedRange
  $lastRow = $usedRange.Row + $usedRange.Rows.Count - 1
  $lastColumn = $usedRange.Column + $usedRange.Columns.Count - 1

  $headerRow = 0
  $headers = @{}
  for ($row = $usedRange.Row; $row -le [Math]::Min($lastRow, $usedRange.Row + 20); $row++) {
    $candidate = @{}
    for ($column = $usedRange.Column; $column -le $lastColumn; $column++) {
      $name = [string]$worksheet.Cells.Item($row, $column).Value2
      if ($name.Trim()) { $candidate[$name.Trim().ToUpperInvariant()] = $column }
    }
    if ((Get-HeaderColumn $candidate @("RETURNED FROM")) -and (Get-HeaderColumn $candidate @("NAME OF THE TILE"))) {
      $headerRow = $row
      $headers = $candidate
      break
    }
  }
  if (-not $headerRow) { throw "No returned-tile data table was found. Expected RETURNED FROM and NAME OF THE TILE columns." }

  $columns = @{
    sourceNo = Get-HeaderColumn $headers @("NO")
    returnedFrom = Get-HeaderColumn $headers @("RETURNED FROM")
    product = Get-HeaderColumn $headers @("NAME OF THE TILE")
    branch = Get-HeaderColumn $headers @("BRANCH")
    driver = Get-HeaderColumn $headers @("DRIVER", "DELIVERED DRIVER", "RETURNED DRIVER")
    cartons = Get-HeaderColumn $headers @("CARTOONS", "CARTONS", "CRT")
    firi = Get-HeaderColumn $headers @("FIRI")
    deliveredDate = Get-HeaderColumn $headers @("DELIVERED DATE")
    returnedDate = Get-HeaderColumn $headers @("RETURNED DATE")
    returnedBy = Get-HeaderColumn $headers @("DRIVER RETURNED", "RETURNED BY")
    recordedBy = Get-HeaderColumn $headers @("TRAN.CREATER", "TRAN. CREATER", "TRAN.CREATOR", "TRAN. CREATOR", "CREATED BY")
  }

  $records = [System.Collections.Generic.List[object]]::new()
  for ($row = $headerRow + 1; $row -le $lastRow; $row++) {
    $product = Get-CellValue $worksheet $row $columns.product
    $returnedFrom = Get-CellValue $worksheet $row $columns.returnedFrom
    if (-not $product -or -not $returnedFrom) { continue }
    $sourceNo = Get-CellValue $worksheet $row $columns.sourceNo
    if (-not $sourceNo) { $sourceNo = "row-$row" }
    $records.Add([ordered]@{
      id = "return-legacy-$sourceNo"
      sourceNo = $sourceNo
      returnedFrom = $returnedFrom
      product = $product
      branch = Get-CellValue $worksheet $row $columns.branch
      driver = Get-CellValue $worksheet $row $columns.driver
      cartons = Convert-WorkbookNumber (Get-CellValue $worksheet $row $columns.cartons)
      firi = Convert-WorkbookNumber (Get-CellValue $worksheet $row $columns.firi)
      deliveredDate = Convert-WorkbookDate (Get-CellValue $worksheet $row $columns.deliveredDate)
      returnedDate = Convert-WorkbookDate (Get-CellValue $worksheet $row $columns.returnedDate)
      returnedBy = Get-CellValue $worksheet $row $columns.returnedBy
      recordedBy = Get-CellValue $worksheet $row $columns.recordedBy
      createdAt = 0
      imported = $true
    })
  }

  if ($records.Count -eq 0) { throw "No returned-tile records were found in the worksheet." }
  $recordArray = $records.ToArray()
  ConvertTo-Json -InputObject $recordArray -Depth 4 -Compress
} finally {
  if ($workbook) { $workbook.Close($false) }
  if ($excel) { $excel.Quit() }
  foreach ($object in @($usedRange, $worksheet, $workbook, $excel)) {
    if ($object -and [Runtime.InteropServices.Marshal]::IsComObject($object)) {
      [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($object)
    }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
