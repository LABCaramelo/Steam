$ErrorActionPreference = 'Stop'
$patchManifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') -Raw | ConvertFrom-Json
$claqueteRoot = [IO.Path]::GetFullPath('D:\meus documentos\flick')
if (![StringComparer]::OrdinalIgnoreCase.Equals($claqueteRoot, $patchManifest.sourceRoot)) { throw 'Projeto de destino inesperado.' }
$bundleRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'files'))
$operations = @()
foreach ($file in $patchManifest.files) {
  $targetPath = [IO.Path]::GetFullPath((Join-Path $claqueteRoot $file.path))
  $bundlePath = [IO.Path]::GetFullPath((Join-Path $bundleRoot ($file.path + '.txt')))
  if (!$targetPath.StartsWith($claqueteRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Destino fora do projeto.' }
  if (!$bundlePath.StartsWith($bundleRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Origem fora do pacote.' }
  if ([IO.Path]::GetExtension($targetPath) -notin @('.ts', '.tsx')) { throw 'Tipo de arquivo inesperado.' }
  $bundleHash = (Get-FileHash -LiteralPath $bundlePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($bundleHash -ne $file.patchedSha256) { throw "Pacote alterado: $($file.path)" }
  if (Test-Path -LiteralPath $targetPath) {
    $currentHash = (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($currentHash -eq $file.patchedSha256) { continue }
    if (!$file.baselineSha256 -or $currentHash -ne $file.baselineSha256) { throw "Arquivo mudou durante a revisão: $($file.path)" }
  } elseif ($file.baselineSha256) { throw "Arquivo original ausente: $($file.path)" }
  $operations += [pscustomobject]@{ source = $bundlePath; target = $targetPath }
}
# Só escreve depois de verificar todos os caminhos e hashes. Nenhum arquivo é apagado.
foreach ($operation in $operations) {
  $parentPath = [IO.Path]::GetDirectoryName($operation.target)
  if (!(Test-Path -LiteralPath $parentPath)) { New-Item -ItemType Directory -Path $parentPath | Out-Null }
  Copy-Item -LiteralPath $operation.source -Destination $operation.target -Force
}
Write-Output "Claquete: $($operations.Count) arquivos aplicados com hashes verificados."
