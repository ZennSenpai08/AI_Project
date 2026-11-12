param([switch]$Offline, [switch]$CpuOnly)
$ErrorActionPreference = 'Stop'
if ($env:OFFLINE_ONLY -eq 'true' -and -not $Offline) { throw 'Offline Only blocks connected setup. Use -Offline to verify installed assets, or explicitly run setup in connected mode.' }
# Explicit, project-local setup. ~660 MB weights plus build tools; no driver/system installation.
$root = Split-Path $PSScriptRoot -Parent
$tools = Join-Path $PSScriptRoot 'tools'
New-Item -ItemType Directory -Force $tools | Out-Null
function Run([string]$Exe, [string[]]$Arguments) { & $Exe @Arguments; if ($LASTEXITCODE -ne 0) { throw "Setup command failed: $Exe ($LASTEXITCODE)" } }
function Download([string]$Url, [string]$Target, [string]$Sha) {
    if (-not (Test-Path -LiteralPath $Target)) {
        if ($Offline) { throw "Missing local setup file: $Target. Run setup explicitly with network access." }
        Invoke-WebRequest -Uri $Url -OutFile $Target
    }
    if ((Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash -ne $Sha) { throw "Checksum mismatch: $Target" }
}
function Source([string]$Url, [string]$Target, [string]$Revision) {
    if (-not (Test-Path -LiteralPath $Target)) {
        if ($Offline) { throw "Missing source: $Target" }
        Run 'git' @('clone','--no-checkout',$Url,$Target)
        Run 'git' @('-C',$Target,'checkout','--detach',$Revision)
    }
    $head = & git -C $Target rev-parse HEAD
    if ($head -ne $Revision) { throw "Unexpected source revision in $Target; preserving existing files." }
}
$python = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
$cmake = Join-Path $PSScriptRoot '.venv/Scripts/cmake.exe'
$ninja = Join-Path $PSScriptRoot '.venv/Scripts/ninja.exe'
if (-not (Test-Path -LiteralPath $python)) { throw 'Create speech/.venv using the STT setup first (see SPEECH_V2.md).' }
if (-not (Test-Path -LiteralPath $cmake)) {
    if ($Offline) { throw 'Missing project-local CMake/Ninja. Install build-requirements.txt during explicit setup.' }
    Run $python @('-m','pip','install','-r',(Join-Path $PSScriptRoot 'build-requirements.txt'))
}
$archive = Join-Path $tools 'w64devkit-x64-2.11.0.7z.exe'
$extract = Join-Path $tools '7zr.exe'
Download 'https://www.7-zip.org/a/7zr.exe' $extract 'E80DB2DAD715A6C5ADABE292D31ED54E11F4E9B99CA349827B50573B175891BC'
Download 'https://github.com/skeeto/w64devkit/releases/download/v2.11.0/w64devkit-x64-2.11.0.7z.exe' $archive '54C2BB9962E8A30C8270E34C5EFC3D5FEE579F53087FA7D435B95FBBA2AF7B2B'
$compiler = Join-Path $tools 'compiler/w64devkit/bin'
if (-not (Test-Path -LiteralPath (Join-Path $compiler 'g++.exe'))) { Run $extract @('x',$archive,"-o$(Join-Path $tools 'compiler')",'-y') }
$env:PATH = $compiler + ';' + $env:PATH
$src = Join-Path $tools 'omnivoice-src'
Source 'https://github.com/ServeurpersoCom/omnivoice.cpp.git' $src 'dbfc792d6fbe0cc3a776817f56de35a3744d7594'
if (-not (Test-Path -LiteralPath (Join-Path $src 'ggml/CMakeLists.txt'))) {
    if ($Offline) { throw 'Missing pinned ggml submodule.' }
    Run 'git' @('-C',$src,'submodule','update','--init','--recursive')
}
if ((& git -C (Join-Path $src 'ggml') rev-parse HEAD) -ne '210138933b22221ced02943b7b6e4308610ab530') { throw 'Unexpected ggml revision.' }
$build = Join-Path $tools $(if ($CpuOnly) {'omnivoice-build'} else {'omnivoice-vulkan'})
$argsCmake = @('-S',$src,'-B',$build,'-G','Ninja',"-DCMAKE_MAKE_PROGRAM=$ninja",'-DCMAKE_C_COMPILER=gcc','-DCMAKE_CXX_COMPILER=g++','-DCMAKE_BUILD_TYPE=Release','-DGGML_CUDA=OFF','-DGGML_BLAS=OFF','-DGGML_CCACHE=OFF','-DBUILD_SHARED_LIBS=OFF')
if ($CpuOnly) { $argsCmake += '-DGGML_VULKAN=OFF' } else {
    $loader = Join-Path $env:WINDIR 'System32/vulkan-1.dll'
    if (-not (Test-Path -LiteralPath $loader)) { throw 'Vulkan driver is unavailable. CPU mode is explicit and much slower.' }
    $shader = Join-Path $tools 'shaderc.zip'
    Download 'https://storage.googleapis.com/shaderc/artifacts/prod/graphics_shader_compiler/shaderc/windows-vs2022-amd64-release/continuous/53/20261028-151553/install.zip' $shader '2D5358873B2726A15ED9AB6FE45143A76913F4D62A8434A6F6A1A471BDFE1270'
    $glslc = Join-Path $tools 'shaderc/install/bin/glslc.exe'
    if (-not (Test-Path -LiteralPath $glslc)) {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [IO.Compression.ZipFile]::OpenRead($shader)
        try { $entry=$zip.GetEntry('install/bin/glslc.exe'); New-Item -ItemType Directory -Force (Split-Path $glslc) | Out-Null; [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$glslc) } finally { $zip.Dispose() }
    }
    $vulkan=Join-Path $tools 'vulkan-headers'; $spirv=Join-Path $tools 'spirv-headers'; $prefix=Join-Path $tools 'vulkan-install'
    Source 'https://github.com/KhronosGroup/Vulkan-Headers.git' $vulkan '88487f687f3100ebe1d3559a8a34d971ee85b977'
    Source 'https://github.com/KhronosGroup/SPIRV-Headers.git' $spirv '6efe5ae6b7c6ad29da3f2cc3f164b9c3d72b78b1'
    Run $cmake @('-S',$spirv,'-B',(Join-Path $tools 'spirv-build'),'-G','Ninja',"-DCMAKE_MAKE_PROGRAM=$ninja","-DCMAKE_INSTALL_PREFIX=$prefix")
    Run $cmake @('--install',(Join-Path $tools 'spirv-build'))
    # Pinned ggml does not propagate the SPIRV include to its runtime target.
    $cmakeFile=Join-Path $src 'CMakeLists.txt'; $content=Get-Content -LiteralPath $cmakeFile -Raw
    if ($content -notmatch 'target_include_directories\(ggml-vulkan SYSTEM PRIVATE') {
        $include=(Join-Path $prefix 'include').Replace('\','/')
        Add-Content -LiteralPath $cmakeFile -Value "`nif(TARGET ggml-vulkan)`n target_include_directories(ggml-vulkan SYSTEM PRIVATE `"$include`")`nendif()"
    }
    $argsCmake += @('-DGGML_VULKAN=ON',"-DVulkan_INCLUDE_DIR=$(Join-Path $vulkan 'include')","-DVulkan_LIBRARY=$loader","-DVulkan_GLSLC_EXECUTABLE=$glslc","-DCMAKE_PREFIX_PATH=$prefix")
}
Run $cmake $argsCmake
Run $cmake @('--build',$build,'--target','omnivoice-tts','omnivoice-codec','--parallel','4')
$models=Join-Path $PSScriptRoot 'models/omnivoice';New-Item -ItemType Directory -Force $models | Out-Null
$base='https://huggingface.co/Serveurperso/OmniVoice-GGUF/resolve/361609388ae572a820d085185bbbe2a2aac4b30e/'
Download ($base+'omnivoice-base-Q4_K_M.gguf') (Join-Path $models 'omnivoice-base-Q4_K_M.gguf') '4836BA5AFFCB83C04D08B3E96B6E48AC839947EE3864188739807B68E0E159C6'
Download ($base+'omnivoice-tokenizer-Q4_K_M.gguf') (Join-Path $models 'omnivoice-tokenizer-Q4_K_M.gguf') '988FC32BC699BCE361C44E9AF8383BE9811960441F293EB5AB4EC6BF6386378D'
Write-Host "Runtime ready: $build/omnivoice-tts.exe. Inspect --list-devices, then explicitly configure NEURAL_TTS_DEVICE and TTS_PROVIDER=omnivoice. No .env or user records changed."
